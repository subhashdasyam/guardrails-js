import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateSnapshot } from '../src/threat/importer.js';

const input = path.resolve(process.argv[2] || 'threat-output');
const manifest = await validateSnapshot(input);
if (manifest.seedOnly || Date.now() - Date.parse(manifest.sourceUpdated) > 7 * 86_400_000 || manifest.packages < 1000) {
  throw new Error('Refusing to publish stale or incomplete source data');
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-publish-'));
try {
  // Use the checkout's configured authentication; never copy its credentials.
  const exists = git('ls-remote', '--heads', 'origin', 'refs/heads/threat-data');
  if (exists) {
    git('fetch', '--depth=1', 'origin', 'threat-data');
    git('worktree', 'add', '--detach', dir, 'FETCH_HEAD');
  } else {
    git('worktree', 'add', '--detach', dir, 'HEAD');
    git('-C', dir, 'checkout', '--orphan', 'threat-data-publication');
    git('-C', dir, 'rm', '-rf', '--ignore-unmatch', '.');
  }
  for (const name of ['threat-data.db', 'manifest.json', 'summary.md']) fs.copyFileSync(path.join(input, name), path.join(dir, name));
  git('-C', dir, 'add', 'threat-data.db', 'manifest.json', 'summary.md');
  if (git('-C', dir, 'diff', '--cached', '--stat')) {
    git('-C', dir, '-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', `Refresh threat database (${manifest.packages} packages)`);
    git('-C', dir, 'push', 'origin', 'HEAD:refs/heads/threat-data');
  }
} finally {
  try { git('worktree', 'remove', '--force', dir); } catch { fs.rmSync(dir, { recursive: true, force: true }); }
}
