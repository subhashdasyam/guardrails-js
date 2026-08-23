// Resource exhaustion and unbounded input. OWASP A10:2025.
//
// These become security findings the moment an attacker picks the input size,
// the regex, or the number of requests.

import { memberName, lastSegment, staticString, objectValue } from '../helpers.js';

// A group that can repeat, containing something that can also repeat or that
// overlaps with itself. This is the shape behind catastrophic backtracking.
const NESTED_QUANTIFIER = /\((?:\?[:=!]|\?<[=!]?[A-Za-z]*>)?[^()]*[*+][^()]*\)\s*[*+]/;
const OVERLAPPING_ALTERNATION = /\((?:\?[:=!])?[^()|]*\|[^()]*\)\s*[*+]/;
const NESTED_BOUNDED = /\([^()]*\)\{\d+,\}\s*[*+]/;

export const REDOS_01 = {
  id: 'REDOS-01',
  title: 'Regular expression can backtrack forever',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-1333', 'CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /[*+]\s*\)?\s*[*+]|new RegExp/,
  nodeTypes: ['RegExpLiteral', 'NewExpression'],
  match(node, ctx) {
    if (node.type === 'NewExpression') {
      if (memberName(node.callee) !== 'RegExp') return null;
      const arg = node.arguments[0];
      if (!arg || !ctx.isTainted(arg)) return null;
      return {
        node: arg,
        kind: `the pattern comes from ${ctx.describe(arg)}`,
        severityHint: 'high',
      };
    }

    const pattern = node.pattern ?? '';
    if (pattern.length < 4) return null;

    if (NESTED_QUANTIFIER.test(pattern)) {
      return { node, kind: 'a repeating group contains another repeat, such as (a+)+' };
    }
    if (OVERLAPPING_ALTERNATION.test(pattern)) {
      return { node, kind: 'a repeating group has overlapping alternatives, such as (a|aa)+' };
    }
    if (NESTED_BOUNDED.test(pattern)) {
      return { node, kind: 'an open ended repeat is nested inside another repeat' };
    }

    return null;
  },
  message: (f) =>
    `This regular expression is dangerous because ${f.kind}. A crafted input a few dozen characters long can hang the event loop for minutes.`,
  fix: 'Simplify the pattern, cap the input length before matching, or use a linear time engine such as RE2.',
};

const BODY_PARSERS = ['json', 'urlencoded', 'raw', 'text'];

export const BODY_01 = {
  id: 'BODY-01',
  title: 'Body parser with no size limit',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-770', 'CWE-400'],
  api: 'API4',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /express\.(json|urlencoded|raw|text)|bodyParser\.(json|urlencoded|raw|text)/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!/^(express|bodyParser|body_parser)\./.test(full)) return null;
    if (!BODY_PARSERS.includes(lastSegment(full))) return null;

    const options = node.arguments[0];
    if (options?.type === 'ObjectExpression' && objectValue(options, 'limit')) return null;

    return { node, parser: full };
  },
  message: (f) =>
    `${f.parser} has no limit, so it defaults to 100kb for JSON and accepts whatever arrives for the others. One large request can take the process down.`,
  fix: "app.use(express.json({ limit: '1mb' }));",
};

export const UPLOAD_01 = {
  id: 'UPLOAD-01',
  title: 'File upload with no limits',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-434', 'CWE-770'],
  api: 'API4',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /multer|busboy|formidable|fastify-multipart/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!/^(multer|busboy|formidable)$/i.test(lastSegment(full)) && !/multipart/i.test(full)) {
      return null;
    }

    const options = node.arguments[0];
    if (options?.type === 'ObjectExpression') {
      const limits = objectValue(options, 'limits') ?? objectValue(options, 'maxFileSize');
      if (limits) return null;
    }

    return { node, library: lastSegment(full) };
  },
  message: (f) =>
    `${f.library} is set up with no limits, so file size, file count, and field count are all unbounded. Also check the extension against an allowlist and generate the stored filename yourself.`,
  fix: "multer({ dest: UPLOAD_DIR, limits: { fileSize: 5 * 1024 * 1024, files: 3 } })",
};

const ARCHIVE_ENTRY = /\b(entry|entryName|fileName|header)\b/;
const CONTAINMENT = [
  /\.startsWith$/,
  /^path\.relative$/,
  /\.relative$/,
  /\bisPathInside$/i,
  /\bsafeJoin$/i,
];

export const ZIP_01 = {
  id: 'ZIP-01',
  title: 'Archive entry written without a containment check',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-22'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /entryName|extractAllTo|extractEntryTo|\bunzip|\badm-zip|\btar\b/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;

    if (['extractAllTo', 'extractEntryTo'].includes(lastSegment(full))) {
      if (ctx.hasGuardInScope(node, CONTAINMENT)) return null;
      return { node, kind: `${lastSegment(full)} trusts the paths inside the archive` };
    }

    if (!['join', 'resolve'].includes(lastSegment(full))) return null;
    if (!/^path\./.test(full)) return null;

    const usesEntry = node.arguments.some((arg) =>
      ARCHIVE_ENTRY.test(ctx.source.slice(arg.start, arg.end)),
    );
    if (!usesEntry) return null;
    if (ctx.hasGuardInScope(node, CONTAINMENT)) return null;

    return { node, kind: 'an archive entry name is joined onto the output directory' };
  },
  message: (f) =>
    `${f.kind}. An entry named ../../etc/cron.d/x writes outside the directory you chose, which is the zip slip bug.`,
  fix: "const out = path.resolve(dir, entry.entryName);\nif (!out.startsWith(dir + path.sep)) throw new Error('unsafe entry');",
};

const SENSITIVE_ENDPOINT =
  /(login|signin|sign-in|register|signup|sign-up|reset|forgot|password|otp|verify|token|invite|magic)/i;
const RATE_LIMITER =
  /rateLimit|express-rate-limit|rate-limiter|@fastify\/rate-limit|Throttler|slowDown|bottleneck|@nestjs\/throttler/i;

export const RATE_01 = {
  id: 'RATE-01',
  title: 'Authentication endpoint with no rate limit',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-770', 'CWE-307'],
  api: 'API4',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /(login|signin|register|reset|forgot|password|otp|magic)/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!['post', 'put', 'all'].includes(lastSegment(full))) return null;
    if (!/^(app|router|server|api)\b/.test(full)) return null;

    const route = staticString(node.arguments[0]);
    if (!route || !SENSITIVE_ENDPOINT.test(route)) return null;
    if (RATE_LIMITER.test(ctx.source)) return null;

    if (ctx.state.get('RATE-01')) return null;
    ctx.state.set('RATE-01', true);

    return { node, route };
  },
  message: (f) =>
    `${f.route} takes credentials and nothing in this file limits how often it can be called. Password guessing and account enumeration both need volume, and this gives it to them.`,
  fix: "const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });\napp.post('/login', limiter, handler);",
};

export default [REDOS_01, BODY_01, UPLOAD_01, ZIP_01, RATE_01];
