import path from 'node:path';
import { refresh, activate } from './updater.js';
import { ensureDriver, openDatabase, driverDirectory } from './sqlite.js';
import { snapshot, dataRoot, readJson, DAY } from './paths.js';
import { loadConfig } from '../engine/config.js';

const [command = 'status', ...args] = process.argv.slice(2);
const deadline = setTimeout(() => { console.error('Threat data worker exceeded its 15 minute deadline'); process.exit(1); }, 15 * 60_000);
deadline.unref();
try {
  const config = loadConfig(process.cwd());
  if (command === 'refresh') {
    if (config.network === false) throw new Error('network:false disables threat data downloads and driver installation');
    const value = Number(args[args.indexOf('--interval') + 1]);
    const state = await refresh({ force: args.includes('--force'), interval: Number.isFinite(value) && value >= 3_600_000 ? value : DAY });
    console.log(JSON.stringify(state, null, 2));
    if (state.error) process.exitCode = 1;
  } else if (command === 'setup') {
    console.log(await ensureDriver({ network: config.network, force: args.includes('--force') }));
  } else if (command === 'import') {
    if (!args[0]) throw new Error('Usage: node dist/threat-data.mjs import <directory containing threat-data.db and manifest.json>');
    await ensureDriver({ network: config.network });
    console.log(JSON.stringify(await activate(path.resolve(args[0])), null, 2));
  } else if (command === 'status') {
    let backend;
    try { const db = await openDatabase(snapshot().file); backend = db.backend; await db.close(); } catch (e) { backend = e.message; }
    console.log(JSON.stringify({ node: process.versions.node, backend, driverDirectory: driverDirectory(), ...snapshot(),
      updates: readJson(path.join(dataRoot(), 'update-state.json'), {}),
      driver: readJson(path.join(dataRoot(), 'driver-status.json'), {}),
    }, null, 2));
  } else throw new Error('Commands: status | setup [--force] | refresh [--force] | import <directory>');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { clearTimeout(deadline); }
