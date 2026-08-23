import {
  memberName,
  lastSegment,
  isLiteral,
  staticString,
  objectValue,
  objectProperty,
} from '../engine/walk.js';

export { memberName, lastSegment, isLiteral, staticString, objectValue, objectProperty };

/** Does the call target match one of these dotted or bare names? */
export function calleeMatches(node, names) {
  const full = memberName(node.callee);
  if (!full) return false;
  if (names.includes(full)) return true;
  const tail = lastSegment(full);
  return names.includes(tail);
}

/** Does the call target end with one of these method names? */
export function calleeEndsWith(node, methods) {
  const full = memberName(node.callee);
  if (!full) return false;
  return methods.includes(lastSegment(full));
}

export function isCall(node) {
  return node.type === 'CallExpression' || node.type === 'OptionalCallExpression';
}

/** True for a template literal with holes, or a string built with `+`. */
export function isBuiltString(node) {
  if (!node) return false;
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0;
  if (node.type === 'BinaryExpression' && node.operator === '+') return true;
  if (isCall(node) && calleeEndsWith(node, ['concat'])) return true;
  return false;
}

/** Pull the raw source text for a node, trimmed to something readable. */
export function snippet(source, node, limit = 160) {
  if (!node || typeof node.start !== 'number') return '';
  return source
    .slice(node.start, Math.min(node.end, node.start + limit))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Is the value node literally `true`? */
export function isTrue(node) {
  return node?.type === 'BooleanLiteral' && node.value === true;
}

/** Is the value node literally `false`? */
export function isFalse(node) {
  return node?.type === 'BooleanLiteral' && node.value === false;
}

/** Find the first argument that is an object literal. */
export function firstObjectArg(node) {
  for (const arg of node.arguments ?? []) {
    if (arg.type === 'ObjectExpression') return arg;
  }
  return null;
}

/** Read a dependency version from the project package.json, or null. */
export function depVersion(pkg, name) {
  if (!pkg) return null;
  return (
    pkg.dependencies?.[name] ??
    pkg.devDependencies?.[name] ??
    pkg.peerDependencies?.[name] ??
    null
  );
}

/** Rough major version from a semver range like ^3.14.1 or ~4.0.0 or 4.x. */
export function majorOf(range) {
  if (!range) return null;
  const match = /(\d+)/.exec(String(range));
  return match ? Number(match[1]) : null;
}

export function fileLooksLikeTest(filePath) {
  return /(^|[/\\])(test|tests|__tests__|spec|fixtures?|mocks?|e2e)([/\\]|$)|\.(test|spec)\.[cm]?[jt]sx?$/i.test(
    String(filePath),
  );
}

export function fileLooksLikeMigration(filePath) {
  return /(^|[/\\])(migrations?|seeds?|seeders?)([/\\]|$)/i.test(String(filePath));
}
