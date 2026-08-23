import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseVersion,
  compareVersions,
  rangeMinimum,
  checkPackage,
  checkDependencies,
  describeDependencyFinding,
} from '../src/supply-chain/dependencies.js';

test('version parsing', () => {
  assert.deepEqual(parseVersion('15.2.3'), [15, 2, 3]);
  assert.deepEqual(parseVersion('^14.2.25'), [14, 2, 25]);
  assert.deepEqual(parseVersion('19.0.0-rc.1'), [19, 0, 0]);
  assert.deepEqual(parseVersion('5.4'), [5, 4, 0]);
  assert.equal(parseVersion('not a version'), null);
});

test('version comparison', () => {
  assert.equal(compareVersions('15.2.3', '15.2.3'), 0);
  assert.equal(compareVersions('15.2.2', '15.2.3'), -1);
  assert.equal(compareVersions('15.10.0', '15.9.0'), 1, 'ten is above nine, not below it');
  assert.equal(compareVersions('16.0.0', '15.99.99'), 1);
});

test('range minimum', () => {
  assert.deepEqual(rangeMinimum('^15.1.0'), [15, 1, 0]);
  assert.deepEqual(rangeMinimum('~14.2.0'), [14, 2, 0]);
  assert.deepEqual(rangeMinimum('>=13.0.0'), [13, 0, 0]);
  assert.equal(rangeMinimum('*'), null);
  assert.equal(rangeMinimum('workspace:*'), null);
  assert.equal(rangeMinimum('file:../local'), null);
});

test('the Next.js middleware bypass is matched per major line', () => {
  const ids = (version) => checkPackage('next', version).map((match) => match.id);

  assert.ok(ids('15.1.0').includes('CVE-2025-29927'));
  assert.ok(ids('14.2.24').includes('CVE-2025-29927'));
  assert.ok(ids('13.5.8').includes('CVE-2025-29927'));
  assert.ok(ids('12.3.4').includes('CVE-2025-29927'));

  assert.ok(!ids('15.2.3').includes('CVE-2025-29927'), 'the fixed version is not affected');
  assert.ok(!ids('14.2.25').includes('CVE-2025-29927'));
  assert.ok(!ids('16.0.0').includes('CVE-2025-29927'), 'a newer major is not affected');
});

test('React Server Components RCE is matched per minor line', () => {
  const ids = (version) => checkPackage('react-server-dom-webpack', version).map((m) => m.id);

  assert.ok(ids('19.0.0').includes('CVE-2025-55182'));
  assert.ok(ids('19.1.1').includes('CVE-2025-55182'));
  assert.ok(ids('19.2.0').includes('CVE-2025-55182'));

  assert.ok(!ids('19.0.1').includes('CVE-2025-55182'));
  assert.ok(!ids('19.1.2').includes('CVE-2025-55182'));
  assert.ok(!ids('19.2.1').includes('CVE-2025-55182'));
  assert.ok(!ids('20.0.0').includes('CVE-2025-55182'));
});

test('an unlisted older major is only reported when the advisory says so', () => {
  // The middleware bypass says older majors are affected.
  assert.ok(checkPackage('next', '11.1.0').some((m) => m.id === 'CVE-2025-29927'));
  // The image optimizer advisory does not, and we have no fix version for 14,
  // so saying nothing beats guessing.
  assert.ok(!checkPackage('next', '14.2.30').some((m) => m.id === 'CVE-2026-64644'));
});

test('lockfile versions beat manifest ranges', () => {
  const pkg = { dependencies: { next: '^15.1.0' } };

  const fromRange = checkDependencies(pkg, new Map());
  assert.equal(fromRange.length > 0, true);
  assert.equal(fromRange[0].exact, false);
  assert.equal(
    fromRange[0].severity,
    'high',
    'an unresolved range is downgraded, because it might already resolve to a fixed version',
  );

  const fromLock = checkDependencies(pkg, new Map([['next', '15.1.0']]));
  assert.equal(fromLock[0].exact, true);
  assert.equal(fromLock[0].severity, 'critical');

  const patched = checkDependencies(pkg, new Map([['next', '15.6.0']]));
  assert.equal(
    patched.filter((f) => f.advisory === 'CVE-2025-29927').length,
    0,
    'a patched lockfile version clears the finding even though the range allows an old one',
  );
});

test('findings read as plain sentences', () => {
  const [finding] = checkDependencies(
    { dependencies: { next: '15.1.0' } },
    new Map([['next', '15.1.0']]),
  );
  const text = describeDependencyFinding(finding);

  assert.match(text, /NEXT-VER/);
  assert.match(text, /next@15\.1\.0/);
  assert.match(text, /CVE-2025-29927/);
  assert.match(text, /15\.2\.3/);
});

test('a project with no affected dependencies produces nothing', () => {
  const pkg = { dependencies: { express: '^4.19.2', react: '^18.3.1' } };
  assert.deepEqual(checkDependencies(pkg, new Map()), []);
});
