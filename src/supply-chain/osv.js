// Optional online lookups.
//
// These never decide anything on their own. The offline signals already made
// the call; this only adds detail to the prompt. Every failure is swallowed,
// because a slow network must not turn into a slow session.
//
// Privacy: this sends package names to api.osv.dev and registry.npmjs.org. Set
// "network": false in .guardrails-js.json to stop it.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cacheDir() {
  const base =
    process.env.CLAUDE_PLUGIN_DATA ||
    path.join(os.homedir(), '.claude', 'plugins', 'data', 'guardrails-js');
  return path.join(base, 'cache');
}

function cacheFile(key) {
  const safe = String(key).replace(/[^A-Za-z0-9_.@-]/g, '-');
  return path.join(cacheDir(), `${safe}.json`);
}

function readCache(key, now) {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFile(key), 'utf8'));
    if (now - raw.at > CACHE_TTL_MS) return null;
    return raw.value;
  } catch {
    return null;
  }
}

function writeCache(key, value, now) {
  try {
    fs.mkdirSync(cacheDir(), { recursive: true });
    const file = cacheFile(key);
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ at: now, value }), 'utf8');
    fs.renameSync(temp, file);
  } catch {
    // cache is optional
  }
}

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask OSV whether these exact packages have advisories. */
export async function queryOsv(packages, timeoutMs = 2000, now = Date.now()) {
  if (packages.length === 0) return new Map();

  const results = new Map();
  const toAsk = [];

  for (const pkg of packages) {
    const key = `osv-${pkg.name}@${pkg.version ?? 'any'}`;
    const cached = readCache(key, now);
    if (cached !== null) results.set(pkg.name, cached);
    else toAsk.push(pkg);
  }

  if (toAsk.length === 0) return results;

  const body = {
    queries: toAsk.map((pkg) =>
      pkg.version
        ? { package: { name: pkg.name, ecosystem: 'npm' }, version: pkg.version }
        : { package: { name: pkg.name, ecosystem: 'npm' } },
    ),
  };

  const json = await fetchJson(
    'https://api.osv.dev/v1/querybatch',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  if (!json?.results) return results;

  json.results.forEach((entry, index) => {
    const pkg = toAsk[index];
    if (!pkg) return;
    const ids = (entry.vulns ?? []).map((vuln) => vuln.id).slice(0, 5);
    results.set(pkg.name, ids);
    writeCache(`osv-${pkg.name}@${pkg.version ?? 'any'}`, ids, now);
  });

  return results;
}

/** Registry facts that say how new and how used a package is. */
export async function queryRegistry(name, timeoutMs = 2000, now = Date.now()) {
  const key = `npm-${name}`;
  const cached = readCache(key, now);
  if (cached !== null) return cached;

  const json = await fetchJson(
    `https://registry.npmjs.org/${encodeURIComponent(name).replace('%40', '@')}`,
    { headers: { accept: 'application/json' } },
    timeoutMs,
  );

  if (!json) return null;

  const latest = json['dist-tags']?.latest ?? null;
  const times = json.time ?? {};
  const latestPublished = latest ? times[latest] : null;

  const value = {
    exists: true,
    latest,
    created: times.created ?? null,
    latestPublished,
    ageDays: latestPublished
      ? Math.floor((now - new Date(latestPublished).getTime()) / 86_400_000)
      : null,
    versionCount: Object.keys(json.versions ?? {}).length,
    repository: json.repository?.url ?? null,
    deprecated: Boolean(json.versions?.[latest]?.deprecated),
  };

  writeCache(key, value, now);
  return value;
}

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };

