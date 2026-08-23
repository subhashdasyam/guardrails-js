// Node performance traps.
//
// These are advisory. They become security findings only when an attacker
// picks the input size, the fan out, or the number of requests, and the
// analyzer cannot tell the difference, so they all report as perf and never
// interrupt.

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, isCall } from '../helpers.js';

const HANDLER_PARAM = /^(req|request|res|response|reply|ctx|context)$/;

/**
 * Is this call on the path that serves a request?
 *
 * An earlier version matched the words req or response anywhere in the
 * enclosing function, which flagged plenty of code that merely talked about
 * requests. This looks for an actual handler signature instead: a parameter
 * named like one, or a body that writes to a response object.
 */
function inRequestPath(node, ctx) {
  const fn = ctx.functionFor(node);
  if (!fn || fn.type === 'Program' || fn.type === 'File') return false;

  const named = (fn.params ?? []).some(
    (param) => param.type === 'Identifier' && HANDLER_PARAM.test(param.name),
  );
  if (named) return true;

  const body = ctx.source.slice(fn.start ?? 0, fn.end ?? 0);
  return /\b(res|reply|response)\.(send|json|end|write|status|render|sendFile)\s*\(/.test(body);
}

const FS_SYNC = /^(fs|fsSync|nodeFs)\./;

export const PERF_N01 = {
  id: 'PERF-N01',
  impact: 'high',
  title: 'Synchronous file access in a request handler',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /Sync\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!method.endsWith('Sync')) return null;
    if (!FS_SYNC.test(full)) return null;
    if (!inRequestPath(node, ctx)) return null;

    return { node, call: full };
  },
  message: (f) =>
    `${f.call} blocks the event loop, and in a request handler that means every other request waits behind this one. Node runs your JavaScript on a single thread.`,
  fix: "const data = await fs.promises.readFile(file, 'utf8');  // or createReadStream().pipe(res) for large files",
};

const BLOCKING_SYNC = [
  'pbkdf2Sync',
  'scryptSync',
  'hashSync',
  'compareSync',
  'gzipSync',
  'gunzipSync',
  'deflateSync',
  'inflateSync',
  'brotliCompressSync',
  'brotliDecompressSync',
  'execSync',
  'spawnSync',
];

export const PERF_N02 = {
  id: 'PERF-N02',
  impact: 'high',
  title: 'Expensive synchronous call in a request handler',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /(pbkdf2|scrypt|hash|compare|gzip|gunzip|deflate|inflate|brotli|exec|spawn)Sync\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!BLOCKING_SYNC.includes(method)) return null;
    if (!inRequestPath(node, ctx)) return null;

    return { node, call: method };
  },
  message: (f) =>
    `${f.call} runs on the main thread. Password hashing and compression are meant to be slow, so this stalls every other request for as long as it takes.`,
  fix: 'await bcrypt.compare(password, hash);  // the async form uses the thread pool',
};

const DB_CALL = /\b(find|findOne|findMany|findUnique|findFirst|query|select|insert|update|delete|get|fetch|aggregate|count)\b/i;

function awaitedCallInside(node) {
  let found = null;

  walk(node, (child) => {
    if (found) return false;
    // Do not descend into a nested function: its awaits are its own problem.
    if (
      child !== node &&
      ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(child.type)
    ) {
      return false;
    }
    if (child.type === 'AwaitExpression' && isCall(child.argument)) found = child.argument;
    return undefined;
  });

  return found;
}

export const PERF_N06 = {
  id: 'PERF-N06',
  impact: 'low',
  title: 'Awaiting one at a time in a loop',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /await/,
  nodeTypes: ['ForOfStatement', 'ForStatement', 'ForInStatement', 'WhileStatement'],
  match(node, ctx) {
    const call = awaitedCallInside(node.body);
    if (!call) return null;

    const name = memberName(call.callee) ?? '';
    // A database call in a loop is the N+1 rule's job, not this one.
    if (DB_CALL.test(lastSegment(name) ?? '')) return null;

    return { node: call, call: name || 'an async call' };
  },
  message: (f) =>
    `${f.call} is awaited once per iteration, so the total time is the sum of every call. If these do not depend on each other, run them together.`,
  fix: 'const results = await Promise.all(ids.map((id) => fetchOne(id)));\n// with a limiter when the list can be large: pLimit(10)',
};

const LIMITER = /p-limit|pLimit|pMap|p-map|Bottleneck|Semaphore|concurrency|PQueue|p-queue/;

export const PERF_N07 = {
  id: 'PERF-N07',
  impact: 'high',
  title: 'Unbounded parallel fan out',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400', 'CWE-770'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /Promise\.all|Promise\.allSettled/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (full !== 'Promise.all' && full !== 'Promise.allSettled') return null;

    const first = node.arguments[0];
    if (!first) return null;

    // Promise.all([a, b, c]) with a fixed list is fine. The problem is mapping
    // over a collection whose size you do not control.
    if (first.type === 'ArrayExpression') return null;
    if (!isCall(first)) return null;
    if (lastSegment(memberName(first.callee) ?? '') !== 'map') return null;

    // items.slice(0, 4).map(...) is already bounded, and so is take(n).
    const receiver = first.callee?.object;
    if (isCall(receiver)) {
      const bounded = lastSegment(memberName(receiver.callee) ?? '');
      if (['slice', 'splice', 'take', 'limit', 'chunk'].includes(bounded)) {
        const hasNumericBound = (receiver.arguments ?? []).some(
          (argument) => argument.type === 'NumericLiteral',
        );
        if (hasNumericBound) return null;
      }
    }

    if (LIMITER.test(ctx.source)) return null;

    return { node: first };
  },
  message: () =>
    'Promise.all over a mapped collection starts every task at once. With a thousand rows that is a thousand open sockets or database connections, and the failure looks like a memory problem rather than a concurrency one.',
  fix: 'const limit = pLimit(10);\nawait Promise.all(items.map((item) => limit(() => process(item))));',
};

