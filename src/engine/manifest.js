// Runner for the supply chain rules.
//
// They need a project rather than a syntax tree, so they get their own pass.
// The output shape is identical to an AST finding, which means the report file,
// the severity split, the loop guard, and the audit command all handle them
// without knowing they are different.

import fs from 'node:fs';
import path from 'node:path';

import supplyRules from '../rules/supply/manifest.js';
import { readLockedVersions } from '../supply-chain/dependencies.js';
import { shouldReport } from './config.js';

const LOCKFILES = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** Read a file, or concatenate every file in a directory one level deep. */
function makeReader(projectRoot) {
  return (relative) => {
    const target = path.join(projectRoot, relative);

    let stats;
    try {
      stats = fs.statSync(target);
    } catch {
      return '';
    }

    if (stats.isFile()) return readText(target);
    if (!stats.isDirectory()) return '';

    try {
      return fs
        .readdirSync(target)
        .filter((name) => /\.(ya?ml|json|sh|toml)$/i.test(name))
        .map((name) => readText(path.join(target, name)))
        .join('\n');
    } catch {
      return '';
    }
  };
}

export function manifestContext(projectRoot, pkg = null) {
  const read = makeReader(projectRoot);

  let manifest = pkg;
  if (!manifest) {
    try {
      manifest = JSON.parse(readText(path.join(projectRoot, 'package.json')));
    } catch {
      manifest = null;
    }
  }

  const lockfileName = LOCKFILES.find((name) => fs.existsSync(path.join(projectRoot, name))) ?? null;

  return {
    projectRoot,
    pkg: manifest,
    locked: readLockedVersions(projectRoot),
    npmrc: read('.npmrc'),
    hasLockfile: Boolean(lockfileName),
    lockfileName,
    read,
  };
}

/**
 * Run the supply chain rules over a project. Returns findings in the same shape
 * everything else produces.
 */
export function runManifestRules(projectRoot, config, pkg = null, rules = supplyRules) {
  const ctx = manifestContext(projectRoot, pkg);

  // Not a JavaScript project. Nothing to say.
  if (!ctx.pkg) return [];

  const findings = [];

  for (const rule of rules) {
    if (config.isRuleDisabled(rule.id)) continue;

    let hit;
    try {
      hit = rule.matchManifest(ctx);
    } catch {
      continue;
    }
    if (!hit) continue;

    const severity = config.severityFor({ ...rule, severity: hit.severityHint ?? rule.severity });
    if (!shouldReport(severity, config)) continue;

    findings.push({
      ruleId: rule.id,
      title: rule.title,
      severity,
      owasp2025: rule.owasp2025,
      cwe: rule.cwe ?? [],
      api: rule.api ?? null,
      line: 1,
      column: 1,
      evidence: ctx.lockfileName ? `package.json, ${ctx.lockfileName}` : 'package.json',
      message: typeof rule.message === 'function' ? rule.message(hit) : rule.message,
      fix: rule.fix,
      filePath: 'package.json',
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3, perf: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

  return findings;
}

/** Files that change the answer, so a write to one of them triggers a re-check. */
export function isManifestFile(filePath) {
  const base = path.basename(String(filePath));
  return base === 'package.json' || base === '.npmrc' || LOCKFILES.includes(base);
}

export { supplyRules, LOCKFILES };
