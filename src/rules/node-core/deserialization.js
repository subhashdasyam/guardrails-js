// Deserialization and dynamic loading. OWASP A08:2025 and A05:2025.

import {
  calleeEndsWith,
  memberName,
  lastSegment,
  isLiteral,
  staticString,
  depVersion,
  majorOf,
} from '../helpers.js';

export const DESER_01 = {
  id: 'DESER-01',
  title: 'node-serialize unserialize on untrusted data',
  severity: 'critical',
  owasp2025: 'A08',
  cwe: ['CWE-502'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /unserialize\s*\(|node-serialize/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, ['unserialize'])) return null;
    const first = node.arguments[0];
    if (!first) return null;
    return {
      node: first,
      source: ctx.isTainted(first) ? ctx.describe(first) : 'serialized input',
      severityHint: ctx.isTainted(first) ? 'critical' : 'high',
    };
  },
  message: (f) =>
    `node-serialize rebuilds functions from ${f.source} and calls them. This is remote code execution, not a parsing bug.`,
  fix: 'Use JSON.parse with a schema check. There is no safe way to use node-serialize on input you did not create.',
};

const VM_CALLS = [
  'runInNewContext',
  'runInThisContext',
  'runInContext',
  'compileFunction',
  'createScript',
];

export const DESER_02 = {
  id: 'DESER-02',
  title: 'Code run through vm or vm2',
  severity: 'critical',
  owasp2025: 'A08',
  cwe: ['CWE-94', 'CWE-502'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\bvm2?\b|runInNewContext|runInThisContext|runInContext|new\s+VM\b|NodeVM/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression', 'NewExpression', 'ImportDeclaration'],
  match(node, ctx) {
    if (node.type === 'ImportDeclaration') {
      if (staticString(node.source) === 'vm2') {
        return { node, source: 'the vm2 package', severityHint: 'high', abandoned: true };
      }
      return null;
    }

    if (node.type === 'NewExpression') {
      const name = memberName(node.callee);
      if (name === 'VM' || name === 'NodeVM' || name === 'vm.Script' || name === 'Script') {
        const arg = node.arguments[0];
        return {
          node,
          source: arg && ctx.isTainted(arg) ? ctx.describe(arg) : 'a sandbox',
          severityHint: arg && ctx.isTainted(arg) ? 'critical' : 'high',
        };
      }
      return null;
    }

    if (!calleeEndsWith(node, VM_CALLS)) return null;
    const first = node.arguments[0];
    if (!first) return null;

    return {
      node: first,
      source: ctx.isTainted(first) ? ctx.describe(first) : 'a code string',
      severityHint: ctx.isTainted(first) ? 'critical' : 'high',
    };
  },
  message: (f) =>
    f.abandoned
      ? 'vm2 is no longer maintained and has a run of sandbox escape CVEs. Do not use it as a security boundary.'
      : `Code from ${f.source} is being run. The node vm module is not a sandbox, the docs say so, and vm2 escapes are published regularly.`,
  fix: 'Run untrusted code in a separate process or container with no credentials, and talk to it over a narrow protocol.',
};

export const DESER_03 = {
  id: 'DESER-03',
  title: 'Module loaded from a computed path',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-73', 'CWE-94'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\brequire\s*\(|\bimport\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression', 'Import'],
  match(node, ctx) {
    const full = memberName(node.callee);
    const isRequire = full === 'require';
    const isDynamicImport = node.callee?.type === 'Import';
    if (!isRequire && !isDynamicImport) return null;

    const first = node.arguments[0];
    if (!first || isLiteral(first)) return null;

    // A plain lazy import of a constant that lives in a variable is common and
    // harmless. Only complain when the value can come from outside.
    if (!ctx.isTainted(first)) return null;

    return { node: first, source: ctx.describe(first) };
  },
  message: (f) =>
    `Module path comes from ${f.source}. Loading a module runs its top level code, so this hands over control of what executes.`,
  fix: "const MODULES = { csv: () => import('./csv.js') };\nconst load = MODULES[name];\nif (!load) throw new Error('unknown format');",
};

export const DESER_04 = {
  id: 'DESER-04',
  title: 'YAML parsed with an unsafe loader',
  severity: 'high',
  owasp2025: 'A08',
  cwe: ['CWE-502'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\byaml\b|\bloadAll\s*\(|\bsafeLoad\s*\(|js-yaml/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!['load', 'loadAll'].includes(method)) return null;
    if (!/yaml/i.test(full)) return null;

    const first = node.arguments[0];
    if (!first || !ctx.isTainted(first)) return null;

    const major = majorOf(depVersion(ctx.pkg, 'js-yaml'));

    // js-yaml 4 removed safeLoad and made load use the safe schema by default.
    // Flagging every load in a v4 project would be wrong.
    if (major !== null && major >= 4) {
      const options = node.arguments[1];
      if (!options) return null;
      const schema = memberName(options.type === 'ObjectExpression' ? options : null);
      if (!schema) return null;
      return null;
    }

    return {
      node: first,
      source: ctx.describe(first),
      severityHint: major === null ? 'medium' : 'high',
      version: major === null ? 'an unknown version' : `js-yaml ${major}`,
    };
  },
  message: (f) =>
    `YAML from ${f.source} is parsed by ${f.version}, where load accepts tags that build arbitrary objects.`,
  fix: 'Upgrade to js-yaml 4 and use load, which defaults to the safe schema. On version 3 use safeLoad.',
};

export default [DESER_01, DESER_02, DESER_03, DESER_04];
