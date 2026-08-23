// Repo wide scan. Runs from the slash command and from CI.
//
//   node dist/audit.mjs [path] [--format text|json] [--fail-on high] [--max 5000]

import fs from 'node:fs';
import path from 'node:path';

import { loadConfig, isExcluded, meetsMinSeverity, SEVERITY_ORDER } from '../engine/config.js';
import { analyze } from '../engine/analyze.js';
import { SUPPORTED_EXTENSIONS } from '../engine/parse.js';
import { RULES } from '../rules/index.js';
import { readPackageJson, relativeTo } from './util.js';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'out',
  'coverage',
  '.turbo',
  '.cache',
  'vendor',
]);

function parseArgs(argv) {
  const args = { target: '.', format: 'text', failOn: null, max: 5000 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') args.format = argv[++i] ?? 'text';
    else if (arg === '--fail-on') args.failOn = argv[++i] ?? null;
    else if (arg === '--max') args.max = Number(argv[++i] ?? 5000);
    else if (!arg.startsWith('-')) args.target = arg;
  }

  return args;
}

function* walkFiles(dir, limit, seen = { count: 0 }) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (seen.count >= limit) return;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      yield* walkFiles(full, limit, seen);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    seen.count += 1;
    yield full;
  }
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const target = path.resolve(args.target);

  const config = loadConfig(target);
  const { pkg, root } = readPackageJson(target);
  const projectRoot = config.projectRoot || root || target;

  const stats = fs.existsSync(target) ? fs.statSync(target) : null;
  if (!stats) {
    process.stderr.write(`guardrails-js: ${target} does not exist\n`);
    process.exit(1);
  }

  const files = stats.isDirectory() ? [...walkFiles(target, args.max)] : [target];
  const all = [];
  let scanned = 0;

  for (const file of files) {
    const relative = relativeTo(projectRoot, file);
    if (isExcluded(relative, config)) continue;

    let source;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (source.length > 2_000_000) continue;

    scanned += 1;
    const { findings } = analyze({
      source,
      filePath: relative,
      config,
      pkg,
      rules: RULES,
      wholeFile: true,
    });
    all.push(...findings);
  }

  const counts = {};
  for (const finding of all) counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;

  if (args.format === 'json') {
    process.stdout.write(
      `${JSON.stringify({ scanned, total: all.length, counts, findings: all }, null, 2)}\n`,
    );
  } else {
    const byFile = new Map();
    for (const finding of all) {
      if (!byFile.has(finding.filePath)) byFile.set(finding.filePath, []);
      byFile.get(finding.filePath).push(finding);
    }

    const lines = [`guardrails-js scanned ${scanned} file(s) under ${target}`, ''];

    if (all.length === 0) {
      lines.push('No findings.');
    } else {
      for (const [file, findings] of byFile) {
        lines.push(file);
        for (const finding of findings) {
          lines.push(
            `  ${finding.severity.padEnd(8)} ${finding.ruleId.padEnd(10)} line ${String(finding.line).padEnd(5)} ${finding.message}`,
          );
        }
        lines.push('');
      }
      lines.push(
        `Totals: ${Object.entries(counts)
          .map(([severity, count]) => `${count} ${severity}`)
          .join(', ')}`,
      );
    }

    process.stdout.write(`${lines.join('\n')}\n`);
  }

  if (args.failOn) {
    const failing = all.filter((finding) => meetsMinSeverity(finding.severity, args.failOn));
    if (failing.length > 0) process.exit(1);
  }

  return all;
}

const invokedDirectly =
  process.argv[1] && /audit\.(mjs|js)$/.test(process.argv[1]);

if (invokedDirectly) main();

export { SEVERITY_ORDER };
