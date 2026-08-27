// Deciding whether an install is worth interrupting you for.
//
// Everything here is offline and takes about five milliseconds. Online lookups
// only add detail to a prompt this file already decided to show.

import fs from 'node:fs';
import path from 'node:path';

import { allows } from './allow.js';
import denylist from './data/denylist.json' with { type: 'json' };
import topPackages from './data/top-packages.json' with { type: 'json' };
import { parseSpecifier } from './parse-command.js';

const TOP_NAMES = new Set(topPackages.names);
const SUSPICIOUS = new Set(denylist.suspiciousNames);

/** Levenshtein distance, capped so we bail out early on obvious misses. */
export function editDistance(a, b, cap = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      current.push(value);
      if (value < rowMin) rowMin = value;
    }

    if (rowMin > cap) return cap + 1;
    previous = current;
  }

  return previous[b.length];
}

/** Fold characters that look alike so rn/m and l/1/I collapse together. */
export function foldLookalikes(name) {
  return String(name)
    .toLowerCase()
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/[1l|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/[-_.]/g, '');
}

export function nearestPopularName(name) {
  const lower = String(name).toLowerCase();
  if (TOP_NAMES.has(lower)) return null;

  const folded = foldLookalikes(lower);
  let best = null;

  for (const candidate of TOP_NAMES) {
    if (Math.abs(candidate.length - lower.length) > 2) continue;

    const distance = editDistance(lower, candidate, 2);
    if (distance <= 2 && distance > 0 && (best === null || distance < best.distance)) {
      best = { candidate, distance, reason: 'spelling' };
      if (distance === 1) break;
    }

    if (foldLookalikes(candidate) === folded && candidate !== lower) {
      best = { candidate, distance: 0, reason: 'lookalike characters' };
      break;
    }
  }

  return best;
}

/** Package names already present in the project, from manifests and lockfiles. */
export function knownPackageNames(projectRoot) {
  const names = new Set();

  const addAll = (object) => {
    if (!object) return;
    for (const key of Object.keys(object)) names.add(key);
  };

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    addAll(pkg.dependencies);
    addAll(pkg.devDependencies);
    addAll(pkg.peerDependencies);
    addAll(pkg.optionalDependencies);
  } catch {
    // no manifest, fine
  }

  const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json'];
  for (const file of lockfiles) {
    try {
      const lock = JSON.parse(fs.readFileSync(path.join(projectRoot, file), 'utf8'));
      addAll(lock.dependencies);
      for (const key of Object.keys(lock.packages ?? {})) {
        const cleaned = key.replace(/^node_modules\//, '').replace(/.*\/node_modules\//, '');
        if (cleaned) names.add(cleaned);
      }
    } catch {
      // not there
    }
  }

  for (const file of ['yarn.lock', 'pnpm-lock.yaml']) {
    try {
      const text = fs.readFileSync(path.join(projectRoot, file), 'utf8');
      const pattern = /^\s{0,4}"?(@?[a-z0-9][\w.-]*(?:\/[\w.-]+)?)"?@/gim;
      let match;
      while ((match = pattern.exec(text)) !== null) names.add(match[1]);
    } catch {
      // not there
    }
  }

  return names;
}

export function hasLockfile(projectRoot) {
  return ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'].some(
    (file) => fs.existsSync(path.join(projectRoot, file)),
  );
}

function versionIsPinned(version) {
  if (!version) return false;
  if (version === 'latest' || version === '*' || version === 'next') return false;
  return /^\d+\.\d+\.\d+/.test(version);
}

/**
 * Score one install command. Returns { prompt, reasons, packages } where
 * reasons is a list of plain sentences that go straight into the prompt text.
 */
export function evaluateInstall(install, context) {
  const { projectRoot } = context;
  const known = context.known ?? knownPackageNames(projectRoot);

  const reasons = [];
  const packages = [];
  let weightHigh = 0;
  let weightLow = 0;
  let block = false;

  const ignoresScripts = install.flags.some(
    (flag) => flag === '--ignore-scripts' || flag.startsWith('--ignore-scripts='),
  );
  const isGlobal = install.flags.some((flag) => flag === '-g' || flag === '--global');

  for (const spec of install.packages) {
    const parsed = parseSpecifier(spec);
    packages.push(parsed);

    const lower = parsed.name.toLowerCase();

    if (parsed.kind === 'remote' || parsed.kind === 'path') {
      reasons.push(`"${spec}" is installed straight from a ${parsed.kind === 'path' ? 'local path' : 'URL or git repo'}, so the registry never sees it and no version is recorded`);
      weightHigh += 1;
      continue;
    }

    const entry = denylist.packages[lower];
    if (entry) {
      if (!parsed.version || entry.versions.includes(parsed.version)) {
        const incident = denylist.incidents[entry.incident];
        reasons.push(
          `${lower} has known compromised releases (${entry.versions.join(', ')}): ${incident?.description ?? 'known bad release'}`,
        );
        weightHigh += 1;
        // Shipped malware. There is no version of this worth prompting about,
        // and a prompt is swallowed anyway by an allow rule covering npm.
        if (!allows(context.allowPackages, lower, parsed.version)) block = true;
        continue;
      }
    }

    if (SUSPICIOUS.has(lower)) {
      const imitates = nearestPopularName(lower);
      reasons.push(
        imitates
          ? `${lower} is a name used in past typosquatting campaigns, imitating "${imitates.candidate}"`
          : `${lower} is a name used in past typosquatting campaigns`,
      );
      weightHigh += 1;
      continue;
    }

    const near = nearestPopularName(lower);
    if (near) {
      reasons.push(
        `"${lower}" is ${near.reason === 'lookalike characters' ? 'a lookalike of' : `one or two letters away from`} "${near.candidate}". Check you meant the one you typed.`,
      );
      weightHigh += 1;
      continue;
    }

    const isKnownHere = known.has(parsed.name);
    const isPopular = TOP_NAMES.has(lower);

    if (!isKnownHere && !isPopular) {
      reasons.push(
        `${parsed.name} is not in this project already and is not a package I recognise. If an assistant suggested the name, confirm it exists before installing, because attackers register made up names.`,
      );
      weightLow += ignoresScripts ? 1 : 2;
      continue;
    }

    if (!isKnownHere && !versionIsPinned(parsed.version)) {
      reasons.push(`${parsed.name} is new here and unpinned, so you get whatever version was published most recently`);
      weightLow += 1;
    }
  }

  if (install.manager === 'npx' && packages.length > 0) {
    const unknown = packages.filter((p) => !TOP_NAMES.has(p.name.toLowerCase()) && !known.has(p.name));
    if (unknown.length > 0) {
      reasons.push('npx downloads and runs the package immediately, so there is no window to review it');
      weightHigh += 1;
    }
  }

  if (isGlobal && reasons.length > 0) {
    reasons.push('this is a global install, so it affects every project on this machine');
    weightLow += 1;
  }

  if (!ignoresScripts && weightHigh + weightLow > 0) {
    reasons.push(
      'install scripts are not disabled, so any preinstall or postinstall in the package tree runs with your permissions',
    );
  }

  if (!hasLockfile(projectRoot) && install.packages.length > 0) {
    reasons.push('this project has no lockfile, so the exact versions installed are not recorded anywhere');
    weightLow += 1;
  }

  return {
    prompt: weightHigh > 0 || weightLow >= 2,
    block,
    reasons,
    packages,
    ignoresScripts,
    isGlobal,
  };
}

export { allows, denylist, TOP_NAMES };
