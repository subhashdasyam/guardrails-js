// Shared hook plumbing.
//
// Two rules the whole plugin lives by:
//   1. stdout is a control channel. Never log to it.
//   2. Never throw. A crashed hook must not stop Claude working.

import fs from 'node:fs';
import path from 'node:path';

export function readHookInput() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * The tool output field changed name between CLI versions. Read both, and treat
 * anything we did not ask about as optional.
 */
export function toolResultOf(input) {
  return input.tool_response ?? input.tool_result ?? null;
}

export function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function emitAdditionalContext(eventName, text) {
  emitJson({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: text,
    },
  });
}

/** Exit 2 with the message on stderr. This is how a hook talks to Claude. */
export function emitLoud(text) {
  process.stderr.write(`${text}\n`);
  process.exit(2);
}

export function findUp(startDir, filename, limit = 30) {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < limit; depth += 1) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function readPackageJson(startDir) {
  const file = findUp(startDir, 'package.json');
  if (!file) return { pkg: null, root: startDir, file: null };
  try {
    return { pkg: JSON.parse(fs.readFileSync(file, 'utf8')), root: path.dirname(file), file };
  } catch {
    return { pkg: null, root: path.dirname(file), file };
  }
}

export function relativeTo(root, filePath) {
  try {
    const rel = path.relative(root, filePath);
    return rel.startsWith('..') ? filePath : rel;
  } catch {
    return filePath;
  }
}

export function allDependencies(pkg) {
  if (!pkg) return {};
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}
