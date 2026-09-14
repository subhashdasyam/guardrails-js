import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { openDatabase, ensureDriver } from './sqlite.js';
import { SCHEMA_VERSION } from './store.js';
import { pluginRoot, readJson, writeJson } from './paths.js';

export const OSV_URL = 'https://osv-vulnerabilities.storage.googleapis.com/npm/all.zip';
export async function download(url, file, { maxBytes = 100_000_000, timeout = 120_000 } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Download exceeds size limit');
  let bytes = 0;
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, cb) {
    bytes += chunk.length;
    cb(bytes > maxBytes ? new Error('Download exceeds size limit') : null, chunk);
  } }), fs.createWriteStream(file, { flags: 'wx' }));
  return response.headers.get('last-modified');
}
export async function sha256(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export function maliciousRecords(advisory) {
  if (advisory.withdrawn) return [];
  const malware = String(advisory.id).startsWith('MAL-') || advisory.database_specific?.malicious === true ||
    (advisory.database_specific?.cwe_ids || []).includes('CWE-506') ||
    /^Malicious (?:code|package)\b/i.test(advisory.summary || '');
  if (!malware) return [];
  const result = [];
  for (const affected of advisory.affected || []) {
    const name = affected.package?.name;
    if (affected.package?.ecosystem !== 'npm' || typeof name !== 'string' || name.length > 214) continue;
    const ranges = (affected.ranges || []).filter(r => r.type === 'SEMVER').map(r => ({ type: r.type, events: r.events || [] }));
    const versions = (affected.versions || []).filter(v => typeof v === 'string');
    result.push({ name, id: advisory.id, versions, ranges,
      description: String(advisory.summary || 'Reported malicious package').slice(0, 2000),
      reference: `https://osv.dev/vulnerability/${encodeURIComponent(advisory.id)}` });
  }
  return result;
}

async function readZip(file, consume) {
  const zip = await new Promise((resolve, reject) => yauzl.open(file, { lazyEntries: true }, (e, z) => e ? reject(e) : resolve(z)));
  return new Promise((resolve, reject) => {
    let total = 0;
    const fail = error => { zip.close(); reject(error); };
    zip.on('error', fail);
    zip.on('end', resolve);
    zip.on('entry', entry => {
      if (!entry.fileName.endsWith('.json')) { zip.readEntry(); return; }
      if (entry.uncompressedSize > 10_000_000 || (total += entry.uncompressedSize) > 4_000_000_000) {
        fail(new Error('OSV archive exceeds extraction limits')); return;
      }
      zip.openReadStream(entry, (error, stream) => {
        if (error) { fail(error); return; }
        (async () => {
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          await consume(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          zip.readEntry();
        })().catch(fail);
      });
    });
    zip.readEntry();
  });
}

export async function collectPopular() {
  const names = new Set();
  for (const term of ['react', 'node', 'typescript', 'cli', 'test', 'http', 'database', 'auth', 'build', 'vue', 'css', 'aws', 'parser', 'graphql', 'mcp', 'json', 'logging', 'validation', 'stream', 'image']) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${term}&size=250&popularity=1&quality=0&maintenance=0`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`npm search HTTP ${response.status}`);
    const json = await response.json();
    for (const item of json.objects || []) {
      if (typeof item.package?.name === 'string') names.add(item.package.name);
    }
  }
  if (names.size < 500) throw new Error('npm returned too few popular packages');
  return [...names].sort();
}

export async function buildDatabase({ output, osvDir, osvZip, advisories, popular, sourceUpdated, source = 'osv/npm', seedOnly = false, warnings = [] }) {
  fs.mkdirSync(output, { recursive: true });
  const file = path.join(output, 'threat-data.db');
  if (fs.existsSync(file)) throw new Error('Build output already exists');
  const seed = readJson(path.join(pluginRoot(), 'src/supply-chain/data/denylist.json'));
  if (!seed) throw new Error('Curated seed data is missing');
  const db = await openDatabase(file, { readOnly: false });
  try {
    // guardrails-js-ignore CMD-01 -- db.exec is the SQLite adapter, not child_process.exec; only the fixed schema version is interpolated.
    await db.exec(`PRAGMA journal_mode=DELETE; PRAGMA user_version=${SCHEMA_VERSION};
      CREATE TABLE threats(name TEXT NOT NULL, id TEXT NOT NULL, record TEXT NOT NULL, PRIMARY KEY(name,id)) WITHOUT ROWID;
      CREATE TABLE popular(name TEXT PRIMARY KEY) WITHOUT ROWID;
      CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID;
      BEGIN;`);
    const add = async record => {
      // Multiple affected sections for the same package/advisory are a union.
      const prior = await db.all('SELECT record FROM threats WHERE name=? AND id=?', [record.name, record.id]);
      if (prior.length) {
        const old = JSON.parse(prior[0].record);
        record.versions = [...new Set([...old.versions, ...record.versions])].sort();
        record.ranges = [...old.ranges, ...record.ranges];
      }
      await db.run('INSERT OR REPLACE INTO threats VALUES(?,?,?)', [record.name, record.id, JSON.stringify(record)]);
    };
    for (const [name, entry] of Object.entries(seed.packages)) {
      await add({ name, id: `curated:${entry.incident}`, versions: entry.versions, ranges: [], ...seed.incidents[entry.incident] });
    }
    let scanned = 0;
    const consume = async advisory => {
      scanned++;
      for (const record of maliciousRecords(advisory)) await add(record);
    };
    if (osvZip) await readZip(osvZip, consume);
    if (osvDir) {
      for (const name of fs.readdirSync(osvDir).sort()) {
        if (name.endsWith('.json')) await consume(JSON.parse(fs.readFileSync(path.join(osvDir, name), 'utf8')));
      }
    }
    if (advisories) for (const advisory of advisories) await consume(advisory);
    const baselinePopular = readJson(path.join(pluginRoot(), 'src/supply-chain/data/top-packages.json')).names;
    for (const name of [...new Set([...baselinePopular, ...(popular || [])])].sort()) {
      await db.run('INSERT INTO popular VALUES(?)', [name]);
    }
    const metadata = { schemaVersion: SCHEMA_VERSION, source, sourceUpdated: sourceUpdated || seed.updated,
      builtAt: new Date().toISOString(), seedOnly, scanned, warnings,
      packages: (await db.all('SELECT count(DISTINCT name) AS n FROM threats'))[0].n,
      records: (await db.all('SELECT count(*) AS n FROM threats'))[0].n };
    await db.run('INSERT INTO metadata VALUES(?,?)', ['manifest', JSON.stringify(metadata)]);
    await db.exec('COMMIT; VACUUM;');
    await db.close();
    metadata.sha256 = await sha256(file);
    metadata.bytes = fs.statSync(file).size;
    writeJson(path.join(output, 'manifest.json'), metadata);
    fs.writeFileSync(path.join(output, 'summary.md'), `# Threat data\n\nSource: ${source}\n\nSource snapshot: ${metadata.sourceUpdated}\n\nPackages: ${metadata.packages}\n\nAdvisories: ${metadata.records}\n\nSHA-256: ${metadata.sha256}\n\n${warnings.join('\n')}\n`);
    return metadata;
  } catch (error) { try { await db.close(); } catch {} throw error; }
}

export async function buildFromSources(output) {
  await ensureDriver();
  const zip = path.join(output, 'npm-osv.zip');
  const modified = await download(OSV_URL, zip, { maxBytes: 600_000_000, timeout: 300_000 });
  // Never call an old source fresh simply because it was downloaded today.
  if (!modified || !Number.isFinite(Date.parse(modified))) throw new Error('OSV source lacks a valid Last-Modified timestamp');
  let popular;
  const warnings = [];
  try { popular = await collectPopular(); } catch (error) {
    warnings.push(`Popularity refresh failed; retained bundled names: ${error.message}`);
  }
  return buildDatabase({ output, osvZip: zip, popular, sourceUpdated: new Date(modified).toISOString(), warnings });
}

export async function validateSnapshot(dir) {
  const metadata = readJson(path.join(dir, 'manifest.json'));
  if (!metadata || metadata.schemaVersion !== SCHEMA_VERSION || !/^[a-f0-9]{64}$/.test(metadata.sha256) ||
      !Number.isFinite(Date.parse(metadata.sourceUpdated)) || Date.parse(metadata.sourceUpdated) > Date.now() + 300_000 ||
      !Number.isInteger(metadata.records) || metadata.records < 1) throw new Error('Invalid threat database manifest');
  const file = path.join(dir, 'threat-data.db');
  if (fs.statSync(file).size !== metadata.bytes || metadata.bytes > 100_000_000 || await sha256(file) !== metadata.sha256) throw new Error('Threat database checksum or size mismatch');
  const db = await openDatabase(file);
  try {
    await db.exec('PRAGMA trusted_schema=OFF;');
    const check = await db.all('PRAGMA quick_check');
    if (check.length !== 1 || Object.values(check[0])[0] !== 'ok') throw new Error('SQLite integrity check failed');
    for (const name of ['threats', 'popular', 'metadata']) {
      if ((await db.all("SELECT type FROM sqlite_master WHERE name=?", [name]))[0]?.type !== 'table') throw new Error('Invalid database tables');
    }
    const embedded = JSON.parse((await db.all("SELECT value FROM metadata WHERE key='manifest'"))[0]?.value);
    for (const key of ['schemaVersion', 'sourceUpdated', 'source', 'seedOnly', 'records', 'packages']) {
      if (embedded[key] !== metadata[key]) throw new Error('Database metadata mismatch');
    }
    if ((await db.all('SELECT count(*) AS n FROM threats'))[0].n !== metadata.records) throw new Error('Database record count mismatch');
    return metadata;
  } finally { await db.close(); }
}
