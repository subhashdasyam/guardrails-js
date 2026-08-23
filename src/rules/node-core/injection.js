// Injection rules. OWASP A05:2025.

import {
  calleeEndsWith,
  calleeMatches,
  memberName,
  lastSegment,
  isLiteral,
  isBuiltString,
  staticString,
  objectValue,
  isTrue,
  fileLooksLikeMigration,
} from '../helpers.js';

const QUERY_METHODS = ['query', 'execute'];
const RAW_METHODS = ['raw', 'unprepared'];

export const SQL_01 = {
  id: 'SQL-01',
  title: 'SQL built from user input',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-89'],
  api: 'API8',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(query|execute)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, QUERY_METHODS)) return null;

    const first = node.arguments[0];
    if (!first || isLiteral(first)) return null;
    if (!ctx.isTainted(first)) return null;

    // A tagged template through prisma.$queryRaw is already parameterised.
    if (first.type === 'TaggedTemplateExpression') return null;

    return { node: first, source: ctx.describe(first) };
  },
  message: (f) =>
    `SQL string is built from ${f.source}. A value like "' OR 1=1 --" changes the query.`,
  fix: "pool.query('SELECT * FROM users WHERE id = $1', [req.query.id])",
};

export const SQL_02 = {
  id: 'SQL-02',
  title: 'ORM raw query built from user input',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-89'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(raw|unprepared)\s*\(|sequelize\.query|dataSource\.query/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (fileLooksLikeMigration(ctx.filePath)) return null;

    const full = memberName(node.callee);
    const isRaw = calleeEndsWith(node, RAW_METHODS);
    const isOrmQuery = full === 'sequelize.query' || full === 'dataSource.query';
    if (!isRaw && !isOrmQuery) return null;

    const first = node.arguments[0];
    if (!first || isLiteral(first)) return null;
    if (first.type === 'TaggedTemplateExpression') return null;
    if (!ctx.isTainted(first)) return null;

    return { node: first, source: ctx.describe(first) };
  },
  message: (f) =>
    `Raw ORM query is built from ${f.source}. The ORM does not escape anything you hand it as a string.`,
  fix: "knex('users').where({ id: req.query.id })  // or sequelize.query(sql, { replacements: { id } })",
};

export const SQL_03 = {
  id: 'SQL-03',
  title: 'Prisma unsafe raw query',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-89'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\$(query|execute)RawUnsafe/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, ['$queryRawUnsafe', '$executeRawUnsafe'])) return null;
    const first = node.arguments[0];
    if (!first || isLiteral(first)) return null;
    return { node: first, source: ctx.isTainted(first) ? ctx.describe(first) : 'a built string' };
  },
  message: (f) =>
    `$queryRawUnsafe takes ${f.source}. The Unsafe suffix is the warning: nothing is escaped.`,
  fix: 'prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`  // tagged template binds the value',
};

const MONGO_READ_METHODS = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'countDocuments',
  'aggregate',
  'distinct',
];

function taintedFilterShape(node, ctx) {
  const first = node.arguments[0];
  if (!first) return null;

  // find(req.body.filter) hands the whole client object to the driver.
  if (
    (first.type === 'Identifier' ||
      first.type === 'MemberExpression' ||
      first.type === 'OptionalMemberExpression') &&
    ctx.isTainted(first)
  ) {
    return { node: first, direct: true };
  }

  // find({ name: req.body.name }) still lets { "$ne": null } through.
  if (first.type === 'ObjectExpression') {
    for (const prop of first.properties) {
      if (prop.type === 'SpreadElement') {
        if (ctx.isTainted(prop.argument)) return { node: prop.argument, direct: true };
        continue;
      }
      const value = prop.value;
      if (!value || !ctx.isTainted(value)) continue;
      // String(req.body.name) forces a scalar, which is the fix.
      if (
        (value.type === 'CallExpression' || value.type === 'OptionalCallExpression') &&
        ['String', 'Number', 'Boolean', 'ObjectId'].includes(lastSegment(memberName(value.callee)))
      ) {
        continue;
      }
      return { node: value, direct: false };
    }
  }

  return null;
}

