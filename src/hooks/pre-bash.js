// PreToolUse on Bash.
//
// The only place the plugin interrupts you. Once a postinstall script has run,
// telling Claude it was a bad idea is worth nothing.

import {
  readHookInput,
  emitJson,
  emitAdditionalContext,
  emitLoud,
  readPackageJson,
} from './util.js';
import { loadConfig } from '../engine/config.js';
import { findInstallCommands, riskyShellPatterns } from '../supply-chain/parse-command.js';
import { allows, evaluateInstall, knownPackageNames } from '../supply-chain/signals.js';
import { BLOCKING_SEVERITIES } from '../supply-chain/osv.js';

/** A named severity with a reachable fix, that the project has not allowed. */
function blocks(note, config) {
  return (
    BLOCKING_SEVERITIES.has(note.severity) &&
    !allows(config.allowPackages, note.name, note.version)
  );
}

function ask(reason) {
  emitJson({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: reason,
    },
  });
}

export async function main() {
  const input = readHookInput();
  if (input.tool_name !== 'Bash') return;

  const command = input.tool_input?.command;
  if (typeof command !== 'string' || command.length === 0) return;

  const installs = findInstallCommands(command);
  const shellNotes = riskyShellPatterns(command);

  if (installs.length === 0 && shellNotes.length === 0) return;

  const cwd = input.cwd || process.cwd();
  const config = loadConfig(cwd);
  const { root } = readPackageJson(cwd);
  const projectRoot = config.projectRoot || root || cwd;

  if (installs.length === 0) {
    emitAdditionalContext(
      'PreToolUse',
      `guardrails-js note on this command: ${shellNotes.join('; ')}.`,
    );
    return;
  }

  const known = knownPackageNames(projectRoot);
  const allReasons = [...shellNotes];
  const allPackages = [];
  let shouldPrompt = false;
  let mustBlock = false;

  for (const install of installs) {
    if (install.subcommand === 'ci') continue;
    const verdict = evaluateInstall(install, {
      projectRoot,
      known,
      allowPackages: config.allowPackages,
    });
    if (verdict.prompt) shouldPrompt = true;
    if (verdict.block) mustBlock = true;
    allReasons.push(...verdict.reasons);
    allPackages.push(...verdict.packages.filter((pkg) => pkg.kind === 'registry'));
  }

  // A pinned version is the one case where an advisory lookup gives a
  // definitive answer, so it is allowed to raise a prompt on its own. Without
  // this, installing a known vulnerable version of a package everyone trusts
  // passes every offline signal and nothing is ever said about it.
  const pinned = allPackages.filter((pkg) => /^\d+\.\d+\.\d+/.test(pkg.version ?? ''));

  if (config.network && !shouldPrompt && pinned.length > 0) {
    try {
      const { advisoryNotes } = await import('../supply-chain/osv.js');
      const notes = await advisoryNotes(pinned, 2000);
      if (notes.length > 0) {
        shouldPrompt = true;
        if (notes.some((note) => blocks(note, config))) mustBlock = true;
        allReasons.push(...notes.map((note) => note.text));
      }
    } catch {
      // Offline verdict stands on its own.
    }
  }

  if (!shouldPrompt) {
    if (allReasons.length > 0) {
      emitAdditionalContext('PreToolUse', `guardrails-js note: ${allReasons.join('; ')}.`);
    }
    return;
  }

  if (config.network && allPackages.length > 0) {
    try {
      const { enrich, advisoryNotes } = await import('../supply-chain/osv.js');
      const [registryNotes, advisories] = await Promise.all([
        enrich(allPackages, 2000),
        // Skip the ones already checked above, so nothing is said twice.
        advisoryNotes(
          allPackages.filter((pkg) => !pinned.includes(pkg)),
          2000,
        ),
      ]);
      if (advisories.some((note) => blocks(note, config))) mustBlock = true;
      allReasons.push(...registryNotes, ...advisories.map((note) => note.text));
    } catch {
      // Offline verdict stands on its own.
    }
  }

  // Advisories can arrive from both the targeted lookup and the enrichment.
  const seen = new Set();
  const reasons = allReasons.filter((reason) => {
    const key = reason.replace(/\s+/g, ' ').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  allReasons.length = 0;
  allReasons.push(...reasons);

  const bullets = allReasons.map((reason) => `  - ${reason}`).join('\n');
  const names = allPackages.map((pkg) => pkg.name).join(', ') || 'this command';

  // A prompt is only a prompt when nothing already approved the command. An
  // allow rule as ordinary as Bash(npm:*) swallows a hook's "ask" and the
  // install runs with nobody told, which is exactly how a known bad version
  // gets in. Exit 2 is documented to stop the call before permission rules are
  // read, so the cases that must not slip through use that instead.
  if (mustBlock) {
    emitLoud(
      `guardrails-js blocked this install (${names}):\n${bullets}\n\n` +
        'Install the fixed version named above instead. If this exact version is ' +
        'genuinely needed, add it to allowPackages in .guardrails-js.json.',
    );
  }

  ask(
    `guardrails-js flagged this install (${names}):\n${bullets}\n\nInstalling runs the package's install scripts on your machine straight away. Approve only if you recognise the package.`,
  );
}

await main();
