// The analyzer. One walk, rules dispatched by node type.

import { walk } from './walk.js';
import { parseSource } from './parse.js';
import { scanTemplate } from './vue-template.js';
import { collectTaintedNames, isTaintedExpr, describeSource, hasGuard } from './taint.js';
import { changedRangeFromToolInput, reportWindow, inWindow, lineOf, lineText } from './scope.js';
import { collectSuppressions } from './suppress.js';
import { meetsMinSeverity } from './config.js';
import { snippet } from '../rules/helpers.js';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
]);

/** Which rules could possibly fire, based on a cheap scan of the raw text. */
export function prefilter(source, rules) {
  const candidates = [];
  for (const rule of rules) {
    if (!rule.prefilter || rule.prefilter.test(source)) candidates.push(rule);
  }
  return candidates;
}

function languageMatches(rule, language) {
  if (!rule.languages) return true;
  return rule.languages.includes(language);
}

export function analyze(options) {
  const {
    source,
    filePath,
    toolName = 'Write',
    toolInput = null,
    config,
    pkg = null,
    rules,
    wholeFile = false,
  } = options;

  const enabled = rules.filter((rule) => !config.isRuleDisabled(rule.id));
  if (enabled.length === 0) return { findings: [] };

  const candidates = prefilter(source, enabled);
  if (candidates.length === 0) return { findings: [] };

  const isVue = /\.vue$/i.test(String(filePath));
  const parsed = parseSource(source, filePath);

  // A single file component with only a template and no script is normal, and
  // the template rules still have work to do.
  if (parsed.error && !isVue) return { findings: [], parseError: parsed.error };

  const ast = parsed.ast ?? {
    type: 'Program',
    body: [],
    directives: [],
    comments: [],
    start: 0,
    end: source.length,
  };
  const language = parsed.language ?? 'js';

  const templateRules = isVue ? candidates.filter((rule) => rule.target === 'template') : [];

  // Template rules declare `vue` as their language, but the parsed language of
  // a single file component is the language of its script block, so they are
  // selected by file extension instead.
  const active = candidates.filter(
    (rule) => rule.target !== 'template' && languageMatches(rule, language),
  );

  if (active.length === 0 && templateRules.length === 0) return { findings: [] };

  const byNodeType = new Map();
  for (const rule of active) {
    if (rule.target === 'template') continue;
    for (const type of rule.nodeTypes ?? ['CallExpression']) {
      if (!byNodeType.has(type)) byNodeType.set(type, []);
      byNodeType.get(type).push(rule);
    }
  }

  const tainted = collectTaintedNames(ast);

  const functions = [];
  walk(ast, (node) => {
    if (FUNCTION_TYPES.has(node.type) && typeof node.start === 'number') functions.push(node);
    return undefined;
  });

  const functionFor = (node) => {
    let best = null;
    for (const fn of functions) {
      if (fn.start <= node.start && fn.end >= node.end) {
        if (best === null || fn.end - fn.start < best.end - best.start) best = fn;
      }
    }
    return best ?? ast;
  };

  const changed = wholeFile
    ? null
    : changedRangeFromToolInput(toolName, toolInput, source);
  const window = wholeFile ? null : reportWindow(ast, changed, source.length);

  const ctx = {
    source,
    filePath,
    language,
    pkg,
    config,
    isTainted: (node) => isTaintedExpr(node, tainted),
    describe: (node) => describeSource(node, tainted),
    hasGuardInScope: (node, patterns) => hasGuard(functionFor(node), patterns),
    functionFor,
    taintedNames: tainted,
    // Scratch space for rules that need to remember something across nodes in
    // one file, such as "only report the first route in this file".
    state: new Map(),
  };

  const suppressions = collectSuppressions(ast, source);
  const findings = [];
  const seen = new Set();

  walk(ast, (node, parent) => {
    const forType = byNodeType.get(node.type);
    if (!forType) return undefined;

    for (const rule of forType) {
      let hit;
      try {
        hit = rule.match(node, ctx, parent);
      } catch {
        // A broken rule must never take the hook down with it.
        continue;
      }
      if (!hit) continue;

      const target = hit.node ?? node;
      if (!rule.fileWide && !inWindow(target, window)) continue;

      const line = lineOf(source, target.start);
      const key = `${rule.id}:${line}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (suppressions.isSuppressed(rule.id, line)) continue;

      const severity = config.severityFor({ ...rule, severity: hit.severityHint ?? rule.severity });
      if (!meetsMinSeverity(severity, config.minSeverity)) continue;

      findings.push({
        ruleId: rule.id,
        title: rule.title,
        severity,
        owasp2025: rule.owasp2025,
        cwe: rule.cwe ?? [],
        api: rule.api ?? null,
        line,
        column: (target.loc?.start?.column ?? 0) + 1,
        evidence: snippet(source, target) || lineText(source, line),
        message: typeof rule.message === 'function' ? rule.message(hit) : rule.message,
        fix: rule.fix,
        filePath,
      });
    }

    return undefined;
  });

  // Vue templates are scanned separately. The script block has an AST, the
  // template does not, so these rules work on elements and attributes.
  if (templateRules.length > 0) {
    const elements = scanTemplate(source);

    for (const element of elements) {
      for (const rule of templateRules) {
        let hit;
        try {
          hit = rule.matchTemplate(element, ctx);
        } catch {
          continue;
        }
        if (!hit) continue;

        const offset = hit.offset ?? element.start;

        // Scope to the edit when we know where it was. A template finding has
        // no enclosing function to widen to, so the raw range is what we use.
        if (!wholeFile && changed && (offset < changed.start || offset > changed.end)) continue;

        const line = lineOf(source, offset);
        const key = `${rule.id}:${line}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (suppressions.isSuppressed(rule.id, line)) continue;

        const severity = config.severityFor({
          ...rule,
          severity: hit.severityHint ?? rule.severity,
        });
        if (!meetsMinSeverity(severity, config.minSeverity)) continue;

        findings.push({
          ruleId: rule.id,
          title: rule.title,
          severity,
          owasp2025: rule.owasp2025,
          cwe: rule.cwe ?? [],
          api: rule.api ?? null,
          line,
          column: 1,
          evidence: lineText(source, line),
          message: typeof rule.message === 'function' ? rule.message(hit) : rule.message,
          fix: rule.fix,
          filePath,
        });
      }
    }
  }

  // An ignore comment with no reason is itself worth one quiet line.
  for (const missing of suppressions.missingReason) {
    findings.push({
      ruleId: 'GJ-IGNORE',
      title: 'Suppression with no reason',
      severity: 'low',
      owasp2025: null,
      cwe: [],
      api: null,
      line: missing.line,
      column: 1,
      evidence: lineText(source, missing.line),
      message: `guardrails-js-ignore for ${missing.ids.join(', ')} has no reason. Add "-- why" so the next person knows it was a decision.`,
      fix: '// guardrails-js-ignore SQL-01 -- id is an integer from a validated route param',
      filePath,
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3, perf: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || a.line - b.line);

  return { findings, language, window };
}
