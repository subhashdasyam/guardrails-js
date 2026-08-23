// Taint tracking.
//
// This is intra-file and deliberately simple. It answers one question well:
// "can attacker controlled data reach this expression?" It over-approximates
// across function boundaries inside a file, which costs a few false positives
// on medium rules and almost none on the high ones, because the high rules also
// require a dangerous sink.

import { walk, memberName, lastSegment } from './walk.js';

// Roots that are attacker controlled the moment you touch them.
const TAINT_ROOTS = [
  // Express, Koa, Fastify, Nest
  /^req(uest)?\.(body|query|params|headers|cookies|url|originalUrl|path|hostname|ip)\b/,
  /^ctx\.(request|req)\.(body|query|params|headers|url)\b/,
  /^ctx\.(query|params|headers|request)\b/,
  /^request\.(body|query|params|headers|url)\b/,
  // Browser
  /^(window\.)?location\.(search|hash|href|pathname|host|hostname)\b/,
  /^document\.(URL|documentURI|referrer|cookie|baseURI)\b/,
  /^window\.name\b/,
  // Messages and storage
  /^(event|e|msg|message)\.data\b/,
  /^localStorage\.getItem\b/,
  /^sessionStorage\.getItem\b/,
  // Process and environment when used as input
  /^process\.argv\b/,
];

// GraphQL and tRPC hand you the client payload through a parameter. Matching on
// the parameter, not on the name wherever it appears, matters: `input` and
// `args` are ordinary variable names and treating every one of them as hostile
// produced false positives on validated code.
const TAINTED_PARAM_NAMES = new Set(['input', 'args', 'variables', 'rawInput']);

const TAINTED_DESTRUCTURED_KEYS = [
  'body',
  'query',
  'params',
  'headers',
  'cookies',
  'input',
  'args',
  'variables',
  'searchParams',
];

// Calls that hand back attacker controlled data.
const TAINT_CALLS = new Set([
  'req.param',
  'req.get',
  'req.header',
  'ctx.get',
  'searchParams.get',
  'url.searchParams.get',
  'formData.get',
  'params.get',
  'headers.get',
  'cookies.get',
  'request.formData',
  'request.json',
  'request.text',
  'req.json',
  'req.text',
]);

// Calls whose output we treat as clean no matter what went in.
const SANITIZERS = [
  /^DOMPurify\.sanitize$/,
  /^(dompurify|purify)\.sanitize$/i,
  /\bsanitize(Html|Url|Input)?$/i,
  /\bescape(Html|Sql|Shell|RegExp|Identifier)$/i,
  /^validator\.(escape|whitelist|blacklist)$/,
  /^encodeURIComponent$/,
  /^sqlstring\.escape(Id)?$/i,
  /^mysql\.escape(Id)?$/i,
  /\.escapeIdentifier$/,
  /^z\.[A-Za-z]+\(\)?.*\.parse$/,
];

// Schema validators. A value that came out of one of these has a known shape,
// which kills operator injection and mass assignment findings.
const VALIDATOR_CALLS = [
  /\.safeParse$/,
  /^z\..*\.parse$/,
  // MyThingSchema.parse(...), userSchema.parse(...), schema.parse(...)
  /(^|\.)[A-Za-z0-9_$]*[Ss]chema\.parse$/,
  /(^|\.)[A-Za-z0-9_$]*[Vv]alidator\.(parse|validate)$/,
  /(^|\.)[Ss]chema\.validate$/,
  /^joi\..*\.validate$/i,
  /^yup\..*\.(validate|cast)$/i,
  /^ajv\.validate$/,
  /\.validateSync$/,
  /(^|\.)validate(Body|Input|Payload|Request)$/,
];

function matchesAny(patterns, value) {
  if (!value) return false;
  return patterns.some((re) => re.test(value));
}

function isTaintRootName(name) {
  if (!name) return false;
  return TAINT_ROOTS.some((re) => re.test(name));
}

