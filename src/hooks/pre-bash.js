// PreToolUse on Bash.
//
// The only place the plugin interrupts you. Once a postinstall script has run,
// telling Claude it was a bad idea is worth nothing.

import { readHookInput, emitJson, emitAdditionalContext, readPackageJson } from './util.js';
import { loadConfig } from '../engine/config.js';
import { findInstallCommands, riskyShellPatterns } from '../supply-chain/parse-command.js';
import { evaluateInstall, knownPackageNames } from '../supply-chain/signals.js';

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

  for (const install of installs) {
    if (install.subcommand === 'ci') continue;
    const verdict = evaluateInstall(install, { projectRoot, known });
    if (verdict.prompt) shouldPrompt = true;
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
        allReasons.push(...notes);
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
      allReasons.push(...registryNotes, ...advisories);
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

  ask(
    `guardrails-js flagged this install (${names}):\n${bullets}\n\nInstalling runs the package's install scripts on your machine straight away. Approve only if you recognise the package.`,
  );
}

await main();
