import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildDatabase, validateSnapshot, maliciousRecords, download } from '../src/threat/importer.js';
import { affectedBy, lookupThreats } from '../src/threat/store.js';
import { openDatabase } from '../src/threat/sqlite.js';
import { refresh, activate, failedRoute, routes } from '../src/threat/updater.js';
import { maintainThreatData } from '../src/threat/maintenance.js';
import { dataRoot, writeJson, readJson, snapshot, DAY, lock } from '../src/threat/paths.js';
import { loadConfig } from '../src/engine/config.js';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-threat-test-'));
const original = { ...process.env };
test.after(() => { process.env = original; fs.rmSync(temp, { recursive: true, force: true }); });
test.beforeEach(t => {
  process.env.CLAUDE_PLUGIN_DATA = path.join(temp, t.name.replace(/[^a-z0-9]/gi, '-'));
  delete process.env.GUARDRAILS_THREAT_SNAPSHOT;
  process.env.GUARDRAILS_THREAT_MAINTENANCE = 'off';
});

const advisory = (extra = {}) => ({ id: 'MAL-2026-test', summary: 'Malicious code in sample',
  affected: [{ package: { ecosystem: 'npm', name: 'sample' }, versions: ['1.0.0'],
    ranges: [{ type: 'SEMVER', events: [{ introduced: '2.0.0' }, { fixed: '2.0.3' }, { introduced: '3.0.0' }, { last_affected: '3.0.1' }] }] }], ...extra });
const fixture = path.join(temp, 'fixture');
test.before(async () => { await buildDatabase({ output: fixture, advisories: [advisory()], sourceUpdated: new Date().toISOString() }); });

test('both backends read the same SQLite format and query its package index', async () => {
  const metadata = await validateSnapshot(fixture);
  assert.equal(metadata.schemaVersion, 1);
  const records = await lookupThreats(['sample', 'chalk', 'absent'], path.join(fixture, 'threat-data.db'));
  assert.equal(records.unavailable, undefined);
  assert.equal(records.get('sample')[0].id, 'MAL-2026-test');
  assert.equal(records.get('chalk')[0].versions.includes('5.6.1'), true);
  assert.equal(records.has('absent'), false);
  const db = await openDatabase(path.join(fixture, 'threat-data.db'));
  try {
    assert.match((await db.all("EXPLAIN QUERY PLAN SELECT record FROM threats WHERE name='sample'"))[0].detail, /SEARCH.*PRIMARY KEY/);
    await assert.rejects(db.run("DELETE FROM threats"), /readonly|read-only/i);
  } finally { await db.close(); }
});

test('version matching respects fixed releases, multiple intervals, prereleases and explicit versions', () => {
  const record = maliciousRecords(advisory())[0];
  for (const version of ['1.0.0', '2.0.0', '2.0.2', '3.0.0', '3.0.1']) assert.equal(affectedBy(record, version), true, version);
  for (const version of ['1.0.1', '2.0.3', '2.9.9', '3.0.2', '3.0.0-beta.1']) assert.equal(affectedBy(record, version), false, version);
  assert.equal(affectedBy({ versions: [], ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }] }] }, '99.0.0'), true);
  assert.equal(affectedBy({ versions: [], ranges: [] }, '1.0.0'), false);
});

test('withdrawn and ordinary vulnerability reports do not become malware', () => {
  assert.deepEqual(maliciousRecords(advisory({ withdrawn: '2026-01-01' })), []);
  assert.deepEqual(maliciousRecords(advisory({ id: 'GHSA-test', summary: 'A malicious user can bypass authentication' })), []);
  assert.equal(maliciousRecords(advisory({ id: 'GHSA-test', summary: 'Malicious code in sample' })).length, 1);
});

