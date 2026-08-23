// Next.js specific rules. Mostly OWASP A01:2025.
//
// The three things here have all caused real incidents, and none of them look
// wrong when you read the code.

import path from 'node:path';

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, staticString, objectValue } from '../helpers.js';

const AUTH_CALL =
  /\bauth\s*\(|getServerSession|getSession|currentUser|requireAuth|requireUser|getUser\s*\(|verifySession|assertAuthenticated|withAuth|clerkClient|getToken\s*\(/;

const AUTHZ_TERM = /\brole\b|\bpermission\b|\bcan[A-Z]|\bisAdmin\b|\bownerId\b|\borgId\b|\btenantId\b/;

function isMiddlewareFile(filePath) {
  const base = path.basename(String(filePath));
  return /^middleware\.(js|ts|mjs|cjs)$/.test(base);
}

export const NEXT_MW = {
  id: 'NEXT-MW',
  title: 'Middleware used as the only authorization check',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-863', 'CWE-862'],
  languages: ['js', 'jsx', 'ts', 'tsx'],
  fileWide: true,
  prefilter: /x-middleware-subrequest|NextResponse|export\s+(async\s+)?function\s+middleware|export\s+const\s+config/,
  nodeTypes: ['Program', 'CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    // Trusting the header that CVE-2025-29927 abused is its own finding.
    if (node.type !== 'Program') {
      const full = memberName(node.callee);
      if (!full || !['get', 'has'].includes(lastSegment(full))) return null;
      const header = staticString(node.arguments[0]);
      if (!header || header.toLowerCase() !== 'x-middleware-subrequest') return null;
      return {
        node,
        kind: 'header',
        severityHint: 'critical',
      };
    }

    if (!isMiddlewareFile(ctx.filePath)) return null;
    if (!AUTH_CALL.test(ctx.source) && !/redirect|rewrite/.test(ctx.source)) return null;
    if (!/redirect|rewrite|NextResponse/.test(ctx.source)) return null;
    if (ctx.state.get('NEXT-MW')) return null;
    ctx.state.set('NEXT-MW', true);

    return { node, kind: 'middleware' };
  },
  message: (f) =>
    f.kind === 'header'
      ? 'This code trusts the x-middleware-subrequest header. That header is what CVE-2025-29927 used to skip middleware entirely, and it comes from the client.'
      : 'This middleware decides who gets in. CVE-2025-29927 let a request header skip middleware completely, so the same check has to exist in the route handler or server action as well. Upgrade to 12.3.5, 13.5.9, 14.2.25, or 15.2.3 and above.',
  fix: 'Repeat the auth check inside the route handler or server action. Treat middleware as a fast path, not a boundary.',
};

export const SERVER_ACTION = {
  id: 'SERVER-ACTION',
  title: 'Server action with no auth check',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-862', 'CWE-306'],
  api: 'API5',
  languages: ['js', 'jsx', 'ts', 'tsx'],
  fileWide: true,
  prefilter: /['"]use server['"]/,
  nodeTypes: ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'],
  match(node, ctx, parent) {
    const fileLevel = /^\s*['"]use server['"]/m.test(ctx.source.slice(0, 200));

    const ownDirective = (node.body?.directives ?? []).some(
      (directive) => directive.value?.value === 'use server',
    );

    if (!fileLevel && !ownDirective) return null;
    if (!node.async) return null;

    // Only exported functions are reachable as endpoints.
    const exported =
      parent?.type === 'ExportNamedDeclaration' ||
      parent?.type === 'ExportDefaultDeclaration' ||
      (parent?.type === 'VariableDeclarator' && /export/.test(ctx.source.slice(Math.max(0, node.start - 80), node.start)));

    if (!exported && !ownDirective) return null;

    const body = ctx.source.slice(node.start, node.end);
    if (AUTH_CALL.test(body)) return null;
    if (AUTHZ_TERM.test(body) && /where|filter/.test(body)) return null;

    const name =
      node.id?.name ??
      (parent?.type === 'VariableDeclarator' ? parent.id?.name : null) ??
      'this server action';

    return { node, name };
  },
  message: (f) =>
    `${f.name} is a server action, which means it is a public HTTP endpoint. It does not inherit protection from the page that calls it, and this one checks nothing before it runs.`,
  fix: "'use server';\nexport async function deleteProject(id) {\n  const session = await auth();\n  if (!session) throw new Error('unauthorized');\n  const parsed = z.string().uuid().parse(id);\n  await db.project.delete({ where: { id: parsed, orgId: session.orgId } });\n}",
};

export const NEXT_IMG = {
  id: 'NEXT-IMG',
  title: 'Image optimizer accepts any host',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-400', 'CWE-918'],
  languages: ['js', 'ts', 'mjs', 'cjs'],
  prefilter: /remotePatterns|domains\s*:/,
  nodeTypes: ['ObjectProperty', 'Property'],
  match(node, ctx) {
    const key = node.key?.name ?? node.key?.value;

    if (key === 'remotePatterns') {
      if (node.value?.type !== 'ArrayExpression') return null;

      for (const element of node.value.elements) {
        if (element?.type !== 'ObjectExpression') continue;
        const hostname = staticString(objectValue(element, 'hostname'));
        if (hostname === null || hostname === '**' || hostname === '*') {
          return { node: element, kind: 'remotePatterns has an entry with no hostname limit' };
        }
      }
      return null;
    }

    if (key === 'domains') {
      if (node.value?.type !== 'ArrayExpression') return null;
      const wild = node.value.elements.some((element) => {
        const value = staticString(element);
        return value === '*' || value === '**';
      });
      if (!wild) return null;
      return { node, kind: 'the images domains list contains a wildcard' };
    }

    return null;
  },
  message: (f) =>
    `${f.kind}, so /_next/image will fetch and re-encode an image from anywhere. That is a request your server makes on request, and decoding a hostile image costs real CPU.`,
  fix: "images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] }",
};

export default [NEXT_MW, SERVER_ACTION, NEXT_IMG];