function compare(a, b) {
  const left = String(a).match(/\d+/g)?.map(Number) ?? [];
  const right = String(b).match(/\d+/g)?.map(Number) ?? [];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

/**
 * Full advisories for one exact version, with the versions each was fixed in.
 * The batch endpoint returns ids only, which is not enough to tell an advisory
 * you can act on from one you cannot.
 */
export async function queryOsvDetailed(name, version, timeoutMs = 2000, now = Date.now()) {
  const key = `osvfull-${name}@${version}`;
  const cached = readCache(key, now);
  if (cached !== null) return cached;

  const json = await fetchJson(
    'https://api.osv.dev/v1/query',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ package: { name, ecosystem: 'npm' }, version }),
    },
    timeoutMs,
  );

  if (!json) return [];

  const advisories = (json.vulns ?? []).map((vuln) => {
    const fixed = [];
    for (const affected of vuln.affected ?? []) {
      if (affected.package?.name !== name) continue;
      for (const range of affected.ranges ?? []) {
        for (const event of range.events ?? []) {
          if (event.fixed) fixed.push(event.fixed);
        }
      }
    }
    return {
      id: vuln.id,
      severity: String(vuln.database_specific?.severity ?? '').toUpperCase() || 'UNKNOWN',
      fixed,
    };
  });

  writeCache(key, advisories, now);
  return advisories;
}

/**
 * Advisories worth interrupting someone for.
 *
 * An advisory whose only fix is a version nobody has published yet is not
 * actionable: there is nothing to upgrade to, so saying it out loud teaches
 * people to click through. lodash 4.17.21 is the case that proves it. It is the
 * current release and it carries three advisories, all fixed in 4.17.23 or
 * 4.18.0, neither of which exists. Reporting those would fire on the most
 * installed package in the ecosystem, every time, with no action available.
 */
export function actionableAdvisories(advisories, latestPublished) {
  if (!latestPublished) return [];

  return advisories
    .filter((advisory) =>
      advisory.fixed.some((fix) => compare(fix, latestPublished) <= 0),
    )
    .sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
    );
}

/**
 * Advisories for what is actually about to be installed. An explicit version is
 * checked as given, an unpinned install is checked against whatever latest
 * resolves to right now.
 */
export async function advisoryNotes(packages, timeoutMs = 2000, now = Date.now()) {
  const notes = [];

  for (const pkg of packages.slice(0, 4)) {
    const info = await queryRegistry(pkg.name, timeoutMs, now);
    if (!info?.latest) continue;

    const version = pkg.version ?? info.latest;
    const advisories = await queryOsvDetailed(pkg.name, version, timeoutMs, now);
    const actionable = actionableAdvisories(advisories, info.latest);
    if (actionable.length === 0) continue;

    const worst = actionable[0];
    const upgrade = worst.fixed
      .filter((fix) => compare(fix, info.latest) <= 0)
      .sort(compare)
      .pop();

    notes.push(
      `${pkg.name}@${version} has ${actionable.length} known ${
        actionable.length === 1 ? 'advisory' : 'advisories'
      } with a fix available, worst is ${worst.severity} ${worst.id}. Upgrade to ${upgrade} or later.`,
    );
  }

  return notes;
}

/** Registry facts about how new and how used a package is. */
export async function enrich(packages, timeoutMs = 2000) {
  const notes = [];
  const now = Date.now();

  const results = await Promise.all(
    packages.slice(0, 4).map((pkg) => queryRegistry(pkg.name, timeoutMs, now)),
  );

  packages.slice(0, 4).forEach((pkg, index) => {
    const info = results[index];

    if (info === null) {
      notes.push(`${pkg.name} was not found on the npm registry, or the lookup timed out`);
      return;
    }

    if (info.ageDays !== null && info.ageDays <= 7) {
      notes.push(`${pkg.name} published its latest version ${info.ageDays} day(s) ago`);
    }
    if (info.versionCount <= 2) {
      notes.push(`${pkg.name} has only ${info.versionCount} published version(s)`);
    }
    if (!info.repository) {
      notes.push(`${pkg.name} lists no source repository`);
    }
    if (info.deprecated) {
      notes.push(`${pkg.name} latest version is marked deprecated`);
    }
  });

  return notes;
}