export const PERF_N08 = {
  id: 'PERF-N08',
  impact: 'high',
  title: 'Stream write with the result thrown away',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.write\s*\(/,
  nodeTypes: ['ForOfStatement', 'ForStatement', 'WhileStatement'],
  match(node, ctx) {
    let write = null;

    walk(node.body, (child) => {
      if (write) return false;
      if (child.type !== 'ExpressionStatement') return undefined;
      const expression = child.expression;
      if (!isCall(expression)) return undefined;
      const name = memberName(expression.callee);
      if (!name || lastSegment(name) !== 'write') return undefined;
      if (/^(res|reply|response)\./.test(name)) return undefined;
      write = expression;
      return undefined;
    });

    if (!write) return null;

    const scope = ctx.source.slice(node.start, node.end);
    if (/drain|pipeline|\.pipe\(/.test(scope)) return null;

    return { node: write };
  },
  message: () =>
    'write returns false when the buffer is full, and this loop ignores it. The data keeps piling up in memory instead of waiting for the stream to catch up.',
  fix: "await pipeline(source, destination);  // or: if (!stream.write(chunk)) await once(stream, 'drain');",
};

export const PERF_N10 = {
  id: 'PERF-N10',
  impact: 'high',
  title: 'Async callback passed to forEach',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-252'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /forEach\s*\(\s*async/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node) {
    const full = memberName(node.callee);
    if (!full || lastSegment(full) !== 'forEach') return null;

    const callback = node.arguments[0];
    if (!callback?.async) return null;

    return { node: callback };
  },
  message: () =>
    'forEach ignores the promise its callback returns, so nothing waits for this work and a rejection becomes an unhandled rejection.',
  fix: 'for (const item of items) await process(item);\n// or, to run them together: await Promise.all(items.map(process));',
};

const EVICTION = /\.delete\(|\.clear\(|LRU|lru|maxSize|max:|ttl|TTL|expire|evict/;

export const PERF_N12 = {
  id: 'PERF-N12',
  impact: 'high',
  title: 'Cache that never evicts anything',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400', 'CWE-770'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /new Map\(|new Set\(/,
  nodeTypes: ['VariableDeclarator'],
  match(node, ctx, parent) {
    if (node.id?.type !== 'Identifier') return null;
    const init = node.init;
    if (!init || init.type !== 'NewExpression') return null;

    const built = memberName(init.callee);
    if (built !== 'Map' && built !== 'Set') return null;

    // Only module level. A map inside a function dies with the call.
    const fn = ctx.functionFor(node);
    if (fn && fn.type !== 'Program') return null;

    const name = node.id.name;
    const writes = new RegExp(`\\b${name}\\.(set|add)\\s*\\(`).test(ctx.source);
    if (!writes) return null;

    if (EVICTION.test(ctx.source)) return null;
    if (!/cache|store|registry|seen|memo|index|lookup|pool/i.test(name)) return null;

    return { node, name };
  },
  message: (f) =>
    `${f.name} lives for the life of the process, gets written to, and nothing ever removes from it. If the keys come from requests, that is a slow memory leak with an attacker holding the tap.`,
  fix: 'Use an LRU with a size cap, or set a TTL and sweep. Bound it by something you control.',
};

export const PERF_N17 = {
  id: 'PERF-N17',
  impact: 'high',
  title: 'Database call inside a loop',
  severity: 'perf',
  owasp2025: 'A10',
  cwe: ['CWE-400'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /for\s*\(|\.map\s*\(/,
  nodeTypes: ['ForOfStatement', 'ForStatement', 'ForInStatement', 'CallExpression'],
  match(node, ctx) {
    let call = null;

    if (node.type === 'CallExpression') {
      const full = memberName(node.callee);
      if (!full || lastSegment(full) !== 'map') return null;
      const callback = node.arguments[0];
      if (!callback?.async) return null;
      call = awaitedCallInside(callback.body);
    } else {
      call = awaitedCallInside(node.body);
    }

    if (!call) return null;

    const name = memberName(call.callee) ?? '';
    const method = lastSegment(name) ?? '';
    if (!DB_CALL.test(method)) return null;
    // A plain fetch of one thing is what the sequential-await rule covers.
    if (!/db|prisma|model|repo|collection|knex|sequelize|query|find|table/i.test(name)) return null;

    return { node: call, call: name };
  },
  message: (f) =>
    `${f.call} runs once per item. A hundred rows means a hundred round trips, and the query that looked fast in development is the one that falls over with real data.`,
  fix: 'const rows = await db.user.findMany({ where: { id: { in: ids } } });\n// then join in memory, one query instead of many',
};

export default [PERF_N01, PERF_N02, PERF_N06, PERF_N07, PERF_N08, PERF_N10, PERF_N12, PERF_N17];
