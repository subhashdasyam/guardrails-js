// Small AST walker. We do not use @babel/traverse because it more than doubles
// the bundle size and we only need a plain pre-order walk with parent links.

const SKIP_KEYS = new Set([
  'loc',
  'start',
  'end',
  'range',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'comments',
  'tokens',
  'extra',
  'errors',
]);

/**
 * Pre-order walk. visit(node, parent, key) is called for every node that has a
 * string `type`. Return false from visit to skip that node's children.
 */
export function walk(node, visit, parent = null, key = null) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, parent, key);
    return;
  }

  if (typeof node.type !== 'string') return;

  if (visit(node, parent, key) === false) return;

  for (const k of Object.keys(node)) {
    if (SKIP_KEYS.has(k)) continue;
    const value = node[k];
    if (value && typeof value === 'object') walk(value, visit, node, k);
  }
}

/**
 * Turn a member expression into a dotted string. `child_process.exec` for
 * `child_process.exec(...)`, `req.query.id` for `req.query.id`. Returns null
 * when any part is computed with a non-literal key, because we cannot know it.
 */
export function memberName(node) {
  if (!node) return null;

  switch (node.type) {
    case 'Identifier':
      return node.name;

    case 'ThisExpression':
      return 'this';

    case 'TSNonNullExpression':
    case 'TSAsExpression':
    case 'TypeCastExpression':
      return memberName(node.expression);

    case 'OptionalMemberExpression':
    case 'MemberExpression': {
      const object = memberName(node.object);
      if (object === null) return null;

      let property;
      if (node.computed) {
        if (node.property.type === 'StringLiteral') property = node.property.value;
        else return null;
      } else {
        property = node.property.name ?? node.property.value;
      }
      if (property === null || property === undefined) return null;

      return `${object}.${property}`;
    }

    case 'OptionalCallExpression':
    case 'CallExpression':
      // require('child_process').exec -> we want the tail, so walk the callee
      return memberName(node.callee);

    default:
      return null;
  }
}

/** Last segment of a dotted name. `child_process.exec` -> `exec`. */
export function lastSegment(name) {
  if (!name) return null;
  const i = name.lastIndexOf('.');
  return i === -1 ? name : name.slice(i + 1);
}

/** True when the node is a plain string, number, boolean, or template with no holes. */
export function isLiteral(node) {
  if (!node) return false;
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'BigIntLiteral':
      return true;
    case 'TemplateLiteral':
      return node.expressions.length === 0;
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return isLiteral(node.expression);
    default:
      return false;
  }
}

/** Read a static string out of a node, or null. */
export function staticString(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('');
  }
  if (node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression') {
    return staticString(node.expression);
  }
  return null;
}

/** Find a property on an ObjectExpression by name. Returns the property node. */
export function objectProperty(objectNode, name) {
  if (!objectNode || objectNode.type !== 'ObjectExpression') return null;
  for (const prop of objectNode.properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') continue;
    const key = prop.key?.name ?? prop.key?.value;
    if (key === name) return prop;
  }
  return null;
}

/** Value node of a property on an ObjectExpression, or null. */
export function objectValue(objectNode, name) {
  const prop = objectProperty(objectNode, name);
  return prop ? prop.value : null;
}
