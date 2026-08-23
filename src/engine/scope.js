// Working out which part of the file Claude just touched, so we only report on
// that. Nobody wants 40 findings about code they did not write.

import { walk } from './walk.js';

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
]);

/**
 * Where did the edit land? Returns { start, end } byte offsets into `source`,
 * or null when the whole file is new and everything counts.
 */
export function changedRangeFromToolInput(toolName, toolInput, source) {
  if (!toolInput) return null;

  // A fresh Write means Claude authored all of it.
  if (toolName === 'Write') return null;

  const pieces = [];

  if (typeof toolInput.new_string === 'string' && toolInput.new_string.length > 0) {
    pieces.push(toolInput.new_string);
  }

  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) {
      if (typeof edit?.new_string === 'string' && edit.new_string.length > 0) {
        pieces.push(edit.new_string);
      }
    }
  }

  // NotebookEdit
  if (typeof toolInput.new_source === 'string' && toolInput.new_source.length > 0) {
    pieces.push(toolInput.new_source);
  }

  if (pieces.length === 0) return null;

  let start = Infinity;
  let end = -1;

  for (const piece of pieces) {
    const at = source.indexOf(piece);
    if (at === -1) continue;
    start = Math.min(start, at);
    end = Math.max(end, at + piece.length);
  }

  if (end === -1) return null;
  return { start, end };
}

/**
 * Widen the edited range out to the function around it, so a sink on line 40
 * still gets caught when the source it trusts was added on line 32.
 */
export function reportWindow(ast, changed, sourceLength) {
  if (!changed) return { start: 0, end: sourceLength };

  let best = null;

  walk(ast, (node) => {
    if (!FUNCTION_TYPES.has(node.type)) return undefined;
    if (typeof node.start !== 'number' || typeof node.end !== 'number') return undefined;
    if (node.start <= changed.start && node.end >= changed.end) {
      if (best === null || node.end - node.start < best.end - best.start) best = node;
    }
    return undefined;
  });

  if (best) return { start: best.start, end: best.end };
  return { start: changed.start, end: changed.end };
}

export function inWindow(node, window) {
  if (!window) return true;
  if (typeof node.start !== 'number') return true;
  return node.start >= window.start && node.start <= window.end;
}

export function lineOf(source, offset) {
  if (typeof offset !== 'number' || offset < 0) return 1;
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

export function lineText(source, line) {
  const lines = source.split('\n');
  return (lines[line - 1] ?? '').trim().slice(0, 200);
}
