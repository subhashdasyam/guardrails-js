// Plugin manifest checks.
//
// These exist because of a real install failure. The manifest declared
// "hooks": "./hooks/hooks.json", which is the exact path Claude Code already
// discovers on its own, so it was loaded twice and the plugin refused to start:
//
//   Duplicate hooks file detected: ./hooks/hooks.json resolves to already
//   loaded file ... The standard hooks/hooks.json is loaded automatically, so
//   manifest.hooks should only reference additional hook files.
//
// Nothing in the test suite could catch that, because the manifest is read by
// the harness and never by any code here. So it gets its own tests.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const plugin = read('.claude-plugin/plugin.json');
const marketplace = read('.claude-plugin/marketplace.json');
const pkg = read('package.json');

/** Paths Claude Code finds on its own. Declaring one of these loads it twice. */
const AUTO_DISCOVERED = ['hooks/hooks.json', 'hooks.json', '.mcp.json', '.lsp.json'];

test('the manifest does not declare an auto discovered hooks file', () => {
  const declared = [].concat(plugin.hooks ?? []).filter((entry) => typeof entry === 'string');

  for (const entry of declared) {
    const normalised = entry.replace(/^\.\//, '');
    assert.ok(
      !AUTO_DISCOVERED.includes(normalised),
      `plugin.json declares "${entry}", which Claude Code loads automatically. ` +
        'Declaring it makes the plugin fail to load with a duplicate hooks error. ' +
        'The hooks field is only for additional hook files.',
    );
  }
});

test('hooks/hooks.json exists, so auto discovery has something to find', () => {
  assert.ok(fs.existsSync(path.join(root, 'hooks', 'hooks.json')));
});

test('the escalation hook stays undeclared, so it stays opt in', () => {
  const declared = [].concat(plugin.hooks ?? []).map(String);
  assert.ok(!declared.some((entry) => entry.includes('escalation')));
  assert.ok(
    fs.existsSync(path.join(root, 'hooks', 'escalation.json')),
    'it still has to be there for people to copy',
  );
});

test('every path the manifest declares actually exists', () => {
  const fields = ['commands', 'skills', 'agents', 'workflows', 'outputStyles'];

  for (const field of fields) {
    for (const entry of [].concat(plugin[field] ?? [])) {
      if (typeof entry !== 'string') continue;
      assert.ok(
        fs.existsSync(path.join(root, entry)),
        `plugin.json declares ${field} path "${entry}" which does not exist`,
      );
    }
  }
});

test('declared paths are relative and stay inside the plugin', () => {
  const every = ['hooks', 'commands', 'skills', 'agents', 'workflows', 'outputStyles']
    .flatMap((field) => [].concat(plugin[field] ?? []))
    .filter((entry) => typeof entry === 'string');

  for (const entry of every) {
    assert.ok(entry.startsWith('./'), `"${entry}" should start with ./`);
    assert.ok(!entry.includes('..'), `"${entry}" must not escape the plugin directory`);
  }
});

test('the version matches package.json', () => {
  assert.equal(
    plugin.version,
    pkg.version,
    'a mismatch means the marketplace advertises a different version than the code',
  );
});

test('the marketplace entry points at this plugin', () => {
  assert.equal(marketplace.name, 'guardrails-js');
  assert.ok(Array.isArray(marketplace.plugins) && marketplace.plugins.length > 0);

  const entry = marketplace.plugins.find((item) => item.name === plugin.name);
  assert.ok(entry, `marketplace.json has no entry named ${plugin.name}`);
  assert.equal(entry.source, './', 'the plugin lives at the marketplace root');
});

test('the manifest carries what a listing needs', () => {
  for (const field of ['name', 'version', 'description', 'license', 'repository']) {
    assert.ok(plugin[field], `plugin.json is missing ${field}`);
  }
  assert.match(plugin.name, /^[a-z0-9-]+$/, 'the name is used for command prefixes');
});

test('the settings panel advertises the same defaults the code uses', async () => {
  // The panel said min_severity defaulted to "low" while the code defaulted to
  // "perf". Anyone accepting the panel default got the entire performance pack
  // switched off without being told, because perf sits below low.
  const { loadConfig } = await import('../src/engine/config.js');

  // Read the code defaults with no project config and no plugin options set.
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('CLAUDE_PLUGIN_OPTION_')) delete process.env[key];
  }
  const code = loadConfig('/nonexistent-so-defaults-apply');

  const pairs = [
    ['network', code.network],
    ['min_severity', code.minSeverity],
    ['priming', code.priming],
  ];

  for (const [panelKey, codeDefault] of pairs) {
    const option = plugin.userConfig?.[panelKey];
    assert.ok(option, `plugin.json has no userConfig entry for ${panelKey}`);
    assert.equal(
      option.default,
      codeDefault,
      `the settings panel says ${panelKey} defaults to ${JSON.stringify(option.default)} ` +
        `but the code uses ${JSON.stringify(codeDefault)}. Accepting the panel default would ` +
        'then change behaviour without anyone asking for it.',
    );
  }
});

test('user config options are shaped the way the harness expects', () => {
  for (const [key, option] of Object.entries(plugin.userConfig ?? {})) {
    assert.match(key, /^[a-z0-9_]+$/, `${key} becomes an env var suffix, so keep it plain`);
    assert.ok(
      ['string', 'number', 'boolean', 'directory', 'file'].includes(option.type),
      `${key} has an unsupported type ${option.type}`,
    );
    assert.ok(option.title, `${key} needs a title, it is shown in the settings panel`);
    assert.ok(option.description, `${key} needs a description`);
  }
});
