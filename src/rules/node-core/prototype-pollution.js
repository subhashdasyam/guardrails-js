// Prototype pollution. OWASP A01:2025 or A05:2025 depending on where it lands.
//
// One polluted key on Object.prototype changes behaviour everywhere in the
// process, which is how these turn into privilege escalation and sometimes into
// remote code execution.

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, staticString } from '../helpers.js';

const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];

function hasComputedAssignmentToParam(fnNode) {
  let found = false;

  walk(fnNode, (node) => {
    if (found) return false;
    if (node.type !== 'AssignmentExpression') return undefined;
    const left = node.left;
    if (
      (left.type === 'MemberExpression' || left.type === 'OptionalMemberExpression') &&
      left.computed
    ) {
      found = true;
    }
    return undefined;
  });

  return found;
}

function callsItself(fnNode, name) {
  if (!name) return false;
  let found = false;

  walk(fnNode, (node) => {
    if (found) return false;
    if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression') return undefined;
    if (memberName(node.callee) === name) found = true;
    return undefined;
  });

  return found;
}

export const PP_01 = {
  id: 'PP-01',
  title: 'Recursive merge with no key filter',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-1321'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /for\s*\(\s*(const|let|var)?\s*[A-Za-z0-9_$]+\s+in\s+/,
  nodeTypes: ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'],
  match(node, ctx, parent) {
    const name =
      node.id?.name ??
      (parent?.type === 'VariableDeclarator' && parent.id?.type === 'Identifier'
        ? parent.id.name
        : null);

    let hasForIn = false;
    walk(node, (child) => {
      if (child.type === 'ForInStatement') hasForIn = true;
      return undefined;
    });
    if (!hasForIn) return null;

    if (!hasComputedAssignmentToParam(node)) return null;
    if (!callsItself(node, name)) return null;

    // A guard on the key name is the fix, so do not flag code that has one.
    const body = ctx.source.slice(node.start, node.end);
    if (/__proto__|hasOwnProperty|Object\.hasOwn|prototype|Object\.create\(null\)/.test(body)) {
      return null;
    }

    return { node, name: name ?? 'this function' };
  },
  message: (f) =>
    `${f.name} copies every key of one object into another and recurses, with no check on the key name. A payload containing __proto__ writes onto Object.prototype and changes every object in the process.`,
  fix: "for (const key of Object.keys(source)) {\n  if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;\n  // ...\n}",
};

export const PP_02 = {
  id: 'PP-02',
  title: 'Request body merged into a long lived object',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-1321', 'CWE-915'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /Object\.assign|\.\.\.\s*req\./,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (memberName(node.callee) !== 'Object.assign') return null;

    const target = node.arguments[0];
    if (!target) return null;

    // A fresh object literal as the target is the safe shape.
    if (target.type === 'ObjectExpression') return null;

    const source = node.arguments.slice(1).find((arg) => ctx.isTainted(arg));
    if (!source) return null;

    return { node: source, source: ctx.describe(source) };
  },
  message: (f) =>
    `Object.assign copies ${f.source} into an object that outlives the request. Every key comes across, including ones you never meant to accept.`,
  fix: 'const update = pick(req.body, ["displayName", "avatar"]);\nObject.assign(config, update);',
};

const LODASH_DEEP = ['merge', 'mergeWith', 'set', 'setWith', 'defaultsDeep', 'assignInWith'];

export const PP_03 = {
  id: 'PP-03',
  title: 'Deep merge helper with user data',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-1321'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\b(merge|mergeWith|set|setWith|defaultsDeep|assignInWith)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!LODASH_DEEP.includes(method)) return null;

    // Only when it really is the lodash style helper.
    const owner = full.includes('.') ? full.slice(0, full.lastIndexOf('.')) : null;
    const looksLikeLodash =
      owner === null ? /lodash|\bmerge\b/.test(ctx.source) : /^(_|lodash|deepmerge)$/.test(owner);
    if (!looksLikeLodash) return null;

    const tainted = node.arguments.find((arg) => ctx.isTainted(arg));
    if (!tainted) return null;

    return { node: tainted, method, source: ctx.describe(tainted) };
  },
  message: (f) =>
    `${f.method} walks nested keys from ${f.source}. A key of __proto__ or constructor.prototype reaches the prototype chain, and the fix is not a version bump.`,
  fix: 'Validate the shape first with a schema, then copy only the fields you declared.',
};

export const PP_04 = {
  id: 'PP-04',
  title: 'Prototype reached through a computed key',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-1321'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  // The computed assignment shape has no keyword to look for, so the triage
  // pass has to match `something[key] =` as well as the obvious gadget names.
  prefilter: /__proto__|constructor\s*\]|\[\s*['"]constructor|prototype|\[[^\]\n]{1,60}\]\s*=[^=]/,
  nodeTypes: ['AssignmentExpression', 'MemberExpression', 'OptionalMemberExpression'],
  match(node, ctx) {
    if (node.type === 'AssignmentExpression') {
      const left = node.left;
      if (left.type !== 'MemberExpression' && left.type !== 'OptionalMemberExpression') return null;
      if (!left.computed) return null;
      if (!ctx.isTainted(left.property)) return null;

      // A guard on the key kills it.
      const fn = ctx.functionFor(node);
      const body = ctx.source.slice(fn.start ?? 0, fn.end ?? ctx.source.length);
      if (/__proto__|hasOwnProperty|Object\.hasOwn|Object\.create\(null\)|new Map\(/.test(body)) {
        return null;
      }

      return {
        node: left,
        kind: `the key comes from ${ctx.describe(left.property)}`,
      };
    }

    const name = memberName(node);
    if (!name) return null;
    const tail = lastSegment(name);
    if (!DANGEROUS_KEYS.includes(tail)) return null;
    // `constructor` on its own is everywhere in normal code. Only the chain
    // into prototype is worth saying anything about.
    if (tail === 'constructor') return null;
    if (tail === 'prototype' && !/constructor\s*\.\s*prototype/.test(name.replace(/\./g, ' . '))) {
      if (!name.includes('constructor.prototype')) return null;
    }

    return { node, kind: `it writes through ${tail}` };
  },
  message: (f) =>
    `An object property is written where ${f.kind}. Setting __proto__ or constructor.prototype changes every object in the process, not just this one.`,
  fix: "const store = Object.create(null);  // or a Map, which has no prototype to pollute",
};

export default [PP_01, PP_02, PP_03, PP_04];
