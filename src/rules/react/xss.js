// Cross site scripting and other client side sinks. OWASP A05:2025.
//
// React and Vue escape everything by default. Each of these rules is about an
// escape hatch you had to reach for on purpose.

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, isLiteral, staticString, objectValue } from '../helpers.js';

const SANITIZER_CALL = /(DOMPurify|purify|sanitize|xss|clean)/i;

function isSanitized(node, ctx) {
  if (!node) return false;
  if (isLiteral(node)) return true;

  if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
    const name = memberName(node.callee);
    if (name && SANITIZER_CALL.test(name)) return true;
  }

  if (node.type === 'ConditionalExpression') {
    return isSanitized(node.consequent, ctx) && isSanitized(node.alternate, ctx);
  }

  // A variable that was assigned from a sanitizer earlier in the file.
  if (node.type === 'Identifier') {
    const assignment = new RegExp(
      `(const|let|var)\\s+${node.name}\\s*=\\s*[^;\\n]*(${SANITIZER_CALL.source})`,
      'i',
    );
    if (assignment.test(ctx.source)) return true;
  }

  return false;
}

export const XSS_01 = {
  id: 'XSS-01',
  title: 'Unsanitised HTML rendered by React',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['jsx', 'tsx', 'js', 'ts'],
  prefilter: /dangerouslySetInnerHTML/,
  nodeTypes: ['JSXAttribute'],
  match(node, ctx) {
    if (node.name?.name !== 'dangerouslySetInnerHTML') return null;

    const value = node.value;
    if (value?.type !== 'JSXExpressionContainer') return null;

    const object = value.expression;
    if (object?.type !== 'ObjectExpression') return { node, html: 'a computed value' };

    const html = objectValue(object, '__html');
    if (isSanitized(html, ctx)) return null;

    return { node: html ?? node, html: html ? ctx.source.slice(html.start, html.end) : 'a value' };
  },
  message: (f) =>
    `dangerouslySetInnerHTML renders ${f.html} as raw HTML with no sanitiser in front of it. A comment containing an onerror attribute runs as script.`,
  fix: '<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />',
};

const HTML_SINK_PROPERTIES = ['innerHTML', 'outerHTML'];

export const XSS_02 = {
  id: 'XSS-02',
  title: 'HTML written straight into the DOM',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /innerHTML|outerHTML|document\.write|insertAdjacentHTML/,
  nodeTypes: ['AssignmentExpression', 'CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (node.type === 'AssignmentExpression') {
      const target = memberName(node.left);
      if (!target) return null;
      if (!HTML_SINK_PROPERTIES.includes(lastSegment(target))) return null;
      if (isSanitized(node.right, ctx)) return null;
      return { node: node.right, sink: lastSegment(target) };
    }

    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);

    if (method === 'write' || method === 'writeln') {
      if (!/^document\./.test(full)) return null;
      const arg = node.arguments[0];
      if (isSanitized(arg, ctx)) return null;
      return { node: arg ?? node, sink: 'document.write' };
    }

    if (method === 'insertAdjacentHTML') {
      const arg = node.arguments[1];
      if (isSanitized(arg, ctx)) return null;
      return { node: arg ?? node, sink: 'insertAdjacentHTML' };
    }

    return null;
  },
  message: (f) =>
    `${f.sink} parses whatever it is given as HTML. Use textContent when you want text, and sanitise when you really do need markup.`,
  fix: 'element.textContent = value;  // or DOMPurify.sanitize(value) when HTML is required',
};

export const XSS_05 = {
  id: 'XSS-05',
  title: 'Code built from a string at runtime',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-94', 'CWE-95'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\beval\s*\(|new\s+Function|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression', 'NewExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const name = lastSegment(full);

    if (node.type === 'NewExpression') {
      if (name !== 'Function') return null;
      return { node, sink: 'new Function', severityHint: 'high' };
    }

    if (name === 'eval') {
      const arg = node.arguments[0];
      if (isLiteral(arg)) return null;
      return {
        node: arg ?? node,
        sink: 'eval',
        severityHint: arg && ctx.isTainted(arg) ? 'critical' : 'high',
      };
    }

    if (name === 'setTimeout' || name === 'setInterval') {
      const arg = node.arguments[0];
      // Only the string form compiles code. A function reference is fine.
      if (!arg) return null;
      if (arg.type !== 'StringLiteral' && arg.type !== 'TemplateLiteral') return null;
      return { node: arg, sink: `${name} with a string` };
    }

    return null;
  },
  message: (f) =>
    `${f.sink} compiles and runs a string as code. Whatever produced that string now decides what your process does.`,
  fix: 'const handlers = { save, cancel };\nhandlers[action]?.();',
};

