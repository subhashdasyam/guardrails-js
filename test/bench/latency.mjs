// Latency gate. The hook runs on every file write, so its cost matters.
//
// This measures what the plugin costs, not what the machine costs. An earlier
// version compared wall clock against fixed budgets, which passed on a laptop
// and failed on CI runners that are slower and share a host with other jobs.
// One run reported a p95 of 250 ms, which was a scheduling stall and not code.
//
// So everything here is a difference:
//
//   load      how long the bundle takes to load, over a bare node process
//   scan      how long analysis takes, over the same bundle exiting early
//
// Those differences hold steady across machines. The absolute numbers do not.
//
//   node test/bench/latency.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const hook = path.join(root, 'dist', 'post-write.mjs');

// Budgets on the differences, in milliseconds. Observed on a development
// machine and on GitHub runners: load about 21 and 45, clean scan about 2 and 5,
// hit scan about 14 and 23. These leave room for a slower machine while still
// catching a real regression. A clean-path regression of 13 ms has happened
// once already, when manifest rules with no prefilter made every file parse.
const BUDGET_MS = { load: 90, scanClean: 10, scanHit: 70 };
const RUNS = 25;

// The first few spawns pay for cold file cache and show up as a spike large
// enough to fail a tight budget on their own. Throw them away.
const WARMUP = 4;

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

function sample(run) {
  const timings = [];

  for (let i = 0; i < WARMUP; i += 1) {
    try {
      run();
    } catch {
      // warmup, result ignored
    }
  }

  for (let i = 0; i < RUNS; i += 1) {
    const start = process.hrtime.bigint();
    try {
      run();
    } catch {
      // The hit case exits 2 on purpose.
    }
    timings.push(Number(process.hrtime.bigint() - start) / 1e6);
  }

  timings.sort((a, b) => a - b);
  return {
    median: timings[Math.floor(timings.length / 2)],
    p95: timings[Math.floor(timings.length * 0.95)],
  };
}

const bare = sample(() => execFileSync(process.execPath, ['-e', ''], { stdio: 'pipe' }));

const measure = (file) => {
  const input = payload(file);
  return sample(() => execFileSync(process.execPath, [hook], { input, stdio: 'pipe' }));
};

// A file the hook does not handle. It loads the bundle and exits, so the
// difference from a bare process is the cost of loading.
const skipped = measure('notes.md');
const clean = measure('clean.js');
const hit = measure('hit.js');

const results = [
  {
    name: 'load',
    detail: 'bundle load, over a bare node process',
    value: skipped.median - bare.median,
    budget: BUDGET_MS.load,
  },
  {
    name: 'scan clean',
    detail: 'analysis of a file with no findings, over loading alone',
    value: clean.median - skipped.median,
    budget: BUDGET_MS.scanClean,
  },
  {
    name: 'scan hit',
    detail: 'analysis of a file with findings, over loading alone',
    value: hit.median - skipped.median,
    budget: BUDGET_MS.scanHit,
  },
];

console.log(
  `machine baseline: bare node ${bare.median.toFixed(1)} ms, ` +
    `hook loaded and skipped ${skipped.median.toFixed(1)} ms ` +
    `(p95 ${skipped.p95.toFixed(1)} ms)\n`,
);

let failed = false;

for (const result of results) {
  // Noise can make a difference slightly negative. Report zero, not nonsense.
  const value = Math.max(0, result.value);
  const ok = value <= result.budget;
  if (!ok) failed = true;

  console.log(
    `${result.name.padEnd(11)} ${value.toFixed(1).padStart(6)} ms   ` +
      `budget ${String(result.budget).padStart(3)} ms   ${ok ? 'ok' : 'OVER BUDGET'}   ${result.detail}`,
  );
}

if (failed) {
  console.log(
    '\nThis measures the plugin, not the machine, so a slower runner is not the cause.',
  );
  console.log('Something in the hook path got more expensive. Likely candidates:');
  console.log('  - a rule with no prefilter, which forces every file to be parsed');
  console.log('  - a new top level import in a hook entry point');
  console.log('  - a rule whose prefilter matches almost everything');
}

fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
