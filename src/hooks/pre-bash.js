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

  if (!shouldPrompt) {
    if (allReasons.length > 0) {
      emitAdditionalContext('PreToolUse', `guardrails-js note: ${allReasons.join('; ')}.`);
    }
    return;
  }

  if (config.network && allPackages.length > 0) {
    try {
      const { enrich } = await import('../supply-chain/osv.js');
      const extra = await enrich(allPackages, 2000);
      allReasons.push(...extra);
    } catch {
      // Offline verdict stands on its own.
    }
  }

  const bullets = allReasons.map((reason) => `  - ${reason}`).join('\n');
  const names = allPackages.map((pkg) => pkg.name).join(', ') || 'this command';

  ask(
    `guardrails-js flagged this install (${names}):\n${bullets}\n\nInstalling runs the package's install scripts on your machine straight away. Approve only if you recognise the package.`,
  );
}

await main();
