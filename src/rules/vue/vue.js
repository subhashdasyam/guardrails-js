// Vue and Nuxt. Template rules run over the scanned template, script rules run
// over the AST like everything else.

import { bindingName, findAttribute } from '../../engine/vue-template.js';
import { memberName, lastSegment, staticString, objectValue, isTrue } from '../helpers.js';

const SANITIZER = /(DOMPurify|purify|sanitize|xss|clean)\s*[.(]/i;

export const XSS_03 = {
  id: 'XSS-03',
  title: 'Unsanitised HTML rendered by Vue',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-79'],
  languages: ['vue'],
  target: 'template',
  prefilter: /v-html/,
  matchTemplate(element, ctx) {
    const attribute = element.attributes.find(
      (candidate) => candidate.name === 'v-html' || candidate.name === 'v-html.prop',
    );
    if (!attribute || !attribute.value) return null;

    if (SANITIZER.test(attribute.value)) return null;

    return {
      offset: attribute.valueStart ?? attribute.nameStart,
      expression: attribute.value.slice(0, 60),
    };
  },
  message: (f) =>
    `v-html renders ${f.expression} as raw HTML. Vue escapes everything else for you, and this is the one place it does not.`,
  fix: '<div>{{ comment }}</div>  <!-- or v-html="sanitize(comment)" when markup is genuinely needed -->',
};

const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'to']);
const URL_GUARD = /startsWith\(\s*['"]https?:|new URL\(|\^https\?:|isSafeUrl|sanitizeUrl/;

export const VUE_URL = {
  id: 'VUE-URL',
  title: 'Bound link target with no protocol check',
  severity: 'medium',
  owasp2025: 'A05',
  cwe: ['CWE-79', 'CWE-601'],
  languages: ['vue'],
  target: 'template',
  prefilter: /:href|:src|v-bind:href|v-bind:src|:action/,
  matchTemplate(element, ctx) {
    for (const attribute of element.attributes) {
      const name = bindingName(attribute.name).toLowerCase();
      if (!URL_ATTRIBUTES.has(name)) continue;
      if (attribute.name === name) continue; // a plain literal attribute is fine
      if (!attribute.value) continue;

      // A path built in the template is not the risk here.
      if (attribute.value.startsWith("'/") || attribute.value.startsWith('"/')) continue;
      if (!/url|href|link|redirect|website|homepage|site/i.test(attribute.value)) continue;
      if (URL_GUARD.test(ctx.source)) continue;

      return {
        offset: attribute.valueStart ?? attribute.nameStart,
        attribute: name,
        expression: attribute.value.slice(0, 60),
      };
    }
    return null;
  },
  message: (f) =>
    `${f.attribute} is bound to ${f.expression} with no protocol check. A value beginning with javascript: runs as script when someone clicks it.`,
  fix: "const safe = computed(() => /^https?:\\/\\//.test(item.url) ? item.url : '#');",
};

const COMPILE_CALLS = ['compile', 'compileToFunction', 'createSSRApp', 'createApp'];

export const VUE_SSR = {
  id: 'VUE-SSR',
  title: 'Vue template compiled from a string',
  severity: 'critical',
  owasp2025: 'A05',
  cwe: ['CWE-94', 'CWE-1336'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /compile|createSSRApp|createApp|template\s*:/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression', 'ObjectProperty', 'Property'],
  match(node, ctx) {
    if (node.type === 'ObjectProperty' || node.type === 'Property') {
      const key = node.key?.name ?? node.key?.value;
      if (key !== 'template') return null;
      if (!ctx.isTainted(node.value)) return null;
      if (!/vue|createApp|createSSRApp/i.test(ctx.source)) return null;
      return { node: node.value, source: ctx.describe(node.value), kind: 'a template option' };
    }

    const full = memberName(node.callee);
    if (!full) return null;
    if (!COMPILE_CALLS.includes(lastSegment(full))) return null;

    const first = node.arguments[0];
    if (!first || !ctx.isTainted(first)) return null;

    return { node: first, source: ctx.describe(first), kind: lastSegment(full) };
  },
  message: (f) =>
    `${f.kind} is given ${f.source}. The Vue template compiler builds a render function, so a string from outside becomes code that runs on your server.`,
  fix: 'Keep templates in components. Pass user data in as props or slot content, never as template source.',
};

export const VITE_HOST = {
  id: 'VITE-HOST',
  title: 'Development server exposed to the network',
  severity: 'high',
  owasp2025: 'A02',
  cwe: ['CWE-200', 'CWE-668'],
  languages: ['js', 'ts', 'mjs', 'cjs', 'vue'],
  prefilter: /host\s*:|devServer|server\s*:/,
  nodeTypes: ['ObjectProperty', 'Property'],
  match(node, ctx) {
    const key = node.key?.name ?? node.key?.value;
    if (key !== 'host') return null;

    const value = node.value;
    const literal = staticString(value);

    const exposed =
      isTrue(value) || literal === '0.0.0.0' || literal === '::' || literal === '0.0.0.0/0';
    if (!exposed) return null;

    // Only interesting in a dev server config, not in a production listener.
    if (!/vite|nuxt|devServer|server\s*:|defineConfig/i.test(ctx.source)) return null;

    return { node, value: literal ?? 'true' };
  },
  message: (f) =>
    `The dev server host is set to ${f.value}, which binds it to every interface on the machine. Vite dev servers have served arbitrary files off disk to anyone who could reach them, in CVE-2025-30208 and CVE-2025-31125, and Nuxt leaked source the same way in CVE-2025-24360.`,
  fix: "server: { host: 'localhost' }  // and use a tunnel when you genuinely need remote access",
};

const SENSITIVE_ROUTE_PATH = /(admin|internal|billing|account|settings|dashboard|api\/private)/i;

export const NUXT_ROUTE_RULES = {
  id: 'NUXT-ROUTE-RULES',
  title: 'Route rules used as an authorization boundary',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-862'],
  languages: ['js', 'ts', 'mjs', 'cjs'],
  prefilter: /routeRules/,
  nodeTypes: ['ObjectProperty', 'Property'],
  match(node, ctx) {
    const key = node.key?.name ?? node.key?.value;
    if (key !== 'routeRules') return null;
    if (node.value?.type !== 'ObjectExpression') return null;

    for (const property of node.value.properties) {
      if (property.type === 'SpreadElement') continue;
      const route = property.key?.value ?? property.key?.name;
      if (typeof route !== 'string') continue;
      if (!SENSITIVE_ROUTE_PATH.test(route)) continue;

      return { node: property, route };
    }

    return null;
  },
  message: (f) =>
    `${f.route} is configured through routeRules. Route rules control rendering and caching, not who is allowed in, and a cached page can be served to the next visitor. Check the handler does its own auth.`,
  fix: 'Do the auth check inside the server route or a server middleware, and keep authenticated pages out of the cache.',
};

export default [XSS_03, VUE_URL, VUE_SSR, VITE_HOST, NUXT_ROUTE_RULES];
