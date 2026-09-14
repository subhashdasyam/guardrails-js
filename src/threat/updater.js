import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DAY, dataRoot, DATA_URL, REPOSITORY, readJson, writeJson, lock, snapshot } from './paths.js';
import { ensureDriver } from './sqlite.js';
import { download, validateSnapshot, buildFromSources, sha256 } from './importer.js';

const exec = promisify(execFile);
export function failedRoute(previous, error, now) {
  const failures = (previous?.failures || 0) + 1;
  const blocked = /HTTP (401|403|404|451)|ENOTFOUND|certificate|not found/i.test(error.message);
  return { failures, lastAttempt: now, error: error.message.slice(0, 400),
    nextRetry: now + (blocked || failures >= 3 ? 7 * DAY : Math.min(DAY, 3_600_000 * 2 ** (failures - 1))) };
}

export async function activate(dir, { allowOlder = false } = {}) {
  const metadata = await validateSnapshot(dir);
  const release = lock(path.join(dataRoot(), 'activation.lock'), 60_000);
  if (!release) throw new Error('Another threat database activation is in progress');
  try {
  const old = snapshot().metadata;
  if (!allowOlder && old && Date.parse(metadata.sourceUpdated) < Date.parse(old.sourceUpdated)) throw new Error('Refusing an older threat database');
  if (Date.now() - Date.parse(metadata.sourceUpdated) > 7 * DAY) throw new Error('Published threat database is more than seven days old');
  const destination = path.join(dataRoot(), 'snapshots', metadata.sha256);
  fs.mkdirSync(destination, { recursive: true });
  const file = path.join(destination, 'threat-data.db');
  if (!fs.existsSync(file) || await sha256(file) !== metadata.sha256) {
    const temp = `${file}.${process.pid}.tmp`;
    fs.copyFileSync(path.join(dir, 'threat-data.db'), temp);
    fs.renameSync(temp, file);
  }
  writeJson(path.join(destination, 'manifest.json'), metadata);
  // Snapshot files are immutable. Updating this small pointer also works on
  // Windows while another hook has the previous database open.
  writeJson(path.join(dataRoot(), 'active.json'), metadata);
  try { fs.unlinkSync(path.join(dataRoot(), 'store-error.json')); } catch {}
  // Keep the active and previous snapshots. Older files get a day of grace
  // for readers; Windows may retain open files until a later update.
  const snapshots = path.dirname(destination);
  for (const name of fs.readdirSync(snapshots)) {
    if (!/^[a-f0-9]{64}$/.test(name) || name === metadata.sha256 || name === old?.sha256) continue;
    const obsolete = path.join(snapshots, name);
    try {
      if (Date.now() - fs.statSync(obsolete).mtimeMs > DAY) fs.rmSync(obsolete, { recursive: true });
    } catch {}
  }
  return metadata;
  } finally { release(); }
}

export const routes = {
  async download(dir) {
    await download(`${DATA_URL}/manifest.json`, path.join(dir, 'manifest.json'), { maxBytes: 64_000, timeout: 15_000 });
    const manifest = readJson(path.join(dir, 'manifest.json'));
    if (!manifest || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Invalid remote manifest');
    const current = snapshot();
    if (current.metadata?.sha256 === manifest.sha256 && fs.existsSync(current.file)) {
      fs.copyFileSync(current.file, path.join(dir, 'threat-data.db'));
      return dir;
    }
    await download(`${DATA_URL}/threat-data.db`, path.join(dir, 'threat-data.db'));
    return dir;
  },
  async clone(dir) {
    const target = path.join(dir, 'repo');
    const noHooks = path.join(dir, 'no-hooks');
    fs.mkdirSync(noHooks);
    await exec('git', ['-c', `core.hooksPath=${noHooks}`, 'clone', '--depth', '1', '--single-branch', '--branch', 'threat-data', REPOSITORY, target], {
      timeout: 120_000, maxBuffer: 1_000_000, windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' },
    });
    return target;
  },
  async sources(dir) { await buildFromSources(dir); return dir; },
};

// Dependency injection keeps failure/backoff tests independent of public APIs.
export async function refresh({ force = false, interval = DAY, now = Date.now(), handlers = routes, install = ensureDriver, accept = activate } = {}) {
  const root = dataRoot();
  const release = lock(path.join(root, 'update.lock'));
  if (!release) return { busy: true };
  const stateFile = path.join(root, 'update-state.json');
  const state = readJson(stateFile, { routes: {} });
  state.routes ||= {};
  try {
    if (!force && now < (state.nextCheck || 0)) return state;
    if (force) state.routes = {};
    try { await install({ force }); } catch (error) {
      state.error = `SQLite setup failed: ${error.message.slice(0, 400)}`;
      state.nextCheck = now + DAY;
      writeJson(stateFile, state);
      return state;
    }
    for (const name of ['download', 'clone', 'sources']) {
      if (!force && now < (state.routes[name]?.nextRetry || 0)) continue;
      const dir = fs.mkdtempSync(path.join(root, 'staging-'));
      try {
        const output = await handlers[name](dir);
        const metadata = await accept(output);
        state.routes[name] = { lastAttempt: now, lastSuccess: now, failures: 0 };
        state.lastSuccess = now;
        state.source = name;
        state.sourceUpdated = metadata.sourceUpdated;
        state.nextCheck = now + interval;
        delete state.error;
        writeJson(stateFile, state);
        return state;
      } catch (error) {
        state.routes[name] = failedRoute(state.routes[name], error, now);
        writeJson(stateFile, state);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    state.error = 'All eligible threat data update routes failed';
    state.nextCheck = Math.min(...Object.values(state.routes).map(r => r.nextRetry || now + DAY));
    writeJson(stateFile, state);
    return state;
  } finally { release(); }
}
