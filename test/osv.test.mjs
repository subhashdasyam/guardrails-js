// The osv.dev and npm registry lookups.
//
// These are the only part of the plugin that talks to the network, so they are
// also the only part that could hang a session or leak what you are installing.
// Everything here runs against a stubbed fetch: the tests must not depend on a
// network, and a test that silently passes because a request timed out would be
// worse than no test.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  actionableAdvisories,
  queryOsvDetailed,
  queryRegistry,
  advisoryNotes,
  enrich,
} from '../src/supply-chain/osv.js';

// Each test gets its own cache directory, or one would answer the next.
function isolate() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-osv-'));
  process.env.CLAUDE_PLUGIN_DATA = dir;
  return dir;
}

const realFetch = globalThis.fetch;

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    const body = handler(String(url), options);
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  return calls;
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
});

// The rule that decides whether an advisory is worth interrupting someone for.
// This one is pure, so it needs no stubbing at all.
test('an advisory with no published fix is not actionable', () => {
  // The real lodash 4.17.21 case as it stood before 4.17.23 shipped: three
  // advisories, every fix in a version nobody could install yet.
  const advisories = [
    { id: 'GHSA-f23m', severity: 'MODERATE', fixed: ['4.18.0'] },
    { id: 'GHSA-r5fr', severity: 'HIGH', fixed: ['4.18.0'] },
    { id: 'GHSA-xxjr', severity: 'MODERATE', fixed: ['4.17.23'] },
  ];

  assert.deepEqual(
    actionableAdvisories(advisories, '4.17.21'),
    [],
    'nothing to upgrade to means nothing worth saying',
  );
});

test('the same advisories become actionable once the fix is published', () => {
  const advisories = [
    { id: 'GHSA-f23m', severity: 'MODERATE', fixed: ['4.18.0'] },
    { id: 'GHSA-r5fr', severity: 'HIGH', fixed: ['4.18.0'] },
    { id: 'GHSA-xxjr', severity: 'MODERATE', fixed: ['4.17.23'] },
  ];

  const actionable = actionableAdvisories(advisories, '4.18.1');
  assert.equal(actionable.length, 3);
  assert.equal(actionable[0].severity, 'HIGH', 'worst first, so the message leads with it');
});

test('actionable advisories are ordered by severity', () => {
  const advisories = [
    { id: 'low', severity: 'LOW', fixed: ['1.0.1'] },
    { id: 'crit', severity: 'CRITICAL', fixed: ['1.0.1'] },
    { id: 'mod', severity: 'MODERATE', fixed: ['1.0.1'] },
    { id: 'high', severity: 'HIGH', fixed: ['1.0.1'] },
  ];

  assert.deepEqual(
    actionableAdvisories(advisories, '2.0.0').map((a) => a.id),
    ['crit', 'high', 'mod', 'low'],
  );
});

test('version comparison is numeric, not alphabetical', () => {
  const advisory = [{ id: 'x', severity: 'HIGH', fixed: ['4.17.9'] }];
  assert.equal(
    actionableAdvisories(advisory, '4.17.21').length,
    1,
    '4.17.9 is below 4.17.21, and a string compare would get this backwards',
  );
});

test('no known latest version means nothing is claimed', () => {
  assert.deepEqual(actionableAdvisories([{ id: 'x', severity: 'HIGH', fixed: ['1.0.0'] }], null), []);
});

test('queryOsvDetailed pulls severity and fix versions out of the response', async () => {
  isolate();
  const calls = stubFetch((url) => {
    if (!url.includes('api.osv.dev/v1/query')) return undefined;
    return {
      vulns: [
        {
          id: 'GHSA-jf85-cpcp-j695',
          database_specific: { severity: 'CRITICAL' },
          affected: [
            {
              package: { name: 'lodash', ecosystem: 'npm' },
              ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.12' }] }],
            },
          ],
        },
      ],
    };
  });

  const result = await queryOsvDetailed('lodash', '4.17.11', 1000);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'GHSA-jf85-cpcp-j695');
  assert.equal(result[0].severity, 'CRITICAL');
  assert.deepEqual(result[0].fixed, ['4.17.12']);
  assert.equal(calls.length, 1);
});

test('a fix range for a different package is ignored', async () => {
  isolate();
  stubFetch(() => ({
    vulns: [
      {
        id: 'GHSA-shared',
        database_specific: { severity: 'HIGH' },
        affected: [
          { package: { name: 'other-pkg' }, ranges: [{ events: [{ fixed: '9.9.9' }] }] },
          { package: { name: 'lodash' }, ranges: [{ events: [{ fixed: '4.17.12' }] }] },
        ],
      },
    ],
  }));

  const result = await queryOsvDetailed('lodash', '4.17.11', 1000);
  assert.deepEqual(result[0].fixed, ['4.17.12']);
});

test('results are cached, so a second lookup makes no request', async () => {
  isolate();
  const calls = stubFetch(() => ({ vulns: [] }));

  await queryOsvDetailed('lodash', '4.17.11', 1000);
  await queryOsvDetailed('lodash', '4.17.11', 1000);

  assert.equal(calls.length, 1, 'the second call must come from cache');
});

