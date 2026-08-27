// The npm gate, end to end, through the built hook.
//
// These spawn dist/pre-bash.mjs the way Claude Code does, because the bug that
// prompted them lived in main() rather than in any unit underneath it. There
// were two advisory lookups: the first ran only when nothing else had already
// decided to prompt, and the second skipped pinned packages on the assumption
// the first had covered them. So one offline signal firing was enough to make a
// pinned version fall through the gap between them, unqueried and unmentioned.
//
//   npm install expres lodash@4.17.10           <- CRITICAL, installed silently
//   npm install lodash@4.17.10 --prefix <dir>   <- CRITICAL, installed silently
//
// Every package here is invented and every advisory is seeded into the cache, so
// nothing touches the network. That is also what makes these honest: a real
// registry could never answer for "guardrails-fake-pkg", so if the cache is not
// being read, the assertions fail rather than quietly passing on live data.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hook = path.join(root, 'dist', 'pre-bash.mjs');

const PKG = 'guardrails-fake-pkg';
const BAD = '1.0.0';
const ADVISORY = 'GHSA-fake-0000-test';
const MILD = 'guardrails-fake-mild';
const MILD_ADVISORY = 'GHSA-fake-1111-mild';

/** A cache directory holding one invented package with one CRITICAL advisory. */
function seedCache() {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-prebash-'));
  const dir = path.join(data, 'cache');
  fs.mkdirSync(dir, { recursive: true });

  const write = (key, value) =>
    fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify({ at: Date.now(), value }));

  write(`npm-${PKG}`, {
    exists: true,
    latest: '1.0.2',
    created: '2020-01-01T00:00:00.000Z',
    latestPublished: '2020-01-01T00:00:00.000Z',
    ageDays: 2000,
    versionCount: 3,
    repository: 'git+https://example.invalid/repo.git',
    deprecated: false,
  });

  // Fixed in 1.0.1, which is at or below the latest published 1.0.2, so the fix
  // is reachable and the advisory is one worth blocking on.
  write(`osvfull-${PKG}@${BAD}`, [{ id: ADVISORY, severity: 'CRITICAL', fixed: ['1.0.1'] }]);
  write(`osvfull-${PKG}@1.0.2`, []);

  // A second invented package whose worst advisory is only MODERATE, so it can
  // prove the severity split rather than the severity mapping being assumed.
  write(`npm-${MILD}`, {
    exists: true,
    latest: '2.0.2',
    created: '2020-01-01T00:00:00.000Z',
    latestPublished: '2020-01-01T00:00:00.000Z',
    ageDays: 2000,
    versionCount: 3,
    repository: 'git+https://example.invalid/mild.git',
    deprecated: false,
  });
  write(`osvfull-${MILD}@2.0.0`, [{ id: MILD_ADVISORY, severity: 'MODERATE', fixed: ['2.0.1'] }]);

  return data;
}

/** A project directory, optionally carrying a .guardrails-js.json. */
function project(config, dependencies) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-proj-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'p', version: '1.0.0', ...(dependencies ? { dependencies } : {}) }),
  );
  fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ name: 'p', packages: {} }));
  if (config) fs.writeFileSync(path.join(dir, '.guardrails-js.json'), JSON.stringify(config));
  return dir;
}

function runHook(command, { config, dependencies } = {}) {
  const cwd = project(config, dependencies);
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      cwd,
      tool_input: { command },
    }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_DATA: seedCache() },
  });

  return { code: result.status, stderr: result.stderr ?? '', stdout: result.stdout ?? '' };
}

test('a pinned critical blocks on its own', () => {
  const { code, stderr } = runHook(`npm install ${PKG}@${BAD}`);

  assert.equal(code, 2, 'exit 2 is the only signal an allow rule cannot swallow');
  assert.match(stderr, new RegExp(ADVISORY));
});

test('a pinned critical still blocks when a typosquat already raised a prompt', () => {
  // "expres" trips an offline signal, which used to skip the pinned lookup
  // entirely and let the critical through on the strength of the prompt beside it.
  const { code, stderr } = runHook(`npm install expres ${PKG}@${BAD}`);

  assert.equal(code, 2, 'another package flagging must not excuse this one');
  assert.match(stderr, new RegExp(ADVISORY), 'the advisory has to be named, not just counted');
});

test('a pinned critical still blocks when a path argument already raised a prompt', () => {
  // --prefix reads as a path specifier, which is its own offline signal.
  const { code, stderr } = runHook(`npm install ${PKG}@${BAD} --prefix /tmp/somewhere`);

  assert.equal(code, 2);
  assert.match(stderr, new RegExp(ADVISORY));
});

test('a clean version is silent, prompt or no prompt', () => {
  assert.equal(runHook(`npm install ${PKG}@1.0.2`).code, 0);
});

test('allowPackages turns a block back into a prompt', () => {
  const { code, stdout } = runHook(`npm install expres ${PKG}@${BAD}`, {
    config: { allowPackages: [`${PKG}@${BAD}`] },
  });

  assert.equal(code, 0, 'allowed means not blocked');
  assert.match(stdout, /"permissionDecision":"ask"/, 'but still worth asking about');
  assert.match(stdout, new RegExp(ADVISORY), 'and still worth saying why');
});

