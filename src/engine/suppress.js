// Inline suppression comments.
//
//   // guardrails-js-ignore SQL-01 -- bound through the query helper
//   // guardrails-js-ignore-file SECRET-01 -- test fixture, fake keys only
//
// The reason after `--` is required. An ignore with no reason gets reported
// itself, at low severity, so suppressions stay reviewable.

const LINE_PATTERN = /guardrails-js-ignore(-file)?\s+([A-Za-z0-9_.,\s-]+?)\s*(?:--\s*(.*))?$/;

export function collectSuppressions(ast, source) {
  const byLine = new Map(); // line number -> Set of rule ids
  const fileWide = new Set();
  const missingReason = [];

  const comments = ast?.comments ?? [];

  for (const comment of comments) {
    const raw = String(comment.value ?? '').trim();
    if (!raw.includes('guardrails-js-ignore')) continue;

    const match = LINE_PATTERN.exec(raw);
    if (!match) continue;

    const isFileWide = Boolean(match[1]);
    const ids = match[2]
      .split(/[\s,]+/)
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean);
    const reason = (match[3] ?? '').trim();

    const line = comment.loc?.start?.line ?? 1;

    if (!reason) {
      missingReason.push({ line, ids });
      // Still honour it. Nagging about the reason should not also mean the
      // original finding comes back and drowns out the point.
    }

    if (isFileWide) {
      for (const id of ids) fileWide.add(id);
      continue;
    }

    // Applies to the comment's own line and the line below it, which covers
    // both `code // ignore` and a comment sitting above the code.
    for (const target of [line, line + 1]) {
      if (!byLine.has(target)) byLine.set(target, new Set());
      for (const id of ids) byLine.get(target).add(id);
    }
  }

  return {
    isSuppressed(ruleId, line) {
      const id = String(ruleId).toUpperCase();
      if (fileWide.has(id) || fileWide.has('ALL')) return true;
      const set = byLine.get(line);
      if (!set) return false;
      return set.has(id) || set.has('ALL');
    },
    missingReason,
  };
}
