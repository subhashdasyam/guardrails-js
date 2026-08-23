// Rebuilds the offline threat data from public sources.
//
// Run by .github/workflows/threat-data.yml on a schedule, which opens a pull
// request with the result. Never run at hook time: a security tool that fetches
// its rules at runtime is a remote code path into the thing meant to protect
// you.
//
//   node scripts/refresh-threat-data.mjs --osv-dir <dir> [--skip-popular]
//
// --osv-dir points at an unpacked copy of the OSV npm feed:
//   https://osv-vulnerabilities.storage.googleapis.com/npm/all.zip

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, 'src', 'supply-chain', 'data');

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const today = new Date().toISOString().slice(0, 10);

/** Pull malicious package advisories (MAL- ids) out of the OSV npm feed. */
function collectMalicious(osvDir) {
  const found = new Map();
  let scanned = 0;

  const files = fs.readdirSync(osvDir).filter((name) => name.endsWith('.json'));

  for (const name of files) {
    let advisory;
    try {
      advisory = JSON.parse(fs.readFileSync(path.join(osvDir, name), 'utf8'));
    } catch {
      continue;
    }
    scanned += 1;

    const isMalicious =
      String(advisory.id).startsWith('MAL-') ||
      (advisory.database_specific?.malicious ?? false) ||
      /malicious|backdoor|credential steal|crypto ?stealer/i.test(advisory.summary ?? '');

    if (!isMalicious) continue;

    for (const affected of advisory.affected ?? []) {
      if (affected.package?.ecosystem !== 'npm') continue;
      const pkg = affected.package.name;
      if (!pkg) continue;

      const versions = new Set(found.get(pkg)?.versions ?? []);
      for (const version of affected.versions ?? []) versions.add(version);

      found.set(pkg, {
        versions: [...versions].sort(),
        incident: 'osv-malicious',
        advisory: advisory.id,
      });
    }
  }

  process.stdout.write(`scanned ${scanned} advisories, found ${found.size} malicious packages\n`);
  return found;
}

/** Popular package names, used for typosquat distance. */
async function collectPopular(limit = 5000) {
  const names = new Set();
  const terms = 'abcdefghijklmnopqrstuvwxyz'.split('');

  for (const term of terms) {
    for (let from = 0; from < 500 && names.size < limit; from += 250) {
      const url = `https://registry.npmjs.org/-/v1/search?text=${term}&size=250&from=${from}&popularity=1.0&quality=0.0&maintenance=0.0`;
      try {
        const response = await fetch(url);
        if (!response.ok) break;
        const json = await response.json();
        for (const entry of json.objects ?? []) {
          const name = entry.package?.name;
          if (name) names.add(name);
        }
        if ((json.objects ?? []).length < 250) break;
      } catch {
        break;
      }
    }
    if (names.size >= limit) break;
  }

  process.stdout.write(`collected ${names.size} popular package names\n`);
  return [...names].sort().slice(0, limit);
}

async function main() {
  const osvDir = arg('--osv-dir');

  if (osvDir) {
    const existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'denylist.json'), 'utf8'));
    const discovered = collectMalicious(osvDir);

    // Curated entries stay. Automated entries are added, never removed by hand.
    for (const [name, entry] of discovered) {
      if (existing.packages[name]) {
        const merged = new Set([...existing.packages[name].versions, ...entry.versions]);
        existing.packages[name].versions = [...merged].sort();
        continue;
      }
      existing.packages[name] = entry;
    }

    existing.incidents['osv-malicious'] = existing.incidents['osv-malicious'] ?? {
      description: 'Reported to the OSV malicious packages feed.',
      reference: 'https://github.com/ossf/malicious-packages',
    };
    existing.updated = today;

    fs.writeFileSync(
      path.join(dataDir, 'denylist.json'),
      `${JSON.stringify(existing, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`denylist now holds ${Object.keys(existing.packages).length} packages\n`);
  }

  if (!process.argv.includes('--skip-popular')) {
    const names = await collectPopular();
    if (names.length > 500) {
      const existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'top-packages.json'), 'utf8'));
      const merged = [...new Set([...existing.names, ...names])].sort();
      fs.writeFileSync(
        path.join(dataDir, 'top-packages.json'),
        `${JSON.stringify({ ...existing, updated: today, names: merged }, null, 2)}\n`,
        'utf8',
      );
      process.stdout.write(`top-packages now holds ${merged.length} names\n`);
    } else {
      process.stdout.write('too few names returned, leaving top-packages.json alone\n');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