test('a fresh replacement removes withdrawn automated records but preserves curated entries', async () => {
  const dir = path.join(temp, 'withdrawn');
  await buildDatabase({ output: dir, advisories: [advisory({ withdrawn: '2026-01-01' })], sourceUpdated: new Date().toISOString() });
  const records = await lookupThreats(['sample', 'chalk'], path.join(dir, 'threat-data.db'));
  assert.equal(records.has('sample'), false);
  assert.equal(records.has('chalk'), true);
});

test('activation validates checksums and retains the last working snapshot after corruption', async () => {
  await activate(fixture);
  const previous = snapshot();
  const dir = path.join(temp, 'corrupt');
  fs.cpSync(fixture, dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'threat-data.db'), 'corruption');
  await assert.rejects(activate(dir), /checksum|size/);
  assert.equal(snapshot().file, previous.file);
  assert.equal((await lookupThreats(['sample'])).has('sample'), true);
});

test('route failures persist across invocations and skip blocked downloads next time', async () => {
  const now = Date.now();
  const calls = [];
  const handlers = {
    download: async () => { calls.push('download'); throw new Error('HTTP 403'); },
    clone: async () => { calls.push('clone'); return fixture; },
    sources: async () => { calls.push('sources'); return fixture; },
  };
  const options = { handlers, install: async () => {}, accept: async () => ({ sourceUpdated: new Date().toISOString() }) };
  await refresh({ ...options, now });
  assert.deepEqual(calls, ['download', 'clone']);
  assert.equal(readJson(path.join(dataRoot(), 'update-state.json')).routes.download.nextRetry, now + 7 * DAY);
  await refresh({ ...options, now: now + 1000 });
  assert.equal(calls.length, 2, 'daily success check should suppress another update');
  await refresh({ ...options, now: now + DAY + 1 });
  assert.deepEqual(calls, ['download', 'clone', 'clone']);
  await refresh({ ...options, now: now + DAY + 2, force: true });
  assert.deepEqual(calls.slice(-2), ['download', 'clone']);
});

test('clone failure falls back to a local source build and retains the old DB if all fail', async () => {
  await activate(fixture);
  const before = snapshot();
  const calls = [];
  let working = true;
  const handlers = Object.fromEntries(['download', 'clone', 'sources'].map(name => [name, async () => {
    calls.push(name);
    if (name === 'sources' && working) return fixture;
    throw new Error('Network unavailable');
  }]));
  await refresh({ handlers, install: async () => {} });
  assert.deepEqual(calls, ['download', 'clone', 'sources']);
  working = false;
  const state = await refresh({ handlers, install: async () => {}, force: true });
  assert.match(state.error, /All eligible/);
  assert.equal(snapshot().file, before.file);
  assert.ok(state.nextCheck > Date.now());
});

test('setup failures back off and an update lock prevents concurrent work', async () => {
  const release = lock(path.join(dataRoot(), 'update.lock'));
  assert.deepEqual(await refresh(), { busy: true });
  release();
  const state = await refresh({ install: async () => { throw new Error('compiler unavailable'); } });
  assert.match(state.error, /compiler unavailable/);
  assert.ok(state.nextCheck >= Date.now() + DAY - 1000);
});

test('data age uses the source timestamp and warnings are issued at most once daily', () => {
  const now = Date.now();
  const dir = path.join(temp, 'stale');
  fs.mkdirSync(dir);
  fs.copyFileSync(path.join(fixture, 'threat-data.db'), path.join(dir, 'threat-data.db'));
  writeJson(path.join(dir, 'manifest.json'), { sourceUpdated: new Date(now - 8 * DAY).toISOString(), builtAt: new Date(now).toISOString() });
  process.env.GUARDRAILS_THREAT_SNAPSHOT = dir;
  delete process.env.GUARDRAILS_THREAT_MAINTENANCE;
  const config = { network: false };
  const first = maintainThreatData(config, { now });
  assert.match(first, /8 days old/);
  assert.match(first, /git clone --depth 1 --single-branch --branch threat-data/);
  assert.match(first, /import .\/guardrails-threat-data/);
  assert.equal(maintainThreatData(config, { now: now + 100 }), '');
  assert.match(maintainThreatData(config, { now: now + DAY }), /9 days old/);
  assert.equal(fs.existsSync(path.join(dataRoot(), 'launch.json')), false, 'network:false must prevent background downloads');
});