/**
 * Collect every local name that holds attacker controlled data.
 *
 * One pass, repeated until nothing new shows up, so `const a = req.body; const
 * b = a.x; const c = b;` marks all three.
 */
export function collectTaintedNames(ast) {
  const tainted = new Set();
  const clean = new Set();

  const bind = (idNode, valueNode) => {
    if (!idNode) return;

    if (idNode.type === 'Identifier') {
      if (isTaintedExpr(valueNode, tainted, clean)) tainted.add(idNode.name);
      return;
    }

    // const { id, name } = req.query
    if (idNode.type === 'ObjectPattern') {
      const sourceTainted = isTaintedExpr(valueNode, tainted, clean);
      for (const prop of idNode.properties) {
        if (prop.type === 'RestElement') {
          if (sourceTainted && prop.argument?.type === 'Identifier') tainted.add(prop.argument.name);
          continue;
        }
        const target = prop.value ?? prop.key;
        if (sourceTainted && target?.type === 'Identifier') tainted.add(target.name);
        else if (target?.type === 'ObjectPattern' || target?.type === 'ArrayPattern') {
          if (sourceTainted) markPatternTainted(target, tainted);
        }
      }
      return;
    }

    if (idNode.type === 'ArrayPattern') {
      if (isTaintedExpr(valueNode, tainted, clean)) markPatternTainted(idNode, tainted);
    }
  };

  // Repeat until the set stops growing. Two or three rounds in practice.
  for (let round = 0; round < 4; round += 1) {
    const before = tainted.size;

    walk(ast, (node) => {
      if (node.type === 'VariableDeclarator') {
        // A value that went through a schema validator is clean from here on.
        if (node.init && isValidated(node.init) && node.id.type === 'Identifier') {
          clean.add(node.id.name);
          return;
        }
        bind(node.id, node.init);
        return;
      }

      if (node.type === 'AssignmentExpression') {
        if (node.left.type === 'Identifier' && isTaintedExpr(node.right, tainted, clean)) {
          tainted.add(node.left.name);
        }
        return;
      }

      // app.get('/x', (req, res) => ...) keeps the parameter names we expect,
      // so nothing extra is needed. But async handlers that destructure in the
      // signature do need help: ({ body }) => ...
      if (
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression'
      ) {
        for (const param of node.params) {
          // (parent, args, ctx) in a GraphQL resolver, ({ input }) in tRPC
          if (param.type === 'Identifier' && TAINTED_PARAM_NAMES.has(param.name)) {
            tainted.add(param.name);
            continue;
          }

          if (param.type !== 'ObjectPattern') continue;
          for (const prop of param.properties) {
            const key = prop.key?.name;
            if (!key) continue;
            if (TAINTED_DESTRUCTURED_KEYS.includes(key)) {
              const target = prop.value ?? prop.key;
              if (target.type === 'Identifier') tainted.add(target.name);
            }
          }
        }
      }
    });

    if (tainted.size === before) break;
  }

  for (const name of clean) tainted.delete(name);
  return tainted;
}

function markPatternTainted(pattern, tainted) {
  walk(pattern, (node) => {
    if (node.type === 'Identifier') tainted.add(node.name);
  });
}

function isValidated(node) {
  if (!node) return false;
  const target = node.type === 'AwaitExpression' ? node.argument : node;
  if (target.type !== 'CallExpression' && target.type !== 'OptionalCallExpression') return false;
  const name = memberName(target.callee);
  return matchesAny(VALIDATOR_CALLS, name);
}

/**
 * Can attacker controlled data reach this expression?
 */
