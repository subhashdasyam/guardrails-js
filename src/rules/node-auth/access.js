// Access control. OWASP A01:2025, the largest category in the 2025 list.
//
// These rules need to reason across functions to be certain, and they cannot,
// so they all ship at medium and stay on the quiet channel. They are prompts to
// look, not accusations.

import { memberName, lastSegment, staticString, objectValue } from '../helpers.js';

const LOOKUP_METHODS = [
  'findById',
  'findByPk',
  'findUnique',
  'findFirst',
  'findOne',
  'getById',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'findByIdAndDelete',
];

const OWNERSHIP_KEYS =
  /(user|owner|org|orgId|tenant|account|team|customer|workspace|company|member)/i;

const CURRENT_USER = /(req|request|ctx|context|session)\.(user|auth|session|principal)|currentUser|getUser|session\.userId/;

export const IDOR_01 = {
  id: 'IDOR-01',
  title: 'Record fetched by id with no ownership check',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-639', 'CWE-863'],
  api: 'API1',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(findById|findByPk|findUnique|findFirst|findOne|getById|findByIdAndUpdate|findByIdAndDelete|findOneAndUpdate)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!LOOKUP_METHODS.includes(lastSegment(full))) return null;

    const first = node.arguments[0];
    if (!first || !ctx.isTainted(first)) return null;

    // Anything in the call that names the current user or an owning entity
    // counts as somebody having thought about it.
    const callSource = ctx.source.slice(node.start, node.end);
    if (OWNERSHIP_KEYS.test(callSource)) return null;
    if (CURRENT_USER.test(callSource)) return null;

    return { node: first, source: ctx.describe(first), model: full.split('.')[0] };
  },
  message: (f) =>
    `${f.model} is looked up by an id from ${f.source} with nothing tying it to the caller. Changing the id in the request returns somebody else's record.`,
  fix: 'const invoice = await Invoice.findOne({ where: { id: req.params.id, orgId: req.user.orgId } });',
};

const ASSIGN_SINKS = ['create', 'update', 'updateOne', 'save', 'insert', 'bulkCreate', 'upsert'];

// Mass assignment is about handing over the whole object. `req.body.url` is a
// single field and belongs to whatever rule covers that field's sink, not here.
const WHOLE_PAYLOAD = /^(req|request|ctx|context)\.(body|query|params)$|^(ctx|context)\.request\.body$/;

// Builtins take a value in their constructor and are not models.
const NOT_A_MODEL = new Set([
  'URL',
  'URLSearchParams',
  'Date',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Buffer',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Function',
  'Proxy',
  'Response',
  'Request',
  'Headers',
  'FormData',
  'Blob',
  'File',
  'AbortController',
  'TextEncoder',
  'TextDecoder',
  'EventEmitter',
  'Intl',
]);

function wholeRequestObject(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return true;
  if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return false;
  return WHOLE_PAYLOAD.test(memberName(node) ?? '');
}

export const MASS_01 = {
  id: 'MASS-01',
  title: 'Request body written straight into a model',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-915'],
  api: 'API3',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /Object\.assign|\.(create|update|updateOne|save|insert|bulkCreate|upsert)\s*\(|new\s+[A-Z]/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression', 'NewExpression'],
  match(node, ctx) {
    if (node.type === 'NewExpression') {
      const name = memberName(node.callee);
      const constructorName = lastSegment(name) ?? '';
      if (!name || !/^[A-Z]/.test(constructorName)) return null;
      if (NOT_A_MODEL.has(constructorName)) return null;
      const first = node.arguments[0];
      if (!wholeRequestObject(first) || !ctx.isTainted(first)) return null;
      return { node: first, source: ctx.describe(first), sink: `new ${lastSegment(name)}` };
    }

    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);

    if (full === 'Object.assign') {
      const tainted = node.arguments.slice(1).find((arg) => wholeRequestObject(arg) && ctx.isTainted(arg));
      if (!tainted) return null;
      return { node: tainted, source: ctx.describe(tainted), sink: 'Object.assign' };
    }

    if (!ASSIGN_SINKS.includes(method)) return null;

    const payload = node.arguments.find((arg) => wholeRequestObject(arg) && ctx.isTainted(arg));
    if (!payload) return null;

    return { node: payload, source: ctx.describe(payload), sink: full };
  },
  message: (f) =>
    `${f.sink} takes ${f.source} whole. Adding "role": "admin" or "isVerified": true to the request body sets those fields too.`,
  fix: "const { displayName, avatar } = UpdateUser.parse(req.body);\nawait user.update({ displayName, avatar });",
};

const SENSITIVE_ROUTE = /(admin|internal|delete|remove|purge|impersonate|billing|payout|refund|role|permission|settings\/security)/i;
const AUTH_MIDDLEWARE =
  /requireAuth|isAuthenticated|ensureAuth|authenticate|authGuard|requireRole|requireAdmin|checkAuth|verifyToken|passport\.authenticate|@UseGuards|preHandler/;

export const AUTHZ_01 = {
  id: 'AUTHZ-01',
  title: 'Sensitive route with no middleware',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-862', 'CWE-306'],
  api: 'API5',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(get|post|put|patch|delete|all)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!['get', 'post', 'put', 'patch', 'delete', 'all'].includes(lastSegment(full))) return null;
    if (!/^(app|router|server|api)\b/.test(full)) return null;

    const route = staticString(node.arguments[0]);
    if (!route || !SENSITIVE_ROUTE.test(route)) return null;

    // Path, then exactly one handler, means nothing runs in between.
    if (node.arguments.length !== 2) return null;

    // Only worth saying when the project clearly has auth middleware to use.
    if (!AUTH_MIDDLEWARE.test(ctx.source)) return null;

    const callSource = ctx.source.slice(node.start, Math.min(node.end, node.start + 300));
    if (AUTH_MIDDLEWARE.test(callSource)) return null;

    return { node, route };
  },
  message: (f) =>
    `${f.route} looks sensitive and is registered with a handler and no middleware, while this file uses auth middleware elsewhere. Check it is not open.`,
  fix: "app.post('/admin/users/:id', requireAuth, requireRole('admin'), handler);",
};

export default [IDOR_01, MASS_01, AUTHZ_01];
