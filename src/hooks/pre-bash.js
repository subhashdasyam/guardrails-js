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

  // A bare `npm install` names nothing, so the specifier driven checks below
  // have nothing to work with and the whole declared tree used to go through
  // unexamined. That is the most common install command there is.
  //
  // Report, never block. Blocking here would strand the project: the manifest
  // is already committed, so you could not even set it up, and the fix is an
  // edit to package.json rather than a different command. Blocking is right for
  // `npm install lodash@4.17.0`, which is someone choosing a bad version now.
  const bare = installs.some(
    (install) => install.subcommand !== 'ci' && install.packages.length === 0,
  );

  if (bare && config.network) {
    try {
      const { manifestAdvisories } = await import('../supply-chain/manifest-advisories.js');
      const { pkg } = readPackageJson(projectRoot);
      const { notes, skipped } = await manifestAdvisories(pkg, config);

      if (notes.length > 0) {
        const worst = notes.slice(0, 3).map((note) => note.text);
        const more = notes.length > 3 ? ` ${notes.length - 3} other pinned versions too.` : '';
        const capped = skipped > 0 ? ` ${skipped} more were not checked.` : '';
        emitAdditionalContext(
          'PreToolUse',
          `guardrails-js on what this installs: ${worst.join(' ')}${more}${capped}`,
        );
        return;
      }
    } catch {
      // Offline verdict stands on its own.
    }
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

  // One lookup, every package, whatever else already fired.
  //
  // This used to be two. The first ran only when nothing else had decided to
  // prompt, and the second skipped the pinned packages because the first was
  // assumed to have covered them. So the moment any offline signal fired, a
  // pinned version fell through the gap between them: no advisory fetched, no
  // block, and not a word about it. `npm install expres lodash@4.17.10` let a
  // CRITICAL through on the strength of the typosquat next to it, and so did
  // `npm install lodash@4.17.10 --prefix <dir>`, whose path argument reads as
  // a specifier. The split only ever existed to avoid querying twice, which is
  // what the cache is for.
  const worthLookingUp = pinned.length > 0 || shouldPrompt;

  if (config.network && allPackages.length > 0 && worthLookingUp) {
    try {
      const { advisoryNotes } = await import('../supply-chain/osv.js');
      const notes = await advisoryNotes(allPackages, 2000);
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
      const { enrich } = await import('../supply-chain/osv.js');
      allReasons.push(...(await enrich(allPackages, 2000)));
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
