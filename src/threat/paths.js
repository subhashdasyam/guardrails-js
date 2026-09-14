import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DAY = 86_400_000;
export const REPOSITORY = 'https://github.com/subhashdasyam/guardrails-js.git';
export const DATA_URL = 'https://raw.githubusercontent.com/subhashdasyam/guardrails-js/threat-data';
export function dataRoot() {
  return path.join(process.env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), '.claude/plugins/data/guardrails-js'), 'threat');
}
export function pluginRoot() {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'hooks/hooks.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Cannot locate guardrails-js plugin files');
}
export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temp, file);
}
export function snapshot() {
  if (process.env.GUARDRAILS_THREAT_SNAPSHOT) {
    const dir = path.resolve(process.env.GUARDRAILS_THREAT_SNAPSHOT);
    return { file: path.join(dir, 'threat-data.db'), metadata: readJson(path.join(dir, 'manifest.json')) };
  }
  const root = dataRoot();
  const active = readJson(path.join(root, 'active.json'));
  if (active && /^[a-f0-9]{64}$/.test(active.sha256)) {
    const file = path.join(root, 'snapshots', active.sha256, 'threat-data.db');
    if (fs.existsSync(file)) return { file, metadata: active };
  }
  const dir = path.join(pluginRoot(), 'data');
  return { file: path.join(dir, 'threat-data.db'), metadata: readJson(path.join(dir, 'manifest.json')) };
}

// Exclusive file creation works across hook processes. Workers have a hard
// deadline shorter than this lease, so abandoned locks eventually expire.
export function lock(file, leaseMs = 20 * 60_000) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (Date.now() - fs.statSync(file).mtimeMs > leaseMs) fs.unlinkSync(file);
  } catch {}
  try {
    const fd = fs.openSync(file, 'wx');
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);
    return () => { try { fs.unlinkSync(file); } catch {} };
  } catch { return null; }
}
