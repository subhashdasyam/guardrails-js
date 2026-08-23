// Config loading. Project file first, then plugin options from the environment,
// then defaults.

import fs from 'node:fs';
import path from 'node:path';

export const SEVERITY_ORDER = ['perf', 'low', 'medium', 'high', 'critical'];

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
  // Everything by default. Performance findings sit below low, so a default of
  // "low" would have silently hidden the whole performance pack.
  minSeverity: 'perf',
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
  if (fromFile.minSeverity === undefined && process.env.CLAUDE_PLUGIN_OPTION_MIN_SEVERITY) {
    config.minSeverity = process.env.CLAUDE_PLUGIN_OPTION_MIN_SEVERITY;
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
