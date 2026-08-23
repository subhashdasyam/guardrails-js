// Vue template scanner parity.
//
// The plugin does not ship the real Vue compiler. It uses a small attribute
// scanner instead, because @vue/compiler-dom is 1248 KB bundled and costs about
// 30 ms to load, against 727 KB and 20 ms for the entire plugin today. Adding it
// would nearly triple the bundle for rules that only ever read attribute names.
//
// That trade is only defensible while the scanner actually agrees with the real
// parser. So the real parser is a dev dependency, never shipped, and this test
// holds the two against each other on the cases most likely to break a hand
// written scanner. If the scanner ever starts missing things, this says so, and
// then the 1248 KB becomes worth paying.
//
// The two must agree on which elements carry the attributes the rules care
// about. They are not expected to agree on anything else: the real parser builds
// a full AST with expression parsing, and the scanner deliberately does not.

import test from 'node:test';
import assert from 'node:assert/strict';

import { parse } from '@vue/compiler-dom';
import { scanTemplate, bindingName } from '../src/engine/vue-template.js';

// Everything the Vue rules key off.
const INTERESTING = new Set(['v-html', 'href', 'src', 'key', 'v-for', 'v-if']);

const CASES = {
  'plain v-html': '<template><div v-html="body"/></template>',

  'nested elements of the same tag': '<template><div><div v-html="body"/></div></template>',

  // A greater than sign inside a quoted value must not end the tag.
  'greater than inside a quoted value': '<template><img alt="a > b" :src="u.url"/></template>',

  // A less than sign inside an expression must not look like a new tag.
  'less than inside an expression':
    `<template><div :class="a < b ? 'x' : 'y'" v-html="body"/></template>`,

  // A less than sign in text is the case most likely to desynchronise a scanner.
  'less than inside a text node': '<template><p>{{ a < b }}</p><div v-html="body"/></template>',

  // Neither parser can resolve a dynamic name, so neither should claim to.
  'dynamic attribute name': '<template><a :[attr]="v" v-html="body">x</a></template>',

  'attributes across several lines': '<template><div\n  class="a"\n  v-html="body"\n/></template>',

  'quotes inside an expression':
    `<template><a :href="a ? 'javascript:x' : url">y</a></template>`,

  'a comment containing a tag':
    '<template><!-- <div v-html="fake"/> --><div v-html="real"/></template>',

  'self closing component':
    '<template><My-Comp :href="item.url"/><div v-html="body"/></template>',

  'slot shorthand': '<template><Row #default="{ item }" :href="item.url"/></template>',

  'v-for beside v-if':
    '<template><li v-for="i in items" v-if="i.ok" :key="i.id">{{i.n}}</li></template>',

  'v-for with no key': '<template><li v-for="i in items">{{i.n}}</li></template>',

  'unquoted attribute value': '<template><div v-html=body /></template>',

  'escaped markup inside pre':
    '<template><pre>&lt;div v-html="x"/&gt;</pre><div v-html="body"/></template>',

  'object literal spanning lines in a value':
    '<template><div :class="{\n a: true\n}" v-html="body"/></template>',

  'multiple roots': '<template><div v-html="a"/><div v-html="b"/></template>',

  'deeply nested': '<template><a><b><c><div v-html="body"/></c></b></a></template>',
};

/** What the real Vue parser says, reduced to the attributes the rules use. */
function reference(source) {
  const inner = source.replace(/^<template>/, '').replace(/<\/template>$/, '');
  const ast = parse(inner);
  const found = [];

  const walk = (node) => {
    if (node.type === 1) {
      for (const prop of node.props ?? []) {
        // Type 7 is a directive, type 6 is a plain attribute.
        const raw =
          prop.type === 7
            ? prop.name === 'bind'
              ? (prop.arg?.content ?? '[dynamic]')
              : `v-${prop.name}`
            : prop.name;
        const name = bindingName(raw);
        if (INTERESTING.has(name)) found.push(`${node.tag}:${name}`);
      }
    }
    for (const child of node.children ?? []) walk(child);
  };

  walk(ast);
  return found.sort();
}

/** What the shipped scanner says, reduced the same way. */
function scanner(source) {
  const found = [];

  for (const element of scanTemplate(source)) {
    for (const attribute of element.attributes) {
      const name = bindingName(attribute.name);
      if (INTERESTING.has(name)) found.push(`${element.tagName}:${name}`);
    }
  }

  return found.sort();
}

for (const [name, source] of Object.entries(CASES)) {
  test(`scanner matches the real Vue parser: ${name}`, () => {
    assert.deepEqual(
      scanner(source),
      reference(source),
      'the scanner disagrees with @vue/compiler-dom. Either fix the scanner, or if this ' +
        'is a shape it genuinely cannot handle, that is the signal to ship the real parser.',
    );
  });
}

test('the reference parser is a dev dependency and is never shipped', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  assert.ok(
    pkg.devDependencies['@vue/compiler-dom'],
    'the reference parser has to be installed for this test to mean anything',
  );
  assert.equal(
    Object.keys(pkg.dependencies ?? {}).length,
    0,
    'the plugin ships with no runtime dependencies at all',
  );

  const bundle = readFileSync(new URL('../dist/post-write.mjs', import.meta.url), 'utf8');
  assert.ok(
    !bundle.includes('@vue/compiler-dom'),
    'the reference parser must not reach the shipped bundle',
  );
});