test('unavailable database produces an explicit status, never an empty clean verdict', async () => {
  const result = await lookupThreats(['sample'], path.join(temp, 'missing.db'));
  assert.ok(result.unavailable);
  assert.ok(readJson(path.join(dataRoot(), 'store-error.json')).error);
});

test('stale publications are rejected rather than resetting the freshness clock', async () => {
  const output = path.join(temp, 'old');
  await buildDatabase({ output, advisories: [advisory()], sourceUpdated: '2020-01-01' });
  await assert.rejects(activate(output), /older|seven days/);
});

test('HTTP downloads enforce status and size limits', async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('blocked', { status: 403 });
    await assert.rejects(download('https://example.test/db', path.join(temp, 'download')), /HTTP 403/);
    globalThis.fetch = async () => new Response('too large', { headers: { 'content-length': '9999' } });
    await assert.rejects(download('https://example.test/db', path.join(temp, 'download'), { maxBytes: 10 }), /size limit/);
  } finally { globalThis.fetch = oldFetch; }
});

test('unchanged GitHub manifest reuses the database without downloading it again', async () => {
  await activate(fixture);
  const oldFetch = globalThis.fetch;
  const urls = [];
  const dir = path.join(temp, 'unchanged');
  fs.mkdirSync(dir);
  try {
    globalThis.fetch = async url => { urls.push(url); return new Response(fs.readFileSync(path.join(fixture, 'manifest.json'))); };
    await routes.download(dir);
    assert.equal(urls.length, 1);
    assert.equal((await validateSnapshot(dir)).sha256, snapshot().metadata.sha256);
  } finally { globalThis.fetch = oldFetch; }
});

test('hook notices share one valid JSON response with existing findings', () => {
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import {queueHookNotice, emitAdditionalContext} from './src/hooks/util.js';
    queueHookNotice('PostToolUse', 'database is old');
    emitAdditionalContext('PostToolUse', 'existing finding');
  `], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const payload = JSON.parse(run.stdout);
  assert.match(payload.hookSpecificOutput.additionalContext, /database is old/);
  assert.match(payload.hookSpecificOutput.additionalContext, /existing finding/);
});

test('transient failures retry sooner than persistent blocking', () => {
  const now = Date.now();
  assert.equal(failedRoute(null, new Error('timeout'), now).nextRetry, now + 3_600_000);
  assert.equal(failedRoute(null, new Error('HTTP 403'), now).nextRetry, now + 7 * DAY);
});

test('default network and daily refresh launch a worker, with no duplicate spawn within a minute', () => {
  const config = loadConfig('/nonexistent-guardrails-config');
  assert.equal(config.network, true);
  assert.equal(config.threatDataAutoRefresh, true);
  assert.equal(config.threatDataRefreshHours, 24);
  delete process.env.GUARDRAILS_THREAT_MAINTENANCE;
  const calls = [];
  const launch = (...args) => { calls.push(args); return { on() {}, unref() {} }; };
  const now = Date.now();
  maintainThreatData(config, { now, launch });
  maintainThreatData(config, { now: now + 1000, launch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].detached, true);
  assert.equal(calls[0][2].stdio, 'ignore');
  writeJson(path.join(dataRoot(), 'update-state.json'), { nextCheck: now + DAY });
  maintainThreatData(config, { now: now + 120_000, launch });
  assert.equal(calls.length, 1);
});

test('a partial snapshot left by an interrupted copy is repaired on the next import', async () => {
  const metadata = readJson(path.join(fixture, 'manifest.json'));
  const dir = path.join(dataRoot(), 'snapshots', metadata.sha256);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'threat-data.db'), 'incomplete');
  await activate(fixture);
  assert.equal((await lookupThreats(['sample'])).has('sample'), true);
});
