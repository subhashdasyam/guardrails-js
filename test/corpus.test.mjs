// The false positive gate.
//
// Every file under test/corpus is correct code. Any finding here fails the
// build. This is the test that stops the rule set turning into noise, which is
// the failure mode that gets a plugin uninstalled.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from '../src/engine/analyze.js';
import { loadConfig } from '../src/engine/config.js';
import { RULES } from '../src/rules/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const corpusDir = path.join(here, 'corpus');
const config = loadConfig('/nonexistent-so-defaults-apply');

const pkg = {
  dependencies: {
    express: '^4.19.2',
    react: '^18.3.1',
    vue: '^3.4.0',
    'js-yaml': '^4.1.0',
    '@prisma/client': '^5.0.0',
  },
};

const files = fs.readdirSync(corpusDir).filter((name) => !name.startsWith('.'));

test('the corpus is not empty', () => {
  assert.ok(files.length >= 4, 'expected at least four clean files');
});

for (const name of files) {
  test(`clean file produces no findings: ${name}`, () => {
    const source = fs.readFileSync(path.join(corpusDir, name), 'utf8');
    const { findings, parseError } = analyze({
      source,
      filePath: `test/corpus/${name}`,
      config,
      pkg,
      rules: RULES,
      wholeFile: true,
    });

    assert.equal(parseError, undefined, `corpus file failed to parse: ${parseError}`);

    const report = findings
      .map((finding) => `  ${finding.ruleId} line ${finding.line}: ${finding.evidence}`)
      .join('\n');

    assert.equal(findings.length, 0, `false positives in ${name}:\n${report}`);
  });
}
