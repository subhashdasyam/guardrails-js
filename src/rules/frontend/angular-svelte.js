// Angular and Svelte. OWASP A05:2025.
//
// Both frameworks escape by default and both give you one clearly named way to
// turn that off. The names differ from React and Vue, the sink does not.

import {
  memberName,
  lastSegment,
  staticString,
  looksSanitized,
  looksConstant,
  expressionLooksSanitized,
} from '../helpers.js';

const BYPASS_METHODS = [
  'bypassSecurityTrustHtml',
  'bypassSecurityTrustScript',
  'bypassSecurityTrustStyle',
  'bypassSecurityTrustUrl',
  'bypassSecurityTrustResourceUrl',
];

export const NG_BYPASS = {
  id: 'NG-BYPASS',
  title: 'Angular sanitizer bypassed',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['ts', 'tsx', 'js', 'jsx'],
  prefilter: /bypassSecurityTrust/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!BYPASS_METHODS.includes(method)) return null;

    const value = node.arguments?.[0];
    // A reviewed constant is the one defensible use, and a constant is still a
    // constant when it was given a name at the top of the file.
    if (looksConstant(value, ctx)) return null;
    if (looksSanitized(value, ctx)) return null;

    const kind = method.replace('bypassSecurityTrust', '').toLowerCase();

    return {
      node: value ?? node,
      method,
      kind,
      severityHint: value && ctx.isTainted(value) ? 'critical' : 'high',
    };
  },
  message: (f) =>
    `${f.method} tells Angular to stop checking this ${f.kind} value. Angular's sanitizer is the reason Angular templates are safe by default, and this is the switch that turns it off.`,
  fix: 'Render the value normally and let Angular sanitize it. If you truly need markup, sanitize with DOMPurify first and keep the bypass next to a reviewed constant.',
};

export const NG_INNERHTML = {
  id: 'NG-INNERHTML',
  title: 'Angular innerHTML binding in an inline template',
  severity: 'medium',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['ts', 'tsx', 'js'],
  prefilter: /\[innerHTML\]/,
  nodeTypes: ['ObjectProperty', 'Property'],
  match(node, ctx) {
    const key = node.key?.name ?? node.key?.value;
    if (key !== 'template') return null;

    const template = staticString(node.value);
    if (!template) return null;

    const binding = /\[innerHTML\]\s*=\s*"([^"]*)"/.exec(template);
    if (!binding) return null;
    if (expressionLooksSanitized(binding[1], ctx.source)) return null;

    return { node, expression: binding[1].slice(0, 60) };
  },
  message: (f) =>
    `[innerHTML] renders ${f.expression} as markup. Angular sanitizes it, which stops script tags, but sanitizing is not the same as escaping and it is the wrong tool when you only wanted text.`,
  fix: '<div>{{ comment }}</div>',
};

// Svelte writes raw HTML with {@html expr}. It is the direct equivalent of
// v-html and dangerouslySetInnerHTML, and it is a markup construct rather than
// an attribute, so it needs the markup pass rather than the element pass.
const SVELTE_HTML_TAG = /\{@html\s+([\s\S]*?)\}/g;

export const SVELTE_HTML = {
  id: 'SVELTE-HTML',
  title: 'Unsanitised HTML rendered by Svelte',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['svelte'],
  target: 'markup',
  prefilter: /\{@html/,
  matchMarkup(source, ctx, kind) {
    const hits = [];
    const pattern = new RegExp(SVELTE_HTML_TAG.source, 'g');
    let match;

    while ((match = pattern.exec(source)) !== null) {
      const expression = match[1].trim();
      if (!expression) continue;
      if (expressionLooksSanitized(expression, source)) continue;
      // A literal string is authored markup, not user data.
      if (/^['"`]/.test(expression)) continue;

      hits.push({ offset: match.index, expression: expression.slice(0, 60) });
    }

    return hits;
  },
  message: (f) =>
    `{@html ${f.expression}} renders raw markup. Svelte escapes everything else for you, and this is the one place it does not.`,
  fix: '{comment}  <!-- or {@html DOMPurify.sanitize(comment)} when markup is genuinely needed -->',
};

const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster']);
const URL_GUARD = /startsWith\(\s*['"]https?:|new URL\(|\^https\?:|isSafeUrl|sanitizeUrl/;

export const SVELTE_URL = {
  id: 'SVELTE-URL',
  title: 'Svelte link target with no protocol check',
  severity: 'medium',
  owasp2025: 'A05',
  cwe: ['CWE-79', 'CWE-601'],
  languages: ['svelte'],
  target: 'template',
  prefilter: /href=\{|src=\{|action=\{/,
  matchTemplate(element, ctx) {
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      if (!URL_ATTRIBUTES.has(name)) continue;
      if (!attribute.value) continue;

      // Svelte binds with braces. A plain string attribute is a constant.
      if (!attribute.value.startsWith('{')) continue;

      const expression = attribute.value.slice(1, -1).trim();
      if (!/url|href|link|redirect|website|homepage|site/i.test(expression)) continue;
      if (URL_GUARD.test(ctx.source)) continue;

      return {
        offset: attribute.valueStart ?? attribute.nameStart,
        attribute: name,
        expression: expression.slice(0, 60),
      };
    }
    return null;
  },
  message: (f) =>
    `${f.attribute} is bound to ${f.expression} with no protocol check. A value beginning with javascript: runs as script when someone clicks it.`,
  fix: "const safe = /^https?:\\/\\//.test(item.url) ? item.url : '#';",
};

export default [NG_BYPASS, NG_INNERHTML, SVELTE_HTML, SVELTE_URL];
