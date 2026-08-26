// Supply chain rules.
//
// These take a project, not a source string, so they get real directories on
// disk rather than the string harness the other rules use. Same requirement:
// one case that must fire and at least two safe lookalikes that must not.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runManifestRules, isManifestFile } from '../src/engine/manifest.js';
import { loadConfig } from '../src/engine/config.js';
import { RULES } from '../src/rules/index.js';
import { allows, evaluateInstall } from '../src/supply-chain/signals.js';
import { BLOCKING_SEVERITIES } from '../src/supply-chain/osv.js';

// The shipped floor is medium. A test harness has to see everything, or a low
// severity rule could never prove that it fires.
const config = {
  ...loadConfig('/nonexistent-so-defaults-apply'),
  minSeverity: 'low',
  performance: 'all',
};

const roots = [];

/** Build a throwaway project. `files` maps a relative path to its contents. */
function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-supply-'));
  roots.push(root);

  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2),
      'utf8',
    );
  }

  return root;
}

function fired(files) {
  return runManifestRules(project(files), config).map((finding) => finding.ruleId);
}

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

// A project that does everything right. Used as the base for the safe cases so
// each one differs from the vulnerable case by exactly the thing being tested.
const CLEAN = {
  'package.json': {
    name: 'clean',
    version: '1.0.0',
    dependencies: { express: '4.19.2' },
    scripts: { verify: 'npm audit signatures', test: 'node --test' },
  },
  'package-lock.json': {
    name: 'clean',
    lockfileVersion: 3,
    packages: { 'node_modules/express': { version: '4.19.2' } },
  },
  '.npmrc': 'ignore-scripts=true\n',
};

test('every manifest rule is covered here', () => {
  const manifestRules = RULES.filter((rule) => rule.target === 'manifest').map((rule) => rule.id);
  const covered = ['SUPPLY-LOCK', 'SUPPLY-SCRIPTS', 'SUPPLY-DENY', 'SUPPLY-PROV'];
  assert.deepEqual(manifestRules.sort(), [...covered].sort());
});

test('a project doing everything right produces nothing', () => {
  assert.deepEqual(fired(CLEAN), []);
});

test('SUPPLY-LOCK fires when there is no lockfile', () => {
  const { 'package-lock.json': _dropped, ...noLock } = CLEAN;
  assert.ok(fired(noLock).includes('SUPPLY-LOCK'));
});

test('SUPPLY-LOCK fires when npmrc turns lockfile writing off', () => {
  assert.ok(
    fired({ ...CLEAN, '.npmrc': 'ignore-scripts=true\npackage-lock=false\n' }).includes(
      'SUPPLY-LOCK',
    ),
  );
});

test('SUPPLY-LOCK stays quiet with a lockfile present', () => {
  assert.ok(!fired(CLEAN).includes('SUPPLY-LOCK'));
});

test('SUPPLY-LOCK stays quiet for a project with no dependencies at all', () => {
  const bare = fired({ 'package.json': { name: 'bare', version: '1.0.0' }, '.npmrc': '' });
  assert.ok(!bare.includes('SUPPLY-SCRIPTS'));
  assert.ok(!bare.includes('SUPPLY-PROV'));
});

test('SUPPLY-SCRIPTS fires when install scripts are not disabled', () => {
  const { '.npmrc': _dropped, ...noNpmrc } = CLEAN;
  assert.ok(fired(noNpmrc).includes('SUPPLY-SCRIPTS'));
});

test('SUPPLY-SCRIPTS stays quiet when npmrc disables them', () => {
  assert.ok(!fired(CLEAN).includes('SUPPLY-SCRIPTS'));
});

test('SUPPLY-SCRIPTS stays quiet when a script passes the flag', () => {
  const files = {
    ...CLEAN,
    '.npmrc': '',
    'package.json': {
      ...CLEAN['package.json'],
      scripts: { ...CLEAN['package.json'].scripts, setup: 'npm ci --ignore-scripts' },
    },
  };
  assert.ok(!fired(files).includes('SUPPLY-SCRIPTS'));
});

test('SUPPLY-DENY fires on a known compromised release in the lockfile', () => {
  const files = {
    ...CLEAN,
    'package-lock.json': {
      name: 'clean',
      lockfileVersion: 3,
      // The September 2025 maintainer takeover.
      packages: { 'node_modules/chalk': { version: '5.6.1' } },
    },
  };

  const findings = runManifestRules(project(files), config);
  const deny = findings.find((finding) => finding.ruleId === 'SUPPLY-DENY');
  assert.ok(deny, 'expected SUPPLY-DENY');
  assert.equal(deny.severity, 'critical');
  assert.match(deny.message, /chalk@5\.6\.1/);
  assert.match(deny.fix, /rotate/i, 'the fix has to say rotate credentials, not just upgrade');
});

test('SUPPLY-DENY fires on a bad exact version pinned in the manifest', () => {
  const { 'package-lock.json': _dropped, ...files } = CLEAN;
  const withBad = {
    ...files,
    'package.json': { ...CLEAN['package.json'], dependencies: { debug: '4.4.2' } },
  };
  assert.ok(fired(withBad).includes('SUPPLY-DENY'));
});

test('SUPPLY-DENY stays quiet on a safe version of a listed package', () => {
  const files = {
    ...CLEAN,
    'package-lock.json': {
      name: 'clean',
      lockfileVersion: 3,
      packages: { 'node_modules/chalk': { version: '5.6.2' } },
    },
  };
  assert.ok(!fired(files).includes('SUPPLY-DENY'));
});

test('SUPPLY-DENY stays quiet on a package that was never compromised', () => {
  assert.ok(!fired(CLEAN).includes('SUPPLY-DENY'));
});

