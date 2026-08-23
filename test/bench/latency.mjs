// Latency gate. The hook runs on every file write, so cold start is the whole
// game. Fails the build when it drifts.
//
//   node test/bench/latency.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const hook = path.join(root, 'dist', 'post-write.mjs');

const BUDGET_MS = { markdown: 60, clean: 60, hit: 140 };
const RUNS = 20;

if (!fs.existsSync(hook)) {
  console.error('dist/post-write.mjs is missing. Run npm run build first.');
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-bench-'));
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'bench', version: '1.0.0' }));
fs.writeFileSync(path.join(dir, 'notes.md'), '# notes\n');
fs.writeFileSync(
  path.join(dir, 'clean.js'),
  'export function add(a, b) {\n  return a + b;\n}\n'.repeat(40),
);
fs.writeFileSync(
  path.join(dir, 'hit.js'),
  `const { exec } = require('child_process');
app.get('/u', async (req, res) => {
  const rows = await pool.query(\`SELECT * FROM users WHERE id = '\${req.query.id}'\`);
  exec('convert ' + req.body.file, cb);
  res.json(rows);
});
`,
);

function payload(file) {
  return JSON.stringify({
    session_id: 'bench',
    cwd: dir,
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_input: { file_path: path.join(dir, file) },
  });
}

function measure(file) {
  const input = payload(file);
  const timings = [];

  for (let i = 0; i < RUNS; i += 1) {
    const start = process.hrtime.bigint();
    try {
      execFileSync(process.execPath, [hook], { input, stdio: 'pipe' });
    } catch {
      // exit code 2 is the expected result for the hit case
    }
    timings.push(Number(process.hrtime.bigint() - start) / 1e6);
  }

  timings.sort((a, b) => a - b);
  return {
    median: timings[Math.floor(timings.length / 2)],
    p95: timings[Math.floor(timings.length * 0.95)],
  };
}

let failed = false;

for (const [label, file] of [
  ['markdown', 'notes.md'],
  ['clean', 'clean.js'],
  ['hit', 'hit.js'],
]) {
  const { median, p95 } = measure(file);
  const budget = BUDGET_MS[label];
  const ok = p95 <= budget;
  if (!ok) failed = true;

  console.log(
    `${label.padEnd(9)} median ${median.toFixed(1).padStart(6)} ms   p95 ${p95
      .toFixed(1)
      .padStart(6)} ms   budget ${budget} ms   ${ok ? 'ok' : 'OVER BUDGET'}`,
  );
}

fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
