// React and Vue rendering traps.
//
// React's own documentation says memoization is an optimization and not a
// semantic guarantee, so there is deliberately no rule here for "missing
// useMemo". Linting for the absence of an optimization produces noise and
// teaches people to wrap everything, which is slower and harder to read.
//
// These three are different: each one is a real defect rather than a missed
// optimization.

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, staticString, isCall } from '../helpers.js';

export const REACT_04 = {
  id: 'REACT-04',
  title: 'New object or function passed to a memoized child',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['jsx', 'tsx'],
  prefilter: /\bmemo\s*\(|React\.memo/,
  nodeTypes: ['JSXOpeningElement'],
  match(node, ctx) {
    const name = node.name?.name;
    // Only components. A div does not have props compared for you.
    if (typeof name !== 'string' || !/^[A-Z]/.test(name)) return null;

    // Only worth saying when this file actually memoizes something, otherwise
    // the advice has no effect.
    if (!/\bmemo\s*\(|React\.memo/.test(ctx.source)) return null;

    for (const attribute of node.attributes ?? []) {
      if (attribute.type !== 'JSXAttribute') continue;
      const value = attribute.value;
      if (value?.type !== 'JSXExpressionContainer') continue;

      const expression = value.expression;
      const isFresh =
        expression?.type === 'ObjectExpression' ||
        expression?.type === 'ArrayExpression' ||
        expression?.type === 'ArrowFunctionExpression' ||
        expression?.type === 'FunctionExpression';

      if (!isFresh) continue;

      return { node: attribute, component: name, prop: attribute.name?.name };
    }

    return null;
  },
  message: (f) =>
    `${f.component} gets a brand new ${f.prop} on every render. memo compares props by identity, so a fresh object or arrow function makes it re-render every time and the memo does nothing.`,
  fix: 'const options = useMemo(() => ({ mode, limit }), [mode, limit]);\nconst onClick = useCallback(() => go(id), [id]);',
};

export const REACT_05 = {
  id: 'REACT-05',
  title: 'List key is the array index',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['jsx', 'tsx'],
  prefilter: /\.map\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full || lastSegment(full) !== 'map') return null;

    const callback = node.arguments[0];
    if (!callback || !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type)) {
      return null;
    }

    // The second parameter of a map callback is the index.
    const indexParam = callback.params[1];
    const indexName = indexParam?.type === 'Identifier' ? indexParam.name : null;

    let problem = null;

    // Only the element the callback returns needs a key. Children of that
    // element are not list items, and checking them flags every <td> in a table.
    walk(callback.body, (child) => {
      if (problem) return false;
      if (child.type !== 'JSXElement') return undefined;

      const opening = child.openingElement;
      const keyAttribute = (opening?.attributes ?? []).find(
        (attribute) => attribute.type === 'JSXAttribute' && attribute.name?.name === 'key',
      );

      if (!keyAttribute) {
        problem = { node: opening ?? child, kind: 'no key at all' };
        return false;
      }

      const value = keyAttribute.value;
      if (value?.type === 'JSXExpressionContainer') {
        const text = ctx.source.slice(value.expression.start, value.expression.end).trim();

        if (indexName && text === indexName) {
          problem = { node: keyAttribute, kind: 'the array index as the key' };
        } else if (/Math\.random|Date\.now/.test(text)) {
          problem = { node: keyAttribute, kind: 'a random key, which changes every render' };
        }
      }

      // Stop here either way: this is the list item, and what is inside it is
      // not a list.
      return false;
    });

    return problem;
  },
  message: (f) =>
    `This list has ${f.kind}. React matches items by key, so when the list reorders or an item is removed it reuses the wrong DOM node, and typed input ends up on the wrong row.`,
  fix: '{items.map((item) => <Row key={item.id} item={item} />)}',
};

const SETTER = /^set[A-Z]/;

export const REACT_07 = {
  id: 'REACT-07',
  title: 'Derived value computed in an effect',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['jsx', 'tsx', 'js', 'ts'],
  prefilter: /useEffect/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full || lastSegment(full) !== 'useEffect') return null;

    const callback = node.arguments[0];
    if (!callback || !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback.type)) {
      return null;
    }

    const body = callback.body;
    if (body?.type !== 'BlockStatement') return null;

    // One statement, and it is a state setter. Anything more and this is a
    // real effect doing real work.
    const statements = body.body.filter((statement) => statement.type !== 'EmptyStatement');
    if (statements.length !== 1) return null;

    const only = statements[0];
    if (only.type !== 'ExpressionStatement' || !isCall(only.expression)) return null;

    const setter = memberName(only.expression.callee);
    if (!setter || !SETTER.test(lastSegment(setter) ?? '')) return null;

    const argument = only.expression.arguments[0];
    if (!argument) return null;

    // Anything asynchronous or external means this really is synchronisation.
    const argumentText = ctx.source.slice(argument.start, argument.end);
    if (/await|fetch\(|axios|subscribe|addEventListener|\.then\(/.test(argumentText)) return null;

    return { node: only, setter: lastSegment(setter) };
  },
  message: (f) =>
    `${f.setter} is called from an effect with a value worked out from props and state. That renders once with the old value, then again with the new one, and chains of these are how render loops start.`,
  fix: 'const total = items.reduce((sum, item) => sum + item.price, 0);  // just compute it during render',
};

export const VUE_04 = {
  id: 'VUE-04',
  title: 'v-for and v-if on the same element',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['vue'],
  target: 'template',
  prefilter: /v-for/,
  matchTemplate(element) {
    const hasFor = element.attributes.some((attribute) => attribute.name.startsWith('v-for'));
    if (!hasFor) return null;

    const conditional = element.attributes.find(
      (attribute) => attribute.name === 'v-if' || attribute.name === 'v-else-if',
    );
    if (!conditional) return null;

    return { offset: conditional.nameStart, tag: element.tagName };
  },
  message: (f) =>
    `<${f.tag}> has both v-for and v-if. In Vue 3 the condition runs for every item, and it cannot see the loop variable, so this is usually both slower and not what was meant.`,
  fix: 'const visible = computed(() => items.value.filter((item) => item.visible));\n<li v-for="item in visible" :key="item.id">',
};

export const VUE_07 = {
  id: 'VUE-07',
  title: 'v-for with no key',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['vue'],
  target: 'template',
  prefilter: /v-for/,
  matchTemplate(element) {
    const loop = element.attributes.find((attribute) => attribute.name.startsWith('v-for'));
    if (!loop) return null;

    const key = element.attributes.find(
      (attribute) => attribute.name === ':key' || attribute.name === 'v-bind:key' || attribute.name === 'key',
    );

    if (!key) return { offset: loop.nameStart, tag: element.tagName, kind: 'no key' };

    // key="index" or :key="index" is the same mistake React makes.
    if (key.value && /^\s*(index|i|idx)\s*$/.test(key.value)) {
      return { offset: key.nameStart, tag: element.tagName, kind: 'the loop index as the key' };
    }

    return null;
  },
  message: (f) =>
    `<${f.tag}> is repeated with v-for and has ${f.kind}. Vue reuses elements by key, so without a stable one it patches the wrong node and component state lands on the wrong row.`,
  fix: '<li v-for="item in items" :key="item.id">',
};

export default [REACT_04, REACT_05, REACT_07, VUE_04, VUE_07];
