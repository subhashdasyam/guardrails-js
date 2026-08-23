// Server side request forgery. OWASP folded SSRF into A01:2025.

import {
  calleeEndsWith,
  memberName,
  lastSegment,
  staticString,
  objectValue,
  isCall,
} from '../helpers.js';

const NETWORK_CALLEES = [
  'fetch',
  'axios',
  'got',
  'ky',
  'superagent',
  'request',
  'undici',
  'nodeFetch',
];

const NETWORK_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'request', 'stream'];

function isNetworkCall(node) {
  const full = memberName(node.callee);
  if (!full) return false;

  if (NETWORK_CALLEES.includes(full)) return true;

  const parts = full.split('.');
  const head = parts[0];
  const tail = parts[parts.length - 1];

  if (NETWORK_CALLEES.includes(head) && NETWORK_METHODS.includes(tail)) return true;
  if ((head === 'http' || head === 'https') && ['get', 'request'].includes(tail)) return true;
  if (head === 'undici' && ['request', 'fetch', 'stream'].includes(tail)) return true;

  return false;
}

/** The URL argument. For axios.get(url, opts) it is first, for axios({url}) it is a field. */
function urlArgument(node) {
  const first = node.arguments[0];
  if (!first) return null;
  if (first.type === 'ObjectExpression') {
    return objectValue(first, 'url') ?? objectValue(first, 'uri') ?? null;
  }
  return first;
}

const HOST_ALLOWLIST_GUARDS = [
  /\bisAllowedHost$/i,
  /\ballowedHosts?\.(has|includes)$/i,
  /\bassertPublicHost$/i,
  /\bvalidateUrl$/i,
  /\bsafeFetch$/i,
];

export const SSRF_01 = {
  id: 'SSRF-01',
  title: 'Outbound request to a user supplied URL',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-918'],
  api: 'API7',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\b(fetch|axios|got|ky|superagent|undici)\b|https?\.(get|request)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!isNetworkCall(node)) return null;

    const url = urlArgument(node);
    if (!url || !ctx.isTainted(url)) return null;
    if (ctx.hasGuardInScope(node, HOST_ALLOWLIST_GUARDS)) return null;

    return { node: url, source: ctx.describe(url) };
  },
  message: (f) =>
    `Outbound request goes to a URL from ${f.source}. That reaches your internal network and the cloud metadata service at 169.254.169.254.`,
  fix: "const target = new URL(input);\nif (!ALLOWED_HOSTS.has(target.hostname)) throw new Error('host not allowed');\nawait fetch(target, { redirect: 'error' });",
};

export const SSRF_02 = {
  id: 'SSRF-02',
  title: 'User supplied URL follows redirects',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-918'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /redirect\s*:\s*['"]follow['"]|maxRedirects|followRedirect/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!isNetworkCall(node)) return null;

    const url = urlArgument(node);
    if (!url || !ctx.isTainted(url)) return null;

    for (const arg of node.arguments) {
      if (arg.type !== 'ObjectExpression') continue;

      const redirect = staticString(objectValue(arg, 'redirect'));
      if (redirect === 'follow') return { node: arg, source: ctx.describe(url) };

      const followRedirect = objectValue(arg, 'followRedirect');
      if (followRedirect?.type === 'BooleanLiteral' && followRedirect.value === true) {
        return { node: arg, source: ctx.describe(url) };
      }

      const maxRedirects = objectValue(arg, 'maxRedirects');
      if (maxRedirects?.type === 'NumericLiteral' && maxRedirects.value > 0) {
        return { node: arg, source: ctx.describe(url) };
      }
    }

    return null;
  },
  message: (f) =>
    `The URL from ${f.source} is checked once and then redirects are followed. The first hop can be public and the second can be 127.0.0.1.`,
  fix: "await fetch(target, { redirect: 'error' })  // then re-check every hop yourself",
};

const PRIVATE_HOST_STRINGS = [
  '169.254.169.254',
  'metadata.google.internal',
  '127.0.0.1',
  'localhost',
  '0.0.0.0',
  '::1',
  '192.168.',
  '10.0.',
  '172.16.',
];

const DENYLIST_METHODS = ['includes', 'indexOf', 'startsWith', 'endsWith', 'search', 'match'];

export const SSRF_03 = {
  id: 'SSRF-03',
  title: 'URL checked against a blocked list of strings',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-918'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /169\.254\.169\.254|metadata\.google\.internal|127\.0\.0\.1|localhost/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!DENYLIST_METHODS.includes(lastSegment(full))) return null;

    const needle = staticString(node.arguments[0]);
    if (!needle) return null;
    if (!PRIVATE_HOST_STRINGS.some((host) => needle.includes(host))) return null;

    // Only interesting when the thing being checked is user controlled.
    const subject = node.callee.object;
    if (!subject || !ctx.isTainted(subject)) return null;

    return { node, source: ctx.describe(subject), needle };
  },
  message: (f) =>
    `Blocking the string "${f.needle}" does not stop this. 0x7f.1, 2130706433, [::], and a hostname that resolves to a private address all get through.`,
  fix: "Parse with new URL, resolve the hostname, and reject the resulting IP against private ranges. Do not string match.",
};

export default [SSRF_01, SSRF_02, SSRF_03];
