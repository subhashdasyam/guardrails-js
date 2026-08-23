// The model escalation hook.
//
// It is a prompt hook, so there is no code to unit test. What can be checked is
// that the JSON is valid, that it asks for the right thing, that it tells the
// model exactly what to emit, and that it stays opt-in. That last one matters:
// the plugin advertises zero model calls, and this file is the only thing that
// would change that.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = path.join(root, 'hooks', 'escalation.json');

const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const handler = config.hooks.PostToolUse[0].hooks[0];
const prompt = handler.prompt;

test('it is a prompt hook on file writes', () => {
  assert.equal(handler.type, 'prompt');
  assert.equal(config.hooks.PostToolUse[0].matcher, 'Write|Edit|MultiEdit');
  assert.equal(handler.model, 'fast-model', 'a second opinion does not need the big model');
  assert.ok(handler.timeout <= 30, 'a slow second opinion is worse than none');
});

test('it receives the hook input', () => {
  assert.ok(prompt.includes('$ARGUMENTS'), 'without this the model sees no code');
  assert.ok(prompt.includes('tool_input'), 'it has to be told where the code is');
  assert.ok(prompt.includes('new_string'), 'an Edit carries new_string, not content');
});

test('it covers exactly the four classes the parser cannot settle', () => {
  for (const topic of ['IDOR', 'authorization', 'CSRF', 'Mass assignment']) {
    assert.ok(prompt.includes(topic), `the prompt does not mention ${topic}`);
  }
  for (const outOfScope of ['performance', 'style', 'naming', 'tests']) {
    assert.ok(
      prompt.includes(outOfScope),
      `the prompt should tell the model to stay off ${outOfScope}`,
    );
  }
});

test('it refutes by default', () => {
  assert.ok(prompt.includes('Refute by default'));
  assert.ok(
    prompt.includes('say nothing'),
    'silence has to be the instruction, not just the default',
  );
  assert.ok(prompt.includes('bearer token'), 'a bearer API is not a CSRF finding and it must say so');
});

test('it states the exact output contract', () => {
  assert.ok(prompt.includes('{}'), 'the empty case needs a literal example');
  assert.ok(prompt.includes('hookSpecificOutput'));
  assert.ok(prompt.includes('PostToolUse'));
  assert.ok(prompt.includes('additionalContext'));
  assert.ok(prompt.includes('no code fences'), 'models wrap JSON in fences unless told not to');

  // The example payload has to be valid JSON, or the hook silently does nothing.
  const example = /\{"hookSpecificOutput":\{[^\n]*?\}\}/.exec(prompt);
  assert.ok(example, 'no example payload found in the prompt');
  const parsed = JSON.parse(example[0]);
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.equal(typeof parsed.hookSpecificOutput.additionalContext, 'string');
});

test('it uses additionalContext and never blocks', () => {
  assert.ok(
    !prompt.includes('"decision"'),
    'a model must not be able to stop the turn on its own judgement',
  );
  assert.ok(!prompt.includes('permissionDecision'));
});

test('it stays opt in', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  const declared = [].concat(plugin.hooks ?? []);

  assert.ok(
    !declared.some((entry) => String(entry).includes('escalation')),
    'the plugin manifest must not load this, or every install starts making model calls',
  );

  // Claude Code auto discovers hooks/hooks.json and hooks.json only, so the
  // filename is doing real work here.
  assert.notEqual(path.basename(file), 'hooks.json');

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.ok(
    readme.includes('escalation.json'),
    'an opt-in nobody documents is the same as a feature that does not exist',
  );
});
