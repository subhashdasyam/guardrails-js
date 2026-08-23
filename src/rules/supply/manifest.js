// Supply chain rules. OWASP A03:2025, Software Supply Chain Failures.
//
// These do not look at a syntax tree. Whether a lockfile exists, whether
// install scripts are allowed to run, and whether anybody ever verifies a
// signature are properties of a project, not of any line of code. They get the
// same rule shape as everything else so they carry ids, severities, and OWASP
// mappings, and so they show up in the report next to the rest.
//
// Each rule takes a manifest context instead of an AST node:
//
//   { projectRoot, pkg, locked, npmrc, hasLockfile, lockfileName, read }

import denylist from '../../supply-chain/data/denylist.json' with { type: 'json' };

const CI_INSTALL = /\bnpm\s+install\b|\bnpm\s+i\b(?!\w)/;

export const SUPPLY_LOCK = {
  id: 'SUPPLY-LOCK',
  title: 'Dependency versions are not pinned by a lockfile',
  severity: 'medium',
  owasp2025: 'A03',
  cwe: ['CWE-1357', 'CWE-829'],
  target: 'manifest',
  matchManifest(ctx) {
    const problems = [];

    if (!ctx.hasLockfile) {
      problems.push('there is no lockfile, so nothing records the exact versions that were installed');
    }

    if (/^\s*package-lock\s*=\s*false/im.test(ctx.npmrc)) {
      problems.push('.npmrc sets package-lock=false, which turns lockfile writing off');
    }

    for (const [name, body] of Object.entries(ctx.pkg?.scripts ?? {})) {
      if (typeof body !== 'string') continue;
      if (!CI_INSTALL.test(body)) continue;
      if (/--no-package-lock/.test(body)) {
        problems.push(`the "${name}" script passes --no-package-lock`);
      }
    }

    if (problems.length === 0) return null;
    return { problems };
  },
  message: (f) => {
    const joined = f.problems.join(', and ');
    return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. Without a lockfile every install can resolve to a different tree, so a compromised release reaches you silently and nobody can tell what you shipped.`;
  },
  fix: 'npm install once, commit package-lock.json, then use npm ci everywhere else.',
};

export const SUPPLY_SCRIPTS = {
  id: 'SUPPLY-SCRIPTS',
  title: 'Install scripts are allowed to run',
  severity: 'medium',
  owasp2025: 'A03',
  cwe: ['CWE-829', 'CWE-94'],
  target: 'manifest',
  matchManifest(ctx) {
    const dependencyCount =
      Object.keys(ctx.pkg?.dependencies ?? {}).length +
      Object.keys(ctx.pkg?.devDependencies ?? {}).length;

    if (dependencyCount === 0) return null;

    // Turned off for the whole project is the fix.
    if (/^\s*ignore-scripts\s*=\s*true/im.test(ctx.npmrc)) return null;

    const scripts = Object.entries(ctx.pkg?.scripts ?? {});
    const guarded = scripts.some(
      ([, body]) => typeof body === 'string' && /--ignore-scripts/.test(body),
    );
    if (guarded) return null;

    const ownHooks = scripts
      .filter(([name]) => /^(pre|post)?install$/.test(name) || name === 'prepare')
      .map(([name]) => name);

    return { dependencyCount, ownHooks };
  },
  message: (f) =>
    `Nothing in this project disables install scripts, and there are ${f.dependencyCount} dependencies.${
      f.ownHooks.length > 0 ? ` This package also defines ${f.ownHooks.join(' and ')}.` : ''
    } Installing runs code from every package in the tree with your permissions, before you have read any of it.`,
  fix: 'npm config set ignore-scripts true --location=project\n# then run the few packages that genuinely need a build step on purpose',
};

export const SUPPLY_DENY = {
  id: 'SUPPLY-DENY',
  title: 'A known compromised release is installed',
  severity: 'critical',
  owasp2025: 'A03',
  cwe: ['CWE-506', 'CWE-829'],
  target: 'manifest',
  matchManifest(ctx) {
    const hits = [];

    for (const [name, version] of ctx.locked) {
      const entry = denylist.packages[name];
      if (!entry) continue;
      if (!entry.versions.includes(version)) continue;
      hits.push({ name, version, incident: denylist.incidents[entry.incident] });
    }

    // A manifest pinned to a bad exact version counts even with no lockfile.
    for (const [name, range] of Object.entries({
      ...(ctx.pkg?.dependencies ?? {}),
      ...(ctx.pkg?.devDependencies ?? {}),
    })) {
      if (ctx.locked.has(name)) continue;
      const entry = denylist.packages[name];
      if (!entry) continue;
      const exact = /^\d+\.\d+\.\d+$/.test(String(range).trim()) ? String(range).trim() : null;
      if (!exact || !entry.versions.includes(exact)) continue;
      hits.push({ name, version: exact, incident: denylist.incidents[entry.incident] });
    }

    if (hits.length === 0) return null;
    return { hits };
  },
  message: (f) => {
    const listed = f.hits.map((hit) => `${hit.name}@${hit.version}`).join(', ');
    const why = f.hits[0].incident?.description ?? 'Published with malicious code.';
    return `${listed} is a release known to have shipped malicious code. ${why} Assume anything this machine could read has been taken.`;
  },
  fix: 'Upgrade past the affected version, delete node_modules, reinstall from a clean checkout, and rotate every npm, cloud, and git credential this machine has touched.',
};

const VERIFIES_PROVENANCE = /npm\s+audit\s+signatures|--provenance|cosign\s+verify|slsa-verifier|sigstore/;

export const SUPPLY_PROV = {
  id: 'SUPPLY-PROV',
  title: 'Package signatures are never verified',
  severity: 'low',
  owasp2025: 'A03',
  cwe: ['CWE-345', 'CWE-494'],
  target: 'manifest',
  matchManifest(ctx) {
    const dependencyCount = Object.keys(ctx.pkg?.dependencies ?? {}).length;
    if (dependencyCount === 0) return null;

    const scripts = Object.values(ctx.pkg?.scripts ?? {}).join('\n');
    if (VERIFIES_PROVENANCE.test(scripts)) return null;

    // Look at CI too. Most projects verify there rather than in a script.
    const workflows = ctx.read('.github/workflows');
    if (workflows && VERIFIES_PROVENANCE.test(workflows)) return null;

    return { dependencyCount };
  },
  message: (f) =>
    `Nothing in this project ever checks that its ${f.dependencyCount} dependencies came from where they claim. Registry signatures and provenance attestations exist and go unread unless something asks for them.`,
  fix: 'npm audit signatures\n# add it to CI, so a tampered tarball fails the build rather than shipping',
};

export default [SUPPLY_LOCK, SUPPLY_SCRIPTS, SUPPLY_DENY, SUPPLY_PROV];