const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formAction', 'poster']);
const URL_GUARD = /startsWith\(\s*['"]https?:|new URL\(|\^https\?:|isSafeUrl|sanitizeUrl|encodeURI/;

export const XSS_06 = {
  id: 'XSS-06',
  title: 'Link target with no protocol check',
  severity: 'medium',
  owasp2025: 'A05',
  cwe: ['CWE-79', 'CWE-601'],
  languages: ['jsx', 'tsx'],
  prefilter: /href=\{|src=\{|action=\{/,
  nodeTypes: ['JSXAttribute'],
  match(node, ctx) {
    const name = node.name?.name;
    if (!URL_ATTRIBUTES.has(name)) return null;

    const value = node.value;
    if (value?.type !== 'JSXExpressionContainer') return null;

    const expression = value.expression;
    if (isLiteral(expression)) return null;

    const text = ctx.source.slice(expression.start, expression.end);

    // A relative path built from a template is not the problem.
    if (/^`\//.test(text) || /^['"]\//.test(text)) return null;
    // Only worth saying when the value looks like it came from outside.
    const looksExternal = ctx.isTainted(expression) || /url|href|link|redirect|website|homepage/i.test(text);
    if (!looksExternal) return null;

    if (URL_GUARD.test(ctx.source)) return null;

    return { node, attribute: name, value: text.slice(0, 60) };
  },
  message: (f) =>
    `${f.attribute} is set from ${f.value} with no protocol check. A value starting with javascript: runs as script when the link is clicked.`,
  fix: "const safe = /^https?:\\/\\//.test(url) ? url : '#';",
};

export const MSG_01 = {
  id: 'MSG-01',
  title: 'postMessage handler with no origin check',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-346'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /addEventListener\s*\(\s*['"]message['"]/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full || lastSegment(full) !== 'addEventListener') return null;
    if (staticString(node.arguments[0]) !== 'message') return null;

    const handler = node.arguments[1];
    if (!handler) return null;

    // The handler may be a reference. Check the whole file in that case, which
    // is the conservative direction.
    const scope =
      handler.type === 'FunctionExpression' || handler.type === 'ArrowFunctionExpression'
        ? ctx.source.slice(handler.start, handler.end)
        : ctx.source;

    if (/\.origin\s*(===|!==|==|!=)|\.origin\b[^=]*(includes|has|indexOf)/.test(scope)) return null;

    return { node };
  },
  message: () =>
    'This message handler reads event.data without checking event.origin first. Any page that can get a reference to this window can send it whatever it likes.',
  fix: "window.addEventListener('message', (event) => {\n  if (event.origin !== TRUSTED_ORIGIN) return;\n  handle(event.data);\n});",
};

export const LINK_01 = {
  id: 'LINK-01',
  title: 'New tab link without rel noopener',
  severity: 'low',
  owasp2025: 'A02',
  cwe: ['CWE-1022'],
  languages: ['jsx', 'tsx'],
  prefilter: /_blank/,
  nodeTypes: ['JSXOpeningElement'],
  match(node, ctx) {
    let isBlank = false;
    let rel = null;

    for (const attribute of node.attributes ?? []) {
      if (attribute.type !== 'JSXAttribute') continue;
      const name = attribute.name?.name;
      if (name === 'target' && staticString(attribute.value) === '_blank') isBlank = true;
      if (name === 'rel') rel = attribute.value;
    }

    if (!isBlank) return null;

    const relText = rel ? ctx.source.slice(rel.start, rel.end) : '';
    if (/noopener/.test(relText)) return null;

    return { node };
  },
  message: () =>
    'A link opened with target="_blank" gives the new page a handle on this one through window.opener, which lets it navigate your tab somewhere else.',
  fix: '<a href={url} target="_blank" rel="noopener noreferrer">',
};

export default [XSS_01, XSS_02, XSS_05, XSS_06, MSG_01, LINK_01];
