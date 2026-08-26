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

test('every hook spawns node directly, with no shell', () => {
  // Exec form: command is the executable, args is the argument vector, and no
  // shell runs at all.
  //
  // The shell form needs a shell, and on Windows that means PowerShell, which
  // plenty of enterprises block by policy. Requiring it would mean the plugin
  // simply never runs on those machines. Spawning node directly needs no shell
  // on any operating system, and no quoting either, so a plugin path with a
  // space in it cannot break it.
  //
  // The exec form shipped broken once, as command "exec" with args ["node", …],
  // which asks for a program called exec. There is no such program, so every
  // hook failed with ENOENT. That is the specific mistake the assertions below
  // are shaped to catch.
  const config = JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'hooks.json'), 'utf8'));

  for (const [event, entries] of Object.entries(config.hooks)) {
    for (const entry of entries) {
      for (const hook of entry.hooks) {
        assert.equal(hook.type, 'command', `${event} hook is not a command hook`);

        assert.equal(
          hook.command,
          'node',
          `${event} runs "${hook.command}". The executable is node. Anything else is either ` +
            'a shell, which Windows policy may forbid, or a program that does not exist.',
        );

        assert.ok(Array.isArray(hook.args), `${event} has no args, so no script would run`);
        assert.equal(hook.args.length, 1, `${event} should pass exactly the script path`);
        assert.match(
          hook.args[0],
          /^\$\{CLAUDE_PLUGIN_ROOT\}\/dist\/[a-z-]+\.mjs$/,
          `${event} arg is ${JSON.stringify(hook.args[0])}`,
        );

        // No shell runs, so anything shell shaped is a sign someone reached for
        // one and it will be passed to node as a literal filename.
        for (const operator of ['&&', '||', ';', '|', '$(', '`', '"']) {
          assert.ok(
            !hook.args[0].includes(operator),
            `${event} arg contains ${operator}, but there is no shell to interpret it`,
          );
        }

        assert.equal(hook.shell, undefined, `${event} names a shell, but exec form uses none`);
      }
    }
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

test('installing asks for no configuration at all', () => {
  // Every option used to be a question at install time. They all defaulted to
  // yes, which meant four prompts that could only make things worse if anyone
  // answered without reading. Configuration lives in .guardrails-js.json now,
  // and installing is one step.
  assert.equal(
    plugin.userConfig,
    undefined,
    'declaring userConfig makes the harness interrupt the install with questions',
  );
});

test('nothing in the code reads a plugin option that can never be set', async () => {
  // With no userConfig declared, the harness never exports CLAUDE_PLUGIN_OPTION_*.
  // Reading one would be dead code pretending to be a way to configure this.
  const source = fs.readFileSync(path.join(root, 'src', 'engine', 'config.js'), 'utf8');
  assert.ok(
    !source.includes('CLAUDE_PLUGIN_OPTION_'),
    'config.js reads a plugin option, but nothing can set one any more',
  );
});