export const NOSQL_01 = {
  id: 'NOSQL-01',
  title: 'Mongo query takes raw user input',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-943'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(find|findOne|updateOne|updateMany|deleteOne|deleteMany|aggregate|distinct|countDocuments|findOneAndUpdate|findOneAndDelete|findOneAndReplace)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, MONGO_READ_METHODS)) return null;

    const shape = taintedFilterShape(node, ctx);
    if (!shape) return null;

    return {
      node: shape.node,
      source: ctx.describe(shape.node),
      severityHint: shape.direct ? 'high' : 'medium',
    };
  },
  message: (f) =>
    `Mongo filter is built from ${f.source} without forcing a scalar. Posting {"$ne": null} makes the filter match every row.`,
  fix: "User.findOne({ email: String(req.body.email) })  // or validate with a schema first",
};

const SERVER_SIDE_JS_OPERATORS = ['$where', '$expr', '$function', '$accumulator'];

export const NOSQL_02 = {
  id: 'NOSQL-02',
  title: 'Mongo server side JavaScript with user input',
  severity: 'critical',
  owasp2025: 'A05',
  cwe: ['CWE-943', 'CWE-94'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\$where|\$expr|\$function|\$accumulator/,
  nodeTypes: ['ObjectExpression'],
  match(node, ctx) {
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') continue;
      const key = prop.key?.name ?? prop.key?.value;
      if (!SERVER_SIDE_JS_OPERATORS.includes(key)) continue;
      if (!ctx.isTainted(prop.value)) continue;
      return { node: prop, source: ctx.describe(prop.value), operator: key };
    }
    return null;
  },
  message: (f) =>
    `${f.operator} runs JavaScript inside the database and it is built from ${f.source}.`,
  fix: 'Use normal query operators. Never let a client supply $where, $expr, or $function.',
};

const SHELL_CALLS = ['exec', 'execSync'];

export const CMD_01 = {
  id: 'CMD-01',
  title: 'Shell command built from user input',
  severity: 'critical',
  owasp2025: 'A05',
  cwe: ['CWE-78'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\bexec(Sync)?\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!SHELL_CALLS.includes(lastSegment(full))) return null;
    // execFile is the safe one and ends with "File", so lastSegment already
    // rules it out. Guard against unrelated user helpers called exec.
    if (full.includes('.') && !/child_process|cp|childProcess|shelljs|exec/i.test(full)) {
      // still allow bare `exec(...)` from a destructured import
    }

    const first = node.arguments[0];
    if (!first) return null;

    if (ctx.isTainted(first)) {
      return { node: first, source: ctx.describe(first), severityHint: 'critical' };
    }
    if (isBuiltString(first)) {
      return { node: first, source: 'a built string', severityHint: 'high' };
    }
    return null;
  },
  message: (f) =>
    `Shell command comes from ${f.source}. exec runs it through /bin/sh, so a semicolon is a second command.`,
  fix: "execFile('/usr/bin/convert', [validatedName], { shell: false })",
};

export const CMD_02 = {
  id: 'CMD-02',
  title: 'Process spawned through a shell',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-78', 'CWE-77'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\bspawn(Sync)?\s*\(|\bexecFile(Sync)?\s*\(|shell\s*:\s*true/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, ['spawn', 'spawnSync', 'execFile', 'execFileSync'])) return null;

    for (const arg of node.arguments) {
      if (arg.type !== 'ObjectExpression') continue;
      const shell = objectValue(arg, 'shell');
      if (isTrue(shell) || (shell && staticString(shell))) {
        return { node: arg, source: 'shell: true', severityHint: 'high' };
      }
    }

    // spawn('sh', ['-c', something])
    const first = staticString(node.arguments[0]);
    if (first && ['sh', 'bash', 'zsh', '/bin/sh', '/bin/bash', 'cmd', 'cmd.exe'].includes(first)) {
      const second = node.arguments[1];
      if (second?.type === 'ArrayExpression' && ctx.isTainted(second)) {
        return { node: second, source: ctx.describe(second), severityHint: 'critical' };
      }
      return { node: node.arguments[0], source: `a ${first} wrapper`, severityHint: 'medium' };
    }

    // The executable name itself coming from a request is worse than the args.
    if (node.arguments[0] && ctx.isTainted(node.arguments[0])) {
      return { node: node.arguments[0], source: ctx.describe(node.arguments[0]), severityHint: 'critical' };
    }

    return null;
  },
  message: (f) =>
    `Process is spawned with ${f.source}, which puts a shell back in the path and undoes the point of spawn.`,
  fix: "spawn('/usr/bin/tool', [arg1, arg2], { shell: false })",
};

