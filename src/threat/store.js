import path from 'node:path';
import fs from 'node:fs';
import semver from 'semver';
import { snapshot, dataRoot, writeJson } from './paths.js';
import { openDatabase } from './sqlite.js';

export const SCHEMA_VERSION = 1;
export function affectedBy(record, version) {
  if (!version || version === 'latest' || version === '*') return true;
  if (record.versions.includes(version)) return true;
  const exact = semver.valid(version);
  if (!exact) return false;
  return record.ranges.some(range => {
    if (range.type !== 'SEMVER') return false;
    let introduced = null;
    for (const event of range.events) {
      if (event.introduced !== undefined) introduced = event.introduced;
      const upper = event.fixed ?? event.last_affected ?? event.limit;
      if (upper !== undefined) {
        const afterStart = introduced === '0' || (semver.valid(introduced) && semver.gte(exact, introduced));
        const beforeEnd = semver.valid(upper) && (event.last_affected !== undefined ? semver.lte(exact, upper) : semver.lt(exact, upper));
        if (afterStart && beforeEnd) return true;
        introduced = null;
      }
    }
    return Boolean(introduced === '0' || (semver.valid(introduced) && semver.gte(exact, introduced)));
  });
}

export async function lookupThreats(names, file = snapshot().file) {
  const result = new Map();
  const unique = [...new Set(names.filter(Boolean))];
  if (!unique.length) return result;
  let db;
  try {
    db = await openDatabase(file);
    await db.exec('PRAGMA trusted_schema=OFF;');
    for (let i = 0; i < unique.length; i += 200) {
      const batch = unique.slice(i, i + 200);
      const rows = await db.all(`SELECT name, record FROM threats WHERE name IN (${batch.map(() => '?').join(',')})`, batch);
      for (const row of rows) {
        const records = result.get(row.name) || [];
        records.push(JSON.parse(row.record));
        result.set(row.name, records);
      }
    }
    try { fs.unlinkSync(path.join(dataRoot(), 'store-error.json')); } catch {}
  } catch (error) {
    try { writeJson(path.join(dataRoot(), 'store-error.json'), { at: Date.now(), error: error.message }); } catch {}
    result.unavailable = error.message;
  } finally { if (db) await db.close(); }
  return result;
}

export async function popularNames() {
  let db;
  try {
    db = await openDatabase(snapshot().file);
    return (await db.all('SELECT name FROM popular ORDER BY name')).map(row => row.name);
  } catch { return null; } finally { if (db) await db.close(); }
}
