// NestJS and tRPC. OWASP A01:2025.
//
// Both frameworks make authorization a decoration rather than a statement. In
// Nest it is a decorator that can simply be absent, in tRPC it is which builder
// you started the chain from. Neither leaves a gap that reads as wrong, which
// is what makes them worth a rule.

import { walk } from '../../engine/walk.js';
import { memberName, lastSegment, staticString, objectValue, isTrue } from '../helpers.js';

/** Names of the decorators on a class or method. */
function decoratorNames(node) {
  return (node.decorators ?? []).map((decorator) => {
    const expression = decorator.expression;
    if (!expression) return null;
    if (expression.type === 'CallExpression' || expression.type === 'OptionalCallExpression') {
      return lastSegment(memberName(expression.callee));
    }
    return lastSegment(memberName(expression));
  });
}

function hasDecorator(node, name) {
  return decoratorNames(node).includes(name);
}

const MUTATING_ROUTES = ['Post', 'Put', 'Patch', 'Delete'];
const ALL_ROUTES = [...MUTATING_ROUTES, 'Get', 'All', 'Options', 'Head'];

function routeDecorator(node) {
  return decoratorNames(node).find((name) => ALL_ROUTES.includes(name)) ?? null;
}

export const NEST_GUARD = {
  id: 'NEST-GUARD',
  title: 'Nest route with no guard, in a controller that guards others',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-862', 'CWE-306'],
  api: 'API5',
  languages: ['ts', 'tsx', 'js'],
  prefilter: /@Controller|UseGuards/,
  nodeTypes: ['ClassDeclaration', 'ClassExpression'],
  match(node, ctx) {
    if (!hasDecorator(node, 'Controller')) return null;

    // A global guard registered through APP_GUARD covers everything, and it
    // usually lives in another file. Saying nothing is better than saying it
    // about every controller in the project.
    if (/APP_GUARD/.test(ctx.source)) return null;

    const methods = (node.body?.body ?? []).filter(
      (member) => member.type === 'ClassMethod' && routeDecorator(member),
    );
    if (methods.length === 0) return null;

    const classGuarded = hasDecorator(node, 'UseGuards');
    if (classGuarded) return null;

    const guarded = methods.filter((method) => hasDecorator(method, 'UseGuards'));
    const unguarded = methods.filter(
      (method) =>
        !hasDecorator(method, 'UseGuards') && MUTATING_ROUTES.includes(routeDecorator(method)),
    );

    // Only speak up when this controller demonstrably guards per route. If
    // nothing here is guarded, a global guard is the likely explanation and a
    // finding would be noise.
    if (guarded.length === 0 || unguarded.length === 0) return null;

    const first = unguarded[0];
    return {
      node: first,
      method: first.key?.name ?? 'a route',
      verb: routeDecorator(first),
      guardedCount: guarded.length,
    };
  },
  message: (f) =>
    `${f.method} handles @${f.verb} with no @UseGuards, while ${f.guardedCount} other route${
      f.guardedCount === 1 ? '' : 's'
    } in this controller has one. A missing decorator is a public endpoint and it looks exactly like a guarded one.`,
  fix: "@UseGuards(AuthGuard, RolesGuard)\n@Post()\nasync create(@Body() dto: CreateDto) { ... }",
};

const SENSITIVE_NAME =
  /(admin|internal|delete|remove|purge|impersonate|billing|payout|refund|role|permission|password|token|secret|export|import)/i;

export const NEST_PUBLIC = {
  id: 'NEST-PUBLIC',
  title: 'Sensitive Nest route marked public',
  severity: 'high',
  owasp2025: 'A01',
  cwe: ['CWE-862'],
  api: 'API5',
  languages: ['ts', 'tsx', 'js'],
  prefilter: /@Public|isPublic|SkipAuth|AllowAnonymous/,
  nodeTypes: ['ClassMethod'],
  match(node, ctx) {
    const names = decoratorNames(node);
    const isPublic = names.some((name) =>
      ['Public', 'SkipAuth', 'AllowAnonymous', 'NoAuth'].includes(name),
    );
    if (!isPublic) return null;

    const verb = routeDecorator(node);
    if (!verb) return null;

    const methodName = node.key?.name ?? '';
    const path =
      (node.decorators ?? [])
        .map((decorator) => staticString(decorator.expression?.arguments?.[0]))
        .find(Boolean) ?? '';

    const sensitive = SENSITIVE_NAME.test(methodName) || SENSITIVE_NAME.test(path);
    const mutating = MUTATING_ROUTES.includes(verb);
    if (!sensitive && !mutating) return null;

    return {
      node,
      method: methodName || 'this route',
      verb,
      severityHint: sensitive ? 'high' : 'medium',
    };
  },
  message: (f) =>
    `${f.method} is marked public and handles @${f.verb}. Whatever global guard protects the rest of the application skips this one, so it is reachable with no credentials at all.`,
  fix: 'Remove the public decorator, or narrow it so only the specific unauthenticated step is exposed.',
};

