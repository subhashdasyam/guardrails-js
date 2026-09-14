// Builds a standalone SQLite snapshot, never JavaScript bundles. The runtime
// fallback uses this same importer through dist/threat-data.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { buildDatabase, buildFromSources, collectPopular, validateSnapshot } from '../src/threat/importer.js';
import { ensureDriver } from '../src/threat/sqlite.js';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const output = path.resolve(option('--output') || 'threat-output');
await ensureDriver();
fs.mkdirSync(output, { recursive: true });
if (args.includes('--validate')) {
  console.log(await validateSnapshot(output));
} else if (args.includes('--seed')) {
  console.log(await buildDatabase({ output, seedOnly: true, source: 'bundled curated baseline' }));
} else if (option('--osv-dir')) {
  if (!option('--source-updated')) throw new Error('--osv-dir requires --source-updated (source snapshot timestamp)');
  console.log(await buildDatabase({ output, osvDir: option('--osv-dir'), sourceUpdated: option('--source-updated'), popular: await collectPopular() }));
} else {
  console.log(await buildFromSources(output));
  await validateSnapshot(output);
}
