// Advisories for the versions a manifest pins.
//
// The advisory lookup used to live only in the npm install gate, driven by the
// specifiers on the command line. So a package.json could declare six versions
// carrying two criticals and nothing was ever said: writing it produced a
// generic note about install scripts, and `npm install` with no arguments named
// no packages at all, so the lookup never ran.
//
// The four manifest rules do not close this. SUPPLY-DENY is the only one that
// reads versions and it matches a bundled list of releases known to have
// shipped malware, which an ordinary CVE will never be on.

import { advisoryNotes, BLOCKING_SEVERITIES } from './osv.js';
import { allows } from './allow.js';

/**
 * Exact pins only.
 *
 * A range is not a version. "^4.16.0" installs the newest 4.x, so an advisory
 * against 4.16.0 usually does not describe what lands, and reporting it would
 * be a false positive on the most common way to declare a dependency. An exact
 * pin is a decision about one release and can be answered exactly. This is the
 * same convention SUPPLY-DENY already uses.
 */
const EXACT = /^\d+\.\d+\.\d+$/;

/** How many to look up before the cost of one write stops being worth it. */
export const LOOKUP_CAP = 10;

export function pinnedDependencies(pkg) {
  const declared = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const pinned = [];

  for (const [name, range] of Object.entries(declared)) {
    const version = String(range ?? '').trim();
    if (!EXACT.test(version)) continue;
    pinned.push({ name, version });
  }

  return pinned;
}

/**
 * Worst first.
 *
 * advisoryNotes answers in the order it was asked, which is manifest order, and
 * callers that summarise only the first few would then lead with whichever
 * dependency happened to be declared first. In the manifest that prompted this,
 * that was express at MODERATE, ahead of a CRITICAL in lodash.
 */
const RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };

export function worstFirst(notes) {
  return [...notes].sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9));
}

/**
 * Advisories against what this manifest pins, worst first.
 *
 * Returns { notes, checked, skipped }. `skipped` is how many pins went
 * unchecked because of the cap, which the caller has to say out loud: a gate
 * that quietly examines fewer than it was given reads as a clean bill of health.
 */
export async function manifestAdvisories(pkg, config, timeoutMs = 3000, deadlineMs = 6000) {
  const pinned = pinnedDependencies(pkg);
  if (pinned.length === 0) return { notes: [], checked: 0, skipped: 0 };

  const checking = pinned.slice(0, LOOKUP_CAP);

  // A deadline for the whole pass, not just each request.
  //
  // The lookups run one after another, so ten pins against a slow network is
  // ten timeouts end to end. On SessionStart that overruns the hook's own
  // timeout, the process is killed, and the priming that always worked is lost
  // because of an optional lookup. Whatever has not answered by here is worth
  // less than starting the session on time.
  const notes = await Promise.race([
    advisoryNotes(checking, timeoutMs, Date.now(), LOOKUP_CAP),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve([]), deadlineMs);
      timer.unref?.();
    }),
  ]);

  const kept = notes.filter((note) => !allows(config.allowPackages, note.name, note.version));

  return {
    notes: worstFirst(kept),
    checked: checking.length,
    skipped: pinned.length - checking.length,
  };
}

/** OSV severities do not match the plugin's own scale, so map them once. */
export function findingSeverity(advisorySeverity) {
  return BLOCKING_SEVERITIES.has(advisorySeverity) ? advisorySeverity.toLowerCase() : 'medium';
}
