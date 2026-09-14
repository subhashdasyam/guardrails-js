import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DAY, dataRoot, pluginRoot, readJson, writeJson, snapshot, lock, REPOSITORY } from './paths.js';

export function manualSteps() {
  const command = JSON.stringify(path.join(pluginRoot(), 'dist/threat-data.mjs'));
  return `Clone a fresh copy into a new directory:\ngit clone --depth 1 --single-branch --branch threat-data ${REPOSITORY} guardrails-threat-data\n` +
    `Then validate and install it:\nnode ${command} import ./guardrails-threat-data\n` +
    `To retry all automatic routes: node ${command} refresh --force`;
}

// This path only reads tiny metadata files. Database access and networking live
// in the separately bundled worker, never in ordinary code-analysis startup.
export function maintainThreatData(config, { now = Date.now(), launch = spawn } = {}) {
  if (process.env.GUARDRAILS_THREAT_MAINTENANCE === 'off') return '';
  try {
    const root = dataRoot();
    const state = readJson(path.join(root, 'update-state.json'), {});
    const interval = Math.max(1, Number(config.threatDataRefreshHours) || 24) * 3_600_000;
    if (config.network !== false && config.threatDataAutoRefresh !== false &&
        now >= (state.nextCheck || 0)) {
      const release = lock(path.join(root, 'launch.lock'), 60_000);
      if (release) {
        try {
          const last = readJson(path.join(root, 'launch.json'), {});
          if (now - (last.at || 0) >= 60_000) {
            writeJson(path.join(root, 'launch.json'), { at: now });
            const worker = launch(process.execPath, [path.join(pluginRoot(), 'dist/threat-data.mjs'), 'refresh', '--interval', String(interval)], {
              detached: true, stdio: 'ignore', windowsHide: true,
              env: { ...process.env, CLAUDE_PLUGIN_DATA: path.dirname(root) },
            });
            worker.on('error', () => {});
            worker.unref();
          }
        } finally { release(); }
      }
    }
    const current = snapshot();
    const age = now - Date.parse(current.metadata?.sourceUpdated);
    const error = readJson(path.join(root, 'store-error.json'));
    const problem = error && now - error.at < DAY ? `Threat database checks are unavailable: ${error.error}.` :
      (!fs.existsSync(current.file) || !Number.isFinite(age)) ? 'No usable threat database is installed.' :
      age > 7 * DAY ? `Threat database is ${Math.floor(age / DAY)} days old (source snapshot ${current.metadata.sourceUpdated}).` : '';
    if (!problem) return '';
    const release = lock(path.join(root, 'notice.lock'), 60_000);
    if (!release) return '';
    try {
      const previous = readJson(path.join(root, 'notice.json'), {});
      if (now - (previous.at || 0) < DAY) return '';
      writeJson(path.join(root, 'notice.json'), { at: now });
    } finally { release(); }
    const failures = [state.error, ...Object.entries(state.routes || {}).filter(([, value]) => value.error)
      .map(([name, value]) => `${name}: ${value.error}`)].filter(Boolean).join('; ');
    return `guardrails-js: ${problem} ${failures ? `Last update failures: ${failures}. ` : ''}` +
      `Tell the user this warning and the following manual refresh steps once today.\n${manualSteps()}`;
  } catch { return ''; }
}