export function isTaintedExpr(node, tainted, clean = new Set()) {
  if (!node) return false;

  switch (node.type) {
    case 'Identifier':
      if (clean.has(node.name)) return false;
      return tainted.has(node.name);

    case 'OptionalMemberExpression':
    case 'MemberExpression': {
      const name = memberName(node);
      // A value that went through a schema validator wins over everything else.
      if (name && clean.has(name.split('.')[0])) return false;
      if (isTaintRootName(name)) return true;
      // req.body.user.email -> walk down to req.body
      if (isTaintedExpr(node.object, tainted, clean)) return true;

      // SORT_COLUMNS[req.query.sort] is the allowlist pattern we recommend for
      // things that cannot be bound as parameters, such as a column name. The
      // key is attacker controlled but the value comes from the map, so the
      // result is not. When the object itself is tainted the line above already
      // caught it.
      return false;
    }

    case 'OptionalCallExpression':
    case 'CallExpression': {
      const name = memberName(node.callee);
      if (matchesAny(SANITIZERS, name)) return false;
      if (matchesAny(VALIDATOR_CALLS, name)) return false;
      if (name && TAINT_CALLS.has(name)) return true;
      if (name && isTaintRootName(name)) return true;
      // Data keeps its taint through String(x), x.trim(), x.replace(), etc.
      if (isTaintedExpr(node.callee, tainted, clean)) return true;
      return node.arguments.some((arg) => isTaintedExpr(arg, tainted, clean));
    }

    case 'TemplateLiteral':
      return node.expressions.some((expr) => isTaintedExpr(expr, tainted, clean));

    case 'TaggedTemplateExpression':
      return isTaintedExpr(node.quasi, tainted, clean);

    case 'BinaryExpression':
      if (node.operator !== '+') return false;
      return (
        isTaintedExpr(node.left, tainted, clean) || isTaintedExpr(node.right, tainted, clean)
      );

    case 'LogicalExpression':
      return (
        isTaintedExpr(node.left, tainted, clean) || isTaintedExpr(node.right, tainted, clean)
      );

    case 'ConditionalExpression':
      return (
        isTaintedExpr(node.consequent, tainted, clean) ||
        isTaintedExpr(node.alternate, tainted, clean)
      );

    case 'AwaitExpression':
    case 'UnaryExpression':
    case 'SpreadElement':
      return isTaintedExpr(node.argument, tainted, clean);

    case 'TSAsExpression':
    case 'TSNonNullExpression':
    case 'TypeCastExpression':
      return isTaintedExpr(node.expression, tainted, clean);

    case 'ObjectExpression':
      return node.properties.some((prop) => {
        if (prop.type === 'SpreadElement') return isTaintedExpr(prop.argument, tainted, clean);
        return isTaintedExpr(prop.value, tainted, clean);
      });

    case 'ArrayExpression':
      return node.elements.some((el) => isTaintedExpr(el, tainted, clean));

    case 'SequenceExpression':
      return node.expressions.some((expr) => isTaintedExpr(expr, tainted, clean));

    default:
      return false;
  }
}

/**
 * Describe where the taint came from, for the finding message. Best effort.
 */
export function describeSource(node, tainted) {
  let label = null;

  walk(node, (child) => {
    if (label) return false;
    if (child.type === 'MemberExpression' || child.type === 'OptionalMemberExpression') {
      const name = memberName(child);
      if (isTaintRootName(name)) {
        label = name;
        return false;
      }
    }
    if (child.type === 'Identifier' && tainted.has(child.name)) {
      label = child.name;
    }
    return undefined;
  });

  return label ?? 'user input';
}

export { isTaintRootName, matchesAny, SANITIZERS, VALIDATOR_CALLS };

/**
 * Look for a guard inside `scopeNode` that protects `sinkNode`. This is a
 * "does the file show any sign of doing the right thing" check, not real
 * dominance analysis. Rules that use it ship at medium severity for that
 * reason.
 */
export function hasGuard(scopeNode, patterns) {
  let found = false;

  walk(scopeNode, (node) => {
    if (found) return false;
    if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return undefined;
    const name = memberName(node.callee);
    if (name && patterns.some((re) => re.test(name))) found = true;
    return undefined;
  });

  return found;
}
