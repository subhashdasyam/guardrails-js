// Fails when the committed bundle does not match a fresh build from source.
//
// dist/ is what actually runs, so a stale bundle means the code you reviewed is
// not the code that ships. CI runs this on every pull request.

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, 'dist');

function hashDir(dir) {
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const name of fs.readdirSync(dir).sort()) {
    const contents = fs.readFileSync(path.join(dir, name));
    out[name] = crypto.createHash('sha256').update(contents).digest('hex');
  }
  return out;
}

const before = hashDir(distDir);

execFileSync(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { stdio: 'pipe' });

const after = hashDir(distDir);

const names = new Set([...Object.keys(before), ...Object.keys(after)]);
const changed = [...names].filter((name) => before[name] !== after[name]);

if (changed.length > 0) {
  console.error('dist/ is out of date. Run npm run build and commit the result.');
  for (const name of changed) console.error(`  ${name}`);
  process.exit(1);
}

console.log(`dist/ matches source (${names.size} file(s))`);