test('a failing request returns nothing rather than throwing', async () => {
  isolate();
  globalThis.fetch = async () => {
    throw new Error('network is down');
  };

  assert.deepEqual(await queryOsvDetailed('lodash', '4.17.11', 100), []);
  assert.equal(await queryRegistry('lodash', 100), null);
  assert.deepEqual(await advisoryNotes([{ name: 'lodash', version: '4.17.11' }], 100), []);
  assert.deepEqual(await enrich([{ name: 'lodash', version: null }], 100), [
    'lodash was not found on the npm registry, or the lookup timed out',
  ]);
});

test('advisoryNotes says what to upgrade to', async () => {
  isolate();
  stubFetch((url) => {
    if (url.includes('registry.npmjs.org')) {
      return {
        'dist-tags': { latest: '4.18.1' },
        time: { created: '2012-01-01T00:00:00Z', '4.18.1': '2026-04-01T00:00:00Z' },
        versions: { '4.17.11': {}, '4.18.1': {} },
        repository: { url: 'git+https://github.com/lodash/lodash.git' },
      };
    }
    return {
      vulns: [
        {
          id: 'GHSA-jf85-cpcp-j695',
          database_specific: { severity: 'CRITICAL' },
          affected: [
            { package: { name: 'lodash' }, ranges: [{ events: [{ fixed: '4.17.12' }] }] },
          ],
        },
      ],
    };
  });

  const notes = await advisoryNotes([{ name: 'lodash', version: '4.17.11' }], 1000);

  assert.equal(notes.length, 1);
  assert.match(notes[0].text, /lodash@4\.17\.11/);
  assert.match(notes[0].text, /CRITICAL GHSA-jf85-cpcp-j695/);
  assert.match(notes[0].text, /Upgrade to 4\.17\.12 or later/);

  // The severity and the identity ride along so the hook can decide whether to
  // block, and whether allowPackages lets this one past.
  assert.equal(notes[0].severity, 'CRITICAL');
  assert.equal(notes[0].name, 'lodash');
  assert.equal(notes[0].version, '4.17.11');
});

test('advisoryNotes stays silent when no fix is reachable', async () => {
  isolate();
  stubFetch((url) => {
    if (url.includes('registry.npmjs.org')) {
      return {
        'dist-tags': { latest: '4.17.21' },
        time: { created: '2012-01-01T00:00:00Z', '4.17.21': '2021-02-20T00:00:00Z' },
        versions: { '4.17.21': {} },
        repository: { url: 'git+https://github.com/lodash/lodash.git' },
      };
    }
    return {
      vulns: [
        {
          id: 'GHSA-r5fr',
          database_specific: { severity: 'HIGH' },
          affected: [{ package: { name: 'lodash' }, ranges: [{ events: [{ fixed: '4.18.0' }] }] }],
        },
      ],
    };
  });

  assert.deepEqual(
    await advisoryNotes([{ name: 'lodash', version: '4.17.21' }], 1000),
    [],
    'a fix in an unpublished version is not something anyone can act on',
  );
});

test('an unpinned install is checked against whatever latest resolves to', async () => {
  isolate();
  const asked = [];
  stubFetch((url, options) => {
    if (url.includes('registry.npmjs.org')) {
      return {
        'dist-tags': { latest: '5.0.0' },
        time: { created: '2020-01-01T00:00:00Z', '5.0.0': '2026-01-01T00:00:00Z' },
        versions: { '5.0.0': {} },
        repository: { url: 'git+https://example.com/x.git' },
      };
    }
    asked.push(JSON.parse(options.body).version);
    return { vulns: [] };
  });

  await advisoryNotes([{ name: 'somepkg', version: null }], 1000);
  assert.deepEqual(asked, ['5.0.0'], 'with no version pinned, latest is what gets installed');
});

test('enrich reports registry facts and not advisories', async () => {
  isolate();
  stubFetch((url) => {
    if (!url.includes('registry.npmjs.org')) return { vulns: [] };
    return {
      'dist-tags': { latest: '0.0.2' },
      time: { created: '2026-08-20T00:00:00Z', '0.0.2': new Date().toISOString() },
      versions: { '0.0.1': {}, '0.0.2': {} },
      // no repository field
    };
  });

  const notes = await enrich([{ name: 'brand-new-thing', version: null }], 1000);

  assert.ok(notes.some((n) => /day\(s\) ago/.test(n)), 'a very new release is worth saying');
  assert.ok(notes.some((n) => /only 2 published version/.test(n)));
  assert.ok(notes.some((n) => /no source repository/.test(n)));
  assert.ok(!notes.some((n) => /advisor/i.test(n)), 'advisories belong to advisoryNotes');
});

test('at most four packages are looked up', async () => {
  isolate();
  const calls = stubFetch(() => ({
    'dist-tags': { latest: '1.0.0' },
    time: { created: '2020-01-01T00:00:00Z', '1.0.0': '2020-01-01T00:00:00Z' },
    versions: { '1.0.0': {} },
    repository: { url: 'git+https://example.com/x.git' },
    vulns: [],
  }));

  const many = Array.from({ length: 10 }, (_, i) => ({ name: `pkg-${i}`, version: null }));
  await enrich(many, 1000);

  assert.ok(calls.length <= 4, `expected at most four lookups, made ${calls.length}`);
});
