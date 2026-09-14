import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dataRoot, readJson, writeJson, lock, DAY } from './paths.js';

const exec = promisify(execFile);
export const SQLITE3_VERSION = '6.0.1';
export function driverDirectory() {
  if (process.env.GUARDRAILS_SQLITE_RUNTIME) return path.resolve(process.env.GUARDRAILS_SQLITE_RUNTIME);
  return path.join(dataRoot(), 'runtime', `${process.platform}-${process.arch}`, SQLITE3_VERSION);
}
function nativeDriver() {
  return createRequire(path.join(driverDirectory(), 'package.json'))('sqlite3');
}
let builtin;
async function builtinDriver() {
  if (process.env.GUARDRAILS_SQLITE_DRIVER === 'sqlite3') return null;
  if (builtin !== undefined) return builtin;
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) return (builtin = null);
  try {
    const moduleName = 'node:sqlite';
    const mod = await import(moduleName);
    builtin = typeof mod.DatabaseSync === 'function' ? mod : null;
  } catch { builtin = null; }
  return builtin;
}

export async function ensureDriver({ network = true, force = false } = {}) {
  if (await builtinDriver()) return 'node:sqlite';
  try { nativeDriver(); return 'sqlite3'; } catch {}
  if (!network) throw new Error('SQLite3 is not installed; network access is disabled');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 17)) throw new Error('Use Node 20.17+; Node 22.13+ is recommended');
  const dir = driverDirectory();
  const statusFile = path.join(dataRoot(), 'driver-status.json');
  const status = readJson(statusFile, {});
  if (!force && status.nextRetry > Date.now()) throw new Error(status.error || 'SQLite3 installation is in backoff');
  const release = lock(path.join(dataRoot(), 'driver.lock'));
  if (!release) throw new Error('SQLite3 installation is already running');
  try {
    fs.mkdirSync(dir, { recursive: true });
    writeJson(path.join(dir, 'package.json'), { name: 'guardrails-js-sqlite-runtime', private: true });
    // Resolve npm's JS entry point so Windows does not need a shell for npm.cmd.
    const candidates = [
      process.env.npm_execpath,
      path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
      path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
    ];
    const npmCli = candidates.find(p => p && /npm-cli\.js$/.test(p) && fs.existsSync(p));
    const args = ['install', '--prefix', dir, '--no-audit', '--no-fund', '--save-exact', '--ignore-scripts=false', `sqlite3@${SQLITE3_VERSION}`];
    await exec(npmCli ? process.execPath : 'npm', npmCli ? [npmCli, ...args] : args, {
      cwd: dir, timeout: 240_000, maxBuffer: 2_000_000, windowsHide: true,
      env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}` },
    });
    nativeDriver();
    writeJson(statusFile, { installedAt: Date.now(), version: SQLITE3_VERSION });
    return 'sqlite3';
  } catch (error) {
    writeJson(statusFile, { nextRetry: Date.now() + DAY, error: `SQLite3 installation failed: ${error.message.slice(0, 500)}` });
    throw error;
  } finally { release(); }
}

// Callers use one asynchronous API. No hook installs dependencies inline.
export async function openDatabase(file, { readOnly = true } = {}) {
  const mod = await builtinDriver();
  if (mod) {
    const db = new mod.DatabaseSync(file, { readOnly, allowExtension: false });
    return {
      backend: 'node:sqlite',
      exec: async sql => { db.exec(sql); },
      all: async (sql, params = []) => db.prepare(sql).all(...params),
      run: async (sql, params = []) => db.prepare(sql).run(...params),
      close: async () => db.close(),
    };
  }
  let driver;
  try { driver = nativeDriver(); } catch { throw new Error('SQLite3 driver unavailable; automatic setup runs in the background. Node 22.13+ includes SQLite.'); }
  const db = await new Promise((resolve, reject) => {
    const instance = new driver.Database(file, readOnly ? driver.OPEN_READONLY : driver.OPEN_READWRITE | driver.OPEN_CREATE,
      error => error ? reject(error) : resolve(instance));
  });
  const call = method => (sql, params = []) => new Promise((resolve, reject) => {
    db[method](sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
  return {
    backend: 'sqlite3', all: call('all'), run: call('run'),
    exec: sql => new Promise((resolve, reject) => db.exec(sql, e => e ? reject(e) : resolve())),
    close: () => new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve())),
  };
}