test('SUPPLY-PROV fires when nothing ever verifies signatures', () => {
  const files = {
    ...CLEAN,
    'package.json': { ...CLEAN['package.json'], scripts: { test: 'node --test' } },
  };
  assert.ok(fired(files).includes('SUPPLY-PROV'));
});

test('SUPPLY-PROV stays quiet when a script verifies them', () => {
  assert.ok(!fired(CLEAN).includes('SUPPLY-PROV'));
});

test('SUPPLY-PROV stays quiet when CI verifies them', () => {
  const files = {
    ...CLEAN,
    'package.json': { ...CLEAN['package.json'], scripts: { test: 'node --test' } },
    '.github/workflows/ci.yml': 'jobs:\n  build:\n    steps:\n      - run: npm audit signatures\n',
  };
  assert.ok(!fired(files).includes('SUPPLY-PROV'));
});

test('findings carry the same shape as every other rule', () => {
  const { '.npmrc': _dropped, ...noNpmrc } = CLEAN;
  const [finding] = runManifestRules(project(noNpmrc), config);

  for (const key of ['ruleId', 'title', 'severity', 'owasp2025', 'line', 'message', 'fix', 'filePath']) {
    assert.ok(finding[key] !== undefined, `finding is missing ${key}`);
  }
  assert.equal(finding.owasp2025, 'A03', 'supply chain is A03 in the 2025 list');
  assert.equal(finding.filePath, 'package.json');
});

test('a disabled rule stays disabled', () => {
  const off = loadConfig('/nonexistent');
  off.isRuleDisabled = (id) => id === 'SUPPLY-PROV';
  const ids = runManifestRules(project({ 'package.json': CLEAN['package.json'] }), off).map(
    (finding) => finding.ruleId,
  );
  assert.ok(!ids.includes('SUPPLY-PROV'));
});

test('a directory with no package.json produces nothing', () => {
  assert.deepEqual(runManifestRules(project({ 'readme.md': '# hi' }), config), []);
});

test('the files that trigger a recheck', () => {
  assert.ok(isManifestFile('/a/package.json'));
  assert.ok(isManifestFile('/a/.npmrc'));
  assert.ok(isManifestFile('/a/package-lock.json'));
  assert.ok(isManifestFile('/a/pnpm-lock.yaml'));
  assert.ok(!isManifestFile('/a/index.js'));
  assert.ok(!isManifestFile('/a/package.json.bak'));
});

// Blocking versus prompting.
//
// The npm gate returned permissionDecision "ask" for everything, and an "ask"
// from a hook is not a gate. Claude Code evaluates it alongside the permission
// rules, so an allow rule as ordinary as Bash(npm:*) swallowed it and the
// install ran with nobody told. Verified by installing lodash@4.17.17, which
// carries six advisories: no prompt, no message, package added.
//
// Exit 2 is documented to stop the call before permission rules are read, so
// the cases that must not slip through use that instead. These tests hold the
// line on which cases those are, and on the way back out.

test('a compromised release blocks rather than prompting', () => {
  const install = { subcommand: 'install', packages: ['chalk@5.6.1'], flags: [] };
  const verdict = evaluateInstall(install, { projectRoot: '/nope', known: new Set() });

  assert.equal(verdict.block, true, 'known malware has to survive an allow rule');
  assert.ok(verdict.reasons.some((reason) => /compromised/.test(reason)));
});

test('a clean package neither blocks nor prompts on the denylist signal', () => {
  const install = { subcommand: 'install', packages: ['chalk@5.3.0'], flags: [] };
  const verdict = evaluateInstall(install, { projectRoot: '/nope', known: new Set() });

  assert.equal(verdict.block, false, 'a version that was never compromised is fine');
});

test('allowPackages is the way past a block, since nothing else is', () => {
  const install = { subcommand: 'install', packages: ['chalk@5.6.1'], flags: [] };

  const byVersion = evaluateInstall(install, {
    projectRoot: '/nope',
    known: new Set(),
    allowPackages: ['chalk@5.6.1'],
  });
  assert.equal(byVersion.block, false, 'an exact pin should be respected');

  const byName = evaluateInstall(install, {
    projectRoot: '/nope',
    known: new Set(),
    allowPackages: ['chalk'],
  });
  assert.equal(byName.block, false, 'a bare name covers every version of it');

  // Still worth saying out loud. Allowing it silences the block, not the reason.
  assert.ok(byName.reasons.some((reason) => /compromised/.test(reason)));
});

test('allows matches a name or an exact version, and nothing else', () => {
  assert.ok(allows(['lodash'], 'lodash', '4.17.17'));
  assert.ok(allows(['lodash@4.17.17'], 'lodash', '4.17.17'));
  assert.ok(!allows(['lodash@4.17.21'], 'lodash', '4.17.17'), 'a different pin must not match');
  assert.ok(!allows(['lodash-es'], 'lodash', '4.17.17'), 'no prefix or partial matching');
  assert.ok(!allows([], 'lodash', '4.17.17'));
  assert.ok(!allows(undefined, 'lodash', '4.17.17'), 'an absent list is not an allow list');
});

test('the severities that block are the ones with somewhere to upgrade to', () => {
  // Only advisories with a reachable fix reach this set, so blocking always
  // leaves an action available. Widening it to MODERATE would block installs
  // whose only remedy is to not install.
  assert.ok(BLOCKING_SEVERITIES.has('CRITICAL'));
  assert.ok(BLOCKING_SEVERITIES.has('HIGH'));
  assert.ok(!BLOCKING_SEVERITIES.has('MODERATE'));
  assert.ok(!BLOCKING_SEVERITIES.has('LOW'));
});
