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

/** Turn online facts into extra sentences for the prompt. */
export async function enrich(packages, timeoutMs = 2000) {
  const notes = [];
  const now = Date.now();

  const registry = ['npm', 'osv'];
  void registry;

  const [osvResults, registryResults] = await Promise.all([
    queryOsv(packages, timeoutMs, now),
    Promise.all(packages.slice(0, 4).map((pkg) => queryRegistry(pkg.name, timeoutMs, now))),
  ]);

  packages.slice(0, 4).forEach((pkg, index) => {
    const info = registryResults[index];

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

  for (const [name, ids] of osvResults) {
    if (ids && ids.length > 0) {
      notes.push(`${name} has open advisories: ${ids.join(', ')}`);
    }
  }

  return notes;
}
