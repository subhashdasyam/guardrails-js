// SessionStart.
//
// Reads the project, works out the stack, and gives Claude the rules for that
// stack only. A Vue project never pays for React rules. Also does a quick pass
// over package.json so known bad dependency versions get raised before any code
// is written.

import fs from 'node:fs';
import path from 'node:path';

import { readHookInput, readPackageJson, allDependencies } from './util.js';
import { loadConfig } from '../engine/config.js';
import { packsFor, stackLabel } from '../priming/packs.js';
import { resetSession } from '../engine/fingerprint.js';
import { denylist, hasLockfile } from '../supply-chain/signals.js';
import {
  readLockedVersions,
  checkDependencies,
  describeDependencyFinding,
} from '../supply-chain/dependencies.js';

function baselineNotes(projectRoot, pkg) {
  const notes = [];

  if (pkg && !hasLockfile(projectRoot)) {
    notes.push(
      'This project has no lockfile. Run npm install once and commit package-lock.json, then use npm ci everywhere else.',
    );
  }

  const locked = readLockedVersions(projectRoot);

  for (const finding of checkDependencies(pkg, locked)) {
    notes.push(describeDependencyFinding(finding));
  }

  for (const [name, version] of locked) {
    const entry = denylist.packages[name];
    if (entry && entry.versions.includes(version)) {
      const incident = denylist.incidents[entry.incident];
      notes.push(
        `${name}@${version} in the lockfile is a known compromised release. ${incident?.description ?? ''} Upgrade it and rotate any credentials this machine has touched.`,
      );
    }
  }

  const scripts = pkg?.scripts ?? {};
  for (const [name, body] of Object.entries(scripts)) {
    if (typeof body !== 'string') continue;
    if (/\bnpm\s+install\b/.test(body) && !/--ignore-scripts/.test(body)) {
      notes.push(`The "${name}" script runs npm install without --ignore-scripts.`);
    }
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
  const projectRoot = config.projectRoot || root || cwd;

  // Not a JavaScript project. Say nothing.
  if (!pkg) return;

  const dependencies = allDependencies(pkg);
  const packs = packsFor(dependencies);
  const notes = baselineNotes(projectRoot, pkg);

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