test('a redirection cannot hide the package behind it', () => {
  // `&` was read as the background operator inside 2>&1, which split the
  // command and left the package in a segment whose command was "1". Nothing
  // examined it, so a CRITICAL walked through the gate untouched.
  const { code, stderr } = runHook(`npm install 2>&1 ${PKG}@${BAD}`);

  assert.equal(code, 2, 'argument order must not decide whether the gate runs');
  assert.match(stderr, new RegExp(ADVISORY));
});

test('a redirection on a clean install says nothing at all', () => {
  // 2>/dev/null has a slash and no leading @, so it parsed as a git or URL
  // install and prompted for permission on a command with nothing wrong with
  // it. A gate that cries wolf on `npm install express 2>/dev/null` teaches
  // people to approve without reading.
  for (const command of [
    'npm install express 2>/dev/null',
    'npm install express 2>&1',
    'npm install express > out.log',
  ]) {
    const { code, stdout } = runHook(command);
    assert.equal(code, 0, `${command} should not block`);
    assert.doesNotMatch(stdout, /permissionDecision/, `${command} should not prompt`);
  }
});

test('network false stops the lookup, so nothing blocks on an advisory', () => {
  const { code } = runHook(`npm install ${PKG}@${BAD}`, { config: { network: false } });

  assert.equal(code, 0, 'opting out of the network opts out of advisory blocking');
});

// The manifest, rather than the command line.
//
// A package.json pinning six outdated versions, two of them carrying a CRITICAL,
// produced one generic note about install scripts and nothing else. The advisory
// lookup only ever ran on specifiers parsed off the command line, and the four
// manifest rules do not fill the gap: SUPPLY-DENY is the only one that reads
// versions and it matches releases known to have shipped malware, which an
// ordinary CVE will never be.
//
// The install side had the matching hole. `npm install` with no arguments names
// no packages, so the whole declared tree went through unexamined, and that is
// the most common install command there is.

const writeHook = path.join(root, 'dist', 'post-write.mjs');

function runWrite({ config, dependencies }) {
  const cwd = project(config, dependencies);
  const result = spawnSync(process.execPath, [writeHook], {
    input: JSON.stringify({
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      cwd,
      tool_input: { file_path: path.join(cwd, 'package.json') },
    }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PLUGIN_DATA: seedCache() },
  });

  return { code: result.status, stderr: result.stderr ?? '', stdout: result.stdout ?? '' };
}

test('writing a manifest that pins a critical wakes Claude to fix it', () => {
  const { code, stderr } = runWrite({ dependencies: { [PKG]: BAD } });

  assert.equal(code, 2, 'critical in a manifest is worth interrupting for');
  assert.match(stderr, new RegExp(ADVISORY));
  assert.match(stderr, /SUPPLY-CVE/);
});

test('a moderate advisory is a note, not an interruption', () => {
  const { code, stdout } = runWrite({ dependencies: { [MILD]: '2.0.0' } });

  assert.equal(code, 0, 'not everything with an advisory is worth stopping for');
  assert.match(stdout, new RegExp(MILD_ADVISORY), 'but it still gets said');
});

test('a range is not a pin, so it is not reported', () => {
  // ^1.0.0 installs the newest 1.x, which is past the advisory. Reporting it
  // would fire on the most common way to declare a dependency.
  for (const range of ['^1.0.0', '~1.0.0', '>=1.0.0', 'latest', '*']) {
    const { code, stderr, stdout } = runWrite({ dependencies: { [PKG]: range } });
    assert.notEqual(code, 2, `${range} must not be treated as a pinned version`);
    assert.doesNotMatch(stderr + stdout, new RegExp(ADVISORY), `${range} should not be flagged`);
  }
});

test('allowPackages covers the manifest too', () => {
  const { code, stderr } = runWrite({
    dependencies: { [PKG]: BAD },
    config: { allowPackages: [`${PKG}@${BAD}`] },
  });

  assert.equal(code, 0, 'an allowed pin must not keep interrupting');
  assert.doesNotMatch(stderr, new RegExp(ADVISORY));
});

test('network false stops the manifest lookup as well', () => {
  const { code, stderr } = runWrite({
    dependencies: { [PKG]: BAD },
    config: { network: false },
  });

  assert.notEqual(code, 2);
  assert.doesNotMatch(stderr, new RegExp(ADVISORY));
});

test('bare npm install reports what it is about to install', () => {
  const { code, stdout } = runHook('npm install', { dependencies: { [PKG]: BAD } });

  assert.equal(code, 0, 'never block: the manifest is already committed, so this strands nobody');
  assert.match(stdout, new RegExp(ADVISORY), 'but say what is coming');
});

test('bare npm install is silent on a clean manifest', () => {
  const { code, stdout } = runHook('npm install', { dependencies: { [PKG]: '1.0.2' } });

  assert.equal(code, 0);
  assert.doesNotMatch(stdout, new RegExp(ADVISORY));
});
