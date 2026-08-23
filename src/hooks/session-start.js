// SessionStart.
//
// Reads the project, works out the stack, and gives Claude the rules for that
// stack only. A Vue project never pays for React rules. Also does a quick pass
// over package.json so known bad dependency versions get raised before any code
// is written.

import { readHookInput, readPackageJson, allDependencies } from './util.js';
import { loadConfig } from '../engine/config.js';
import { packsFor, stackLabel } from '../priming/packs.js';
import { resetSession } from '../engine/fingerprint.js';
import { runManifestRules } from '../engine/manifest.js';
import {
  readLockedVersions,
  checkDependencies,
  describeDependencyFinding,
} from '../supply-chain/dependencies.js';

function baselineNotes(projectRoot, pkg, config) {
  const notes = [];

  // The supply chain rules cover the lockfile, install scripts, known bad
  // releases, and signature verification, so this is one implementation rather
  // than a second set of checks that can drift from the first.
  for (const finding of runManifestRules(projectRoot, config, pkg)) {
    notes.push(`${finding.ruleId} ${finding.message} Fix: ${finding.fix.split('\n')[0]}`);
  }

  for (const finding of checkDependencies(pkg, readLockedVersions(projectRoot))) {
    notes.push(describeDependencyFinding(finding));
  }

  return notes;
}

export function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.cwd();

  resetSession(input.session_id);

  const config = loadConfig(cwd);
  if (!config.priming) return;

  const { pkg, root } = readPackageJson(cwd);
  // A config file pins the project root. Without one, the directory holding
  // package.json is the answer, not whatever directory we were pointed at.
  const projectRoot = config.configFile ? config.projectRoot : root || cwd;

  // Not a JavaScript project. Say nothing.
  if (!pkg) return;

  const dependencies = allDependencies(pkg);
  const packs = packsFor(dependencies);
  const notes = baselineNotes(projectRoot, pkg, config);

  const parts = [
    `guardrails-js is active. Stack detected: ${stackLabel(dependencies)}.`,
    '',
    ...packs,
  ];

  if (notes.length > 0) {
    parts.push('', 'Things already wrong in this project:');
    for (const note of notes) parts.push(`- ${note}`);
  }

  parts.push(
    '',
    'Findings arrive after each file write. Critical and high ones need fixing before moving on.',
  );

  process.stdout.write(`${parts.join('\n')}\n`);
}

main();
