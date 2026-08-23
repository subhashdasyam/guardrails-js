// PostToolUse on Write, Edit, MultiEdit, and NotebookEdit.
//
// Runs with async and asyncRewake set, so it never holds Claude up. Exit 0 and
// say nothing when the file is clean. Exit 2 with the findings on stderr when
// something needs fixing.

import fs from 'node:fs';
import path from 'node:path';

import { readHookInput, emitAdditionalContext, emitLoud, readPackageJson, relativeTo } from './util.js';
import { SUPPORTED_EXTENSIONS } from '../engine/parse.js';
import { loadConfig, isExcluded } from '../engine/config.js';
import { analyze } from '../engine/analyze.js';
import { applyLoopGuard } from '../engine/fingerprint.js';
import { splitBySeverity, formatLoud, formatQuiet, appendReport } from '../engine/report.js';
import {
  readLockedVersions,
  checkDependencies,
  describeDependencyFinding,
} from '../supply-chain/dependencies.js';
import { RULES } from '../rules/index.js';

const WATCHED_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function checkManifest(filePath, input) {
  const projectRoot = path.dirname(filePath);

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return;
  }

  const locked = readLockedVersions(projectRoot);
  const matches = checkDependencies(pkg, locked);
  if (matches.length === 0) return;

  const findings = matches.map((match) => ({
    ruleId: match.ruleId,
    title: match.title,
    severity: match.severity,
    owasp2025: match.severity === 'critical' || match.severity === 'high' ? 'A03' : 'A03',
    cwe: [],
    api: null,
    line: 1,
    column: 1,
    evidence: `${match.package}@${match.installed}`,
    message: describeDependencyFinding(match),
    fix: match.fixed ? `npm install ${match.package}@^${match.fixed}` : match.action,
    filePath: 'package.json',
  }));

  applyLoopGuard(findings, input.session_id, 'package.json');
  appendReport(projectRoot, 'package.json', findings);

  const { loud, quiet } = splitBySeverity(findings);

  if (loud.length > 0) {
    let text = formatLoud(loud, 'package.json');
    if (quiet.length > 0) text += `\n\n${formatQuiet(quiet, 'package.json')}`;
    emitLoud(text);
    return;
  }

  emitAdditionalContext('PostToolUse', formatQuiet(quiet, 'package.json'));
}

function filePathFrom(toolInput) {
  return (
    toolInput?.file_path ??
    toolInput?.filePath ??
    toolInput?.notebook_path ??
    toolInput?.path ??
    null
  );
}

export function main() {
  const input = readHookInput();

  const toolName = input.tool_name;
  if (!WATCHED_TOOLS.has(toolName)) return;

  const filePath = filePathFrom(input.tool_input);
  if (!filePath) return;

  // package.json is not code, but a version range is where the middleware
  // bypass and the server component RCE live, so it gets its own path.
  if (path.basename(filePath) === 'package.json') {
    checkManifest(filePath, input);
    return;
  }

  // Self filter on extension. The `if` field in hooks.json can do this too, but
  // it depends on the CLI version, so we never rely on it.
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) return;

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  if (source.length > 2_000_000) return;

  const cwd = input.cwd || process.cwd();
  const config = loadConfig(path.dirname(filePath));
  const { pkg, root } = readPackageJson(path.dirname(filePath));
  const projectRoot = config.projectRoot || root || cwd;
  const relative = relativeTo(projectRoot, filePath);

  if (isExcluded(relative, config)) return;

  const { findings } = analyze({
    source,
    filePath: relative,
    toolName,
    toolInput: input.tool_input,
    config,
    pkg,
    rules: RULES,
  });

  if (findings.length === 0) return;

  applyLoopGuard(findings, input.session_id, relative);
  appendReport(projectRoot, relative, findings);

  const { loud, quiet } = splitBySeverity(findings);

  if (loud.length > 0) {
    let text = formatLoud(loud, relative);
    if (quiet.length > 0) {
      text += `\n\n${formatQuiet(quiet, relative)}`;
    }
    emitLoud(text);
    return;
  }

  emitAdditionalContext('PostToolUse', formatQuiet(quiet, relative));
}

main();
