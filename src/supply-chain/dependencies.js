// Version range checks.
//
// Some problems are not visible in your code at all. A middleware bypass, an
// exposed dev server, or a vulnerable server component package is a property of
// the version you installed. Source scanning cannot find those, so this reads
// the manifest and the lockfile instead.

import fs from 'node:fs';
import path from 'node:path';

import advisoriesData from './data/framework-advisories.json' with { type: 'json' };

/** Exact versions from the lockfile, which beats guessing from a range. */
export function readLockedVersions(projectRoot) {
  const found = new Map();

  for (const file of ['package-lock.json', 'npm-shrinkwrap.json']) {
    let lock;
    try {
      lock = JSON.parse(fs.readFileSync(path.join(projectRoot, file), 'utf8'));
    } catch {
      continue;
    }

    for (const [key, value] of Object.entries(lock.packages ?? {})) {
      const name = key.replace(/^node_modules\//, '').replace(/.*\/node_modules\//, '');
      if (name && value?.version && !found.has(name)) found.set(name, value.version);
    }
    for (const [name, value] of Object.entries(lock.dependencies ?? {})) {
      if (value?.version && !found.has(name)) found.set(name, value.version);
    }
  }

  return found;
}

/** Split a version string into numbers. Prerelease tags are dropped. */
export function parseVersion(value) {
  if (!value) return null;
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(String(value));
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  const short = /(\d+)\.(\d+)/.exec(String(value));
  if (short) return [Number(short[1]), Number(short[2]), 0];
  const major = /(\d+)/.exec(String(value));
  if (major) return [Number(major[1]), 0, 0];
  return null;
}

export function compareVersions(a, b) {
  const left = Array.isArray(a) ? a : parseVersion(a);
  const right = Array.isArray(b) ? b : parseVersion(b);
  if (!left || !right) return 0;

  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/**
 * The lowest version a range allows. `^15.1.0` allows 15.1.0 upwards, so the
 * lowest is 15.1.0. Used only when there is no lockfile to read.
 */
export function rangeMinimum(range) {
  if (!range) return null;
  const text = String(range).trim();
  if (text === '*' || text === 'latest' || text === '') return null;
  if (/^(file|link|workspace|git|github|https?):/i.test(text)) return null;
  return parseVersion(text);
}

function fixFor(advisory, version) {
  const [major, minor] = version;

  // Prefer a rule that names the exact minor line, then fall back to the major.
  const exact = advisory.fixes.find((fix) => fix.major === major && fix.minor === minor);
  if (exact) return exact;

  const byMajor = advisory.fixes.find((fix) => fix.major === major && fix.minor === undefined);
  if (byMajor) return byMajor;

  // A major line older than anything listed. Only call that affected when the
  // advisory says so. Guessing here means telling someone on Next 14 they have
  // a bug we have no fix version for, which is not useful.
  const majors = advisory.fixes.map((fix) => fix.major);
  if (major < Math.min(...majors)) {
    return advisory.affectsOlderMajors ? { major, fixed: null, tooOld: true } : null;
  }

  // A minor line inside a listed major that we have no rule for. If the major
  // is listed at all and this minor is below the highest fixed minor, treat it
  // as affected so we do not quietly miss it.
  const sameMajor = advisory.fixes.filter((fix) => fix.major === major);
  if (sameMajor.length > 0) {
    const highest = sameMajor.reduce((best, fix) =>
      compareVersions(fix.fixed, best.fixed) > 0 ? fix : best,
    );
    if (minor < (highest.minor ?? 0)) return highest;
  }

  return null;
}

/**
 * Check one package version against the advisory list.
 * Returns an array of matched advisories.
 */
export function checkPackage(name, version, advisories = advisoriesData.advisories) {
  const parsed = Array.isArray(version) ? version : parseVersion(version);
  if (!parsed) return [];

  const matches = [];

  for (const advisory of advisories) {
    if (advisory.package !== name) continue;

    const fix = fixFor(advisory, parsed);
    if (!fix) continue;

    if (fix.tooOld) {
      matches.push({ ...advisory, installed: parsed.join('.'), fixed: null });
      continue;
    }

    if (compareVersions(parsed, fix.fixed) < 0) {
      matches.push({ ...advisory, installed: parsed.join('.'), fixed: fix.fixed });
    }
  }

  return matches;
}

/**
 * Check every dependency. `locked` is a map of name to exact version read from
 * the lockfile, which is accurate. When there is no lockfile we fall back to
 * the lowest version the range allows and say so, because a range such as
 * ^15.1.0 might resolve to something already patched.
 */
export function checkDependencies(pkg, locked = new Map()) {
  if (!pkg) return [];

  const declared = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };

  const seen = new Set();
  const findings = [];

  const consider = (name, version, exact) => {
    const key = `${name}@${version}`;
    if (seen.has(key)) return;
    seen.add(key);

    for (const match of checkPackage(name, version)) {
      findings.push({
        ruleId: match.package === 'next' ? 'NEXT-VER' : match.package.startsWith('react-server-dom') ? 'RSC-VER' : match.package === 'nuxt' ? 'NUXT-VER' : 'VITE-VER',
        package: name,
        advisory: match.id,
        severity: exact ? match.severity : downgrade(match.severity),
        title: match.title,
        summary: match.summary,
        action: match.action,
        installed: match.installed,
        fixed: match.fixed,
        exact,
      });
    }
  };

  // The lockfile is the truth when we have it.
  for (const [name, version] of locked) consider(name, version, true);

  for (const [name, range] of Object.entries(declared)) {
    if (locked.has(name)) continue;
    const min = rangeMinimum(range);
    if (!min) continue;
    consider(name, min, false);
  }

  return findings;
}

function downgrade(severity) {
  if (severity === 'critical') return 'high';
  if (severity === 'high') return 'medium';
  return 'low';
}

/** One line of text per finding, for the priming block and the report. */
export function describeDependencyFinding(finding) {
  const version = finding.exact
    ? `${finding.package}@${finding.installed}`
    : `${finding.package} (range allows ${finding.installed})`;

  const fix = finding.fixed
    ? `Upgrade to ${finding.fixed} or later.`
    : 'This major version line has no fix. Move to a supported one.';

  return `${finding.ruleId} ${version}: ${finding.title} (${finding.advisory}). ${finding.summary} ${fix} ${finding.action}`;
}

export { advisoriesData };