const PATH_SINKS = [
  'readFile',
  'readFileSync',
  'createReadStream',
  'createWriteStream',
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'unlink',
  'unlinkSync',
  'rm',
  'rmSync',
  'readdir',
  'readdirSync',
  'stat',
  'statSync',
  'sendFile',
  'download',
  'open',
  'openSync',
  'copyFile',
  'rename',
];

const CONTAINMENT_GUARDS = [
  /\.startsWith$/,
  /^path\.relative$/,
  /\.relative$/,
  /^path\.normalize$/,
  /\bisPathInside$/i,
  /\bassertInside$/i,
  /\bsafeJoin$/i,
  /\bresolveWithin$/i,
];

export const PATH_01 = {
  id: 'PATH-01',
  title: 'File path built from user input',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-22'],
  api: 'API1',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\b(readFile|writeFile|createReadStream|createWriteStream|sendFile|download|unlink|readdir|appendFile|copyFile|rename|open)(Sync)?\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, PATH_SINKS)) return null;

    const first = node.arguments[0];
    if (!first || !ctx.isTainted(first)) return null;

    // A containment check anywhere in the same function means somebody thought
    // about it. Do not shout twice.
    if (ctx.hasGuardInScope(node, CONTAINMENT_GUARDS)) return null;

    return { node: first, source: ctx.describe(first) };
  },
  message: (f) =>
    `File path comes from ${f.source} with no containment check. A value of ../../etc/passwd escapes the directory.`,
  fix: "const target = path.resolve(root, name);\nif (!target.startsWith(root + path.sep)) throw new Error('bad path');",
};

const TEMPLATE_RENDERERS = ['render', 'renderString', 'compile', 'template', 'renderFile'];

export const SSTI_01 = {
  id: 'SSTI-01',
  title: 'Template compiled from user input',
  severity: 'critical',
  owasp2025: 'A05',
  cwe: ['CWE-1336', 'CWE-94'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(render|renderString|compile|template|renderFile)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!TEMPLATE_RENDERERS.includes(lastSegment(full))) return null;

    // res.render('view', data) is fine. Only the template argument matters.
    const first = node.arguments[0];
    if (!first || !ctx.isTainted(first)) return null;

    // res.render takes a view name, not template source. Different risk.
    if (/^res\./.test(full) && lastSegment(full) === 'render') return null;

    return { node: first, source: ctx.describe(first) };
  },
  message: (f) =>
    `Template source comes from ${f.source}. Template engines can reach the process object, so this is remote code execution.`,
  fix: 'Keep templates in your repo. Pick one with an enum and pass user data as values only.',
};

const HEADER_SINKS = ['setHeader', 'set', 'writeHead', 'header', 'append'];

export const HTTP_01 = {
  id: 'HTTP-01',
  title: 'Response header or redirect from user input',
  severity: 'medium',
  owasp2025: 'A05',
  cwe: ['CWE-113', 'CWE-601'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(setHeader|writeHead|redirect|header|append)\s*\(|\bres\.set\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);

    if (method === 'redirect') {
      const target = node.arguments.find((arg) => ctx.isTainted(arg));
      if (!target) return null;
      if (ctx.hasGuardInScope(node, [/\bisAllowedRedirect$/i, /\bsafeRedirect$/i])) return null;
      return {
        node: target,
        source: ctx.describe(target),
        kind: 'redirect',
        severityHint: 'medium',
      };
    }

    if (!HEADER_SINKS.includes(method)) return null;
    if (method === 'set' && !/^(res|reply|response)\./.test(full)) return null;

    const value = node.arguments[1] ?? node.arguments[0];
    if (!value || !ctx.isTainted(value)) return null;

    return { node: value, source: ctx.describe(value), kind: 'header', severityHint: 'medium' };
  },
  message: (f) =>
    f.kind === 'redirect'
      ? `Redirect target comes from ${f.source}. Anyone can send your users to their own site with a link that looks like yours.`
      : `Response header value comes from ${f.source}. A carriage return in that value splits the response.`,
  fix: "const next = new URL(req.query.next, base);\nif (next.origin !== base.origin) return res.redirect('/');",
};

export default [
  SQL_01,
  SQL_02,
  SQL_03,
  NOSQL_01,
  NOSQL_02,
  CMD_01,
  CMD_02,
  PATH_01,
  SSTI_01,
  HTTP_01,
];
