// Config loading. Project file first, then plugin options from the environment,
// then defaults.

import fs from 'node:fs';
import path from 'node:path';

export const SEVERITY_ORDER = ['perf', 'low', 'medium', 'high', 'critical'];

// A severity floor and a performance switch are two different questions, and
// tying them together was a design mistake. Performance sits below low on the
// scale, so a floor of medium quietly removed the entire performance pack. They
// are now separate: minSeverity governs security findings, performance governs
// the rest.
export const SECURITY_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const DEFAULTS = {
  severityOverrides: {},
  disableRules: [],
  excludePaths: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.min.js',
  ],
  network: true,
  primingPacks: ['auto'],
  priming: true,
  // Security findings below this are dropped. Performance findings are not on
  // this scale, see the note above SECURITY_SEVERITIES.
  minSeverity: 'medium',
  // Performance findings are advisory and never interrupt, so they are on by
  // default and switched separately from the security floor.
  //
  //   true or 'high'  the findings that reliably bite, which is the default
  //   'all'           everything, including the ones that depend on data we
  //                   cannot see, such as whether a render is actually slow
  //   false or 'off'  none
  performance: 'high',
  // Write .claude/guardrails-js-report.md as findings arrive.
  report: true,
};

// There is no modelEscalation flag here on purpose. Model escalation ships as
// hooks/escalation.json, a prompt hook you add to your own settings, and
// installing it is the switch. A config key would be a second source of truth
// that could disagree with whether the hook is actually registered.

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function findConfigFile(startDir) {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 30; depth += 1) {
    const candidate = path.join(dir, '.guardrails-js.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return !['0', 'false', 'no', 'off', ''].includes(String(raw).toLowerCase());
}

export function loadConfig(cwd = process.cwd()) {
  const file = findConfigFile(cwd);
  const fromFile = file ? readJson(file) ?? {} : {};

  const config = {
    ...DEFAULTS,
    ...fromFile,
    severityOverrides: { ...DEFAULTS.severityOverrides, ...(fromFile.severityOverrides ?? {}) },
    excludePaths: fromFile.excludePaths ?? DEFAULTS.excludePaths,
    disableRules: fromFile.disableRules ?? DEFAULTS.disableRules,
    configFile: file,
    projectRoot: file ? path.dirname(file) : cwd,
  };

  // Plugin level options come through as environment variables and act as the
  // default when the project has not said otherwise.
  if (fromFile.network === undefined) {
    config.network = envBool('CLAUDE_PLUGIN_OPTION_NETWORK', DEFAULTS.network);
  }
  if (fromFile.priming === undefined) {
    config.priming = envBool('CLAUDE_PLUGIN_OPTION_PRIMING', DEFAULTS.priming);
  }
  // The settings panel can only offer yes or no, so yes means the high impact
  // set. Anyone wanting all of them says so in .guardrails-js.json.
  if (fromFile.performance === undefined) {
    config.performance = envBool('CLAUDE_PLUGIN_OPTION_PERFORMANCE', true) ? 'high' : 'off';
  }
  if (fromFile.report === undefined) {
    config.report = envBool('CLAUDE_PLUGIN_OPTION_REPORT', DEFAULTS.report);
  }

  // Nothing validates a value coming from settings or the environment, so a
  // typo would otherwise silently drop every finding.
  if (!SECURITY_SEVERITIES.includes(config.minSeverity)) {
    config.minSeverity = DEFAULTS.minSeverity;
  }

  const disabled = new Set(config.disableRules.map((id) => String(id).toUpperCase()));
  const overrides = {};
  for (const [id, value] of Object.entries(config.severityOverrides)) {
    overrides[String(id).toUpperCase()] = String(value).toLowerCase();
  }

  config.isRuleDisabled = (ruleId) => {
    const id = String(ruleId).toUpperCase();
    if (disabled.has(id)) return true;
    return overrides[id] === 'off';
  };

  config.severityFor = (rule) => {
    const override = overrides[String(rule.id).toUpperCase()];
    if (override && override !== 'off') return override;
    return rule.severity;
  };

  return config;
}

/** off, high, or all. Accepts booleans because the settings panel sends those. */
export function performanceMode(config) {
  const value = config.performance;
  if (value === false || value === 'off' || value === 'none') return 'off';
  if (value === 'all' || value === 'low') return 'all';
  return 'high';
}

/**
 * Should this finding be shown?
 *
 * Performance answers to its own switch and never to the security floor, so
 * raising the floor cannot hide a whole pack. Within performance, impact
 * decides: 'high' is the set that reliably bites, 'low' is the set that depends
 * on data the analyzer cannot see.
 */
export function shouldReport(severity, config, impact = 'high') {
  if (severity !== 'perf') return meetsMinSeverity(severity, config.minSeverity);

  const mode = performanceMode(config);
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  return impact !== 'low';
}

export function meetsMinSeverity(severity, minSeverity) {
  const have = SEVERITY_ORDER.indexOf(severity);
  const need = SEVERITY_ORDER.indexOf(minSeverity);
  if (have === -1 || need === -1) return true;
  return have >= need;
}

const REGEX_SPECIALS = /[.+^${}()|[\]\\]/g;

/** Very small glob match. Handles the two star form, one star, and question mark. */
export function matchesGlob(pattern, filePath) {
  let source = '';
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          source += '(?:.*/)?';
          i += 3;
        } else {
          source += '.*';
          i += 2;
        }
      } else {
        source += '[^/]*';
        i += 1;
      }
      continue;
    }

    if (ch === '?') {
      source += '[^/]';
      i += 1;
      continue;
    }

    source += ch.replace(REGEX_SPECIALS, '\\$&');
    i += 1;
  }

  return new RegExp(`^${source}$`).test(filePath);
}

export function isExcluded(filePath, config) {
  const normalised = String(filePath).split(path.sep).join('/');
  return config.excludePaths.some((pattern) => matchesGlob(pattern, normalised));
}