export const NEST_WHITELIST = {
  id: 'NEST-WHITELIST',
  title: 'ValidationPipe keeps unknown fields',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-915'],
  api: 'API3',
  languages: ['ts', 'tsx', 'js'],
  prefilter: /ValidationPipe/,
  nodeTypes: ['NewExpression', 'CallExpression'],
  match(node) {
    const name = lastSegment(memberName(node.callee) ?? '');
    if (name !== 'ValidationPipe') return null;

    const options = node.arguments?.[0];
    if (options?.type === 'ObjectExpression' && isTrue(objectValue(options, 'whitelist'))) {
      return null;
    }

    return { node, bare: !options };
  },
  message: (f) =>
    `ValidationPipe is set up ${
      f.bare ? 'with no options' : 'without whitelist'
    }, so properties your DTO never declared are validated as absent and then passed through anyway. Posting isAdmin true reaches the service layer.`,
  fix: 'new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })',
};

/** The chain of member names on a call, so a.b().c() reads as [a, b, c]. */
function chainNames(node) {
  const names = [];
  let current = node;

  while (current) {
    if (current.type === 'CallExpression' || current.type === 'OptionalCallExpression') {
      current = current.callee;
      continue;
    }
    if (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression') {
      const property = current.computed ? null : (current.property?.name ?? null);
      if (property) names.unshift(property);
      current = current.object;
      continue;
    }
    if (current.type === 'Identifier') {
      names.unshift(current.name);
    }
    break;
  }

  return names;
}

const PUBLIC_BUILDERS = /^(publicProcedure|t\.procedure|procedure|baseProcedure)$/;

export const TRPC_PUBLIC = {
  id: 'TRPC-PUBLIC',
  title: 'tRPC mutation on a public procedure',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-862'],
  api: 'API5',
  languages: ['ts', 'tsx', 'js'],
  prefilter: /publicProcedure|baseProcedure|t\.procedure/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const chain = chainNames(node);
    if (chain.length < 2) return null;
    if (chain[chain.length - 1] !== 'mutation') return null;
    if (!PUBLIC_BUILDERS.test(chain[0])) return null;

    // Only worth saying when the project has a protected builder to use.
    if (!/protectedProcedure|authedProcedure|privateProcedure|requireAuth/.test(ctx.source)) {
      return null;
    }

    // A resolver that checks the session itself is fine.
    const body = ctx.source.slice(node.start, node.end);
    if (/ctx\.(session|user|auth)\b/.test(body)) return null;

    return { node, chain: chain.join('.') };
  },
  message: (f) =>
    `${f.chain} changes state and starts from a public builder, so it runs with no session. The only difference from a protected one is the word at the front of the chain.`,
  fix: 'protectedProcedure.input(schema).mutation(({ ctx, input }) => ...)',
};

export const TRPC_INPUT = {
  id: 'TRPC-INPUT',
  title: 'tRPC resolver reads input with no schema',
  severity: 'high',
  owasp2025: 'A05',
  cwe: ['CWE-20'],
  api: 'API3',
  languages: ['ts', 'tsx', 'js'],
  prefilter: /\.(query|mutation|subscription)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const chain = chainNames(node);
    const tail = chain[chain.length - 1];
    if (!['query', 'mutation', 'subscription'].includes(tail)) return null;
    if (!/procedure/i.test(chain[0] ?? '')) return null;

    // A schema anywhere in the chain is the fix.
    if (chain.includes('input') || chain.includes('output')) return null;

    const resolver = node.arguments?.[0];
    if (!resolver) return null;
    if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(resolver.type)) return null;

    // Only a problem when the resolver actually uses input.
    const usesInput = (resolver.params ?? []).some((param) => {
      if (param.type === 'Identifier') return param.name === 'input';
      if (param.type !== 'ObjectPattern') return false;
      return param.properties.some((property) => property.key?.name === 'input');
    });
    if (!usesInput) return null;

    return { node, chain: chain.join('.') };
  },
  message: (f) =>
    `${f.chain} reads input but no .input(schema) runs before it, so whatever the client sends arrives unchecked and untyped at runtime. The TypeScript type is a comment here, not a check.`,
  fix: 'protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(({ input }) => ...)',
};

export default [NEST_GUARD, NEST_PUBLIC, NEST_WHITELIST, TRPC_PUBLIC, TRPC_INPUT];
