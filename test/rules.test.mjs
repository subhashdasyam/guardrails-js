import test from 'node:test';
import assert from 'node:assert/strict';

import { analyze } from '../src/engine/analyze.js';
import { loadConfig } from '../src/engine/config.js';
import { RULES } from '../src/rules/index.js';
import nodeCore from './cases/node-core.js';
import nodeAuth from './cases/node-auth.js';
import nodeDos from './cases/node-dos.js';
import prototypePollution from './cases/prototype-pollution.js';
import react from './cases/react.js';
import vue from './cases/vue.js';
import perf from './cases/perf.js';
import backend from './cases/backend.js';
import frontend from './cases/frontend.js';

const cases = [...nodeCore, ...nodeAuth, ...nodeDos, ...prototypePollution, ...react, ...vue, ...perf, ...backend, ...frontend];

const config = loadConfig('/nonexistent-so-defaults-apply');

function run(code, pkg = null, file = 'src/app.js') {
  const { findings, parseError } = analyze({
    source: code,
    filePath: file,
    config,
    pkg,
    rules: RULES,
    wholeFile: true,
  });
  assert.equal(parseError, undefined, `fixture failed to parse: ${parseError}`);
  return findings.map((finding) => finding.ruleId);
}

test('every rule in the pack has a case', () => {
  const covered = new Set(cases.map((entry) => entry.rule));
  const missing = RULES
    // Manifest rules take a project rather than a source string, so they cannot
    // use this harness. They are covered in supply.test.mjs against real
    // directories, and that file asserts it covers all of them.
    .filter((rule) => rule.target !== 'manifest')
    .map((rule) => rule.id)
    .filter((id) => !covered.has(id));
  assert.deepEqual(missing, [], `rules with no test case: ${missing.join(', ')}`);
});

test('every case has at least two safe lookalikes', () => {
  for (const entry of cases) {
    assert.ok(
      entry.safe.length >= 2,
      `${entry.rule} needs at least two safe cases, has ${entry.safe.length}`,
    );
  }
});

for (const entry of cases) {
  const file = entry.file ?? 'src/app.js';

  test(`${entry.rule} fires on the vulnerable case`, () => {
    const fired = run(entry.fire, entry.pkg ?? null, file);
    assert.ok(
      fired.includes(entry.rule),
      `expected ${entry.rule}, got ${fired.join(', ') || 'nothing'}`,
    );
  });

  entry.safe.forEach((code, index) => {
    test(`${entry.rule} stays quiet on safe case ${index + 1}`, () => {
      // A rule can key off the filename, so a safe case may need a different one.
      const safeFile = entry.safeFiles?.[index] ?? file;
      const fired = run(code, entry.pkg ?? null, safeFile);
      assert.ok(
        !fired.includes(entry.rule),
        `${entry.rule} fired on safe code:\n${code}`,
      );
    });
  });
}

test('rule metadata is complete', () => {
  const severities = new Set(['critical', 'high', 'medium', 'low', 'perf']);

  for (const rule of RULES) {
    assert.match(
      rule.id,
      /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/,
      `${rule.id} does not look like a rule id`,
    );
    assert.ok(rule.title, `${rule.id} has no title`);
    assert.ok(severities.has(rule.severity), `${rule.id} has severity ${rule.severity}`);
    assert.ok(rule.owasp2025, `${rule.id} has no OWASP category`);
    assert.ok(Array.isArray(rule.cwe) && rule.cwe.length > 0, `${rule.id} has no CWE`);
    assert.ok(rule.fix, `${rule.id} has no fix`);
    const matchers = {
      template: rule.matchTemplate,
      markup: rule.matchMarkup,
      manifest: rule.matchManifest,
    };
    const matcher = matchers[rule.target] ?? rule.match;
    assert.ok(
      typeof matcher === 'function',
      `${rule.id} has target ${rule.target ?? 'ast'} but no matching function`,
    );
    assert.match(rule.owasp2025, /^A(0[1-9]|10)$/, `${rule.id} OWASP id looks wrong`);
  }
});

test('rule ids are unique', () => {
  const seen = new Set();
  for (const rule of RULES) {
    assert.ok(!seen.has(rule.id), `duplicate rule id ${rule.id}`);
    seen.add(rule.id);
  }
});

test('a broken rule cannot take the analyzer down', () => {
  const exploding = {
    id: 'BOOM-01',
    title: 'always throws',
    severity: 'high',
    owasp2025: 'A01',
    cwe: ['CWE-0'],
    prefilter: /./,
    nodeTypes: ['CallExpression'],
    match() {
      throw new Error('rule is broken');
    },
    message: () => 'never seen',
    fix: 'n/a',
  };

  const { findings } = analyze({
    source: 'exec("ls " + req.query.x);',
    filePath: 'src/app.js',
    config,
    rules: [exploding, ...RULES],
    wholeFile: true,
  });

  assert.ok(findings.some((finding) => finding.ruleId === 'CMD-01'));
});
