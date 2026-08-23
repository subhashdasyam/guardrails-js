// What Claude gets told at session start. Kept short on purpose: this is paid
// for in every session, so it holds the rules that stop the most common
// mistakes and nothing else. The deeper material lives in the skills, which
// load only when needed.

export const CORE = `guardrails-js is watching this session. Write it right the first time:
- Never build SQL, shell commands, file paths, URLs, or HTML by pasting request data into a string. Use bound parameters, argument arrays, path containment checks, and URL allowlists.
- Use execFile with an argument array, never exec with a built string.
- Secrets come from process.env. Never write a key into source, not even a test one.
- Never set rejectUnauthorized to false or NODE_TLS_REJECT_UNAUTHORIZED to 0.
- crypto.randomBytes or crypto.randomUUID for anything security related. Math.random is not random enough.
- Send generic errors to clients. Log the detail server side with a request id.`;

export const EXPRESS = `Express and friends:
- Every state changing route needs an auth check and an ownership check. Query by both the record id and the current user id, not by id alone.
- express.json needs a limit. app.use(express.json({ limit: '1mb' })).
- cors with credentials needs an exact origin allowlist, never origin: true and never a wildcard.
- trust proxy takes a hop count or a CIDR list, not true.
- Rate limit login, password reset, and anything that sends mail.`;

export const NEST = `NestJS:
- Sensitive controllers need @UseGuards or a global guard. A missing guard is a public endpoint.
- Use DTOs with class-validator and whitelist: true so unexpected fields are stripped rather than saved.`;

export const FASTIFY = `Fastify:
- Route level auth goes in preHandler. A route with no preHandler and no global hook is public.
- Give every route a body schema. Fastify validates it for free and it kills operator injection.`;

export const SQL = `Databases:
- Parameterised queries only. pool.query('... WHERE id = $1', [id]).
- Prisma: use the $queryRaw tagged template, never $queryRawUnsafe.
- Table names, column names, and sort direction cannot be parameters. Map them through an allowlist object.
- Mongo: force scalars with String(...) or validate a schema first, or {"$ne": null} matches everything.`;

export const REACT = `React:
- dangerouslySetInnerHTML needs sanitised HTML from DOMPurify, or do not use it.
- Give list items a stable id as the key. Not the array index, not Math.random().
- Do not compute derived state inside useEffect. Work it out during render.
- postMessage handlers must check event.origin against an exact value before touching event.data.`;

export const NEXT = `Next.js:
- Middleware is not an authorization boundary on its own. Check auth again inside the route or server action. CVE-2025-29927 bypassed middleware with a request header.
- Every function marked 'use server' is a public HTTP endpoint. It needs its own auth check and input validation, whatever page links to it.
- Keep next and react-server-dom packages patched. CVE-2025-55182 was unauthenticated remote code execution in React Server Components.`;

export const VUE = `Vue:
- v-html renders raw HTML. Sanitise first or use text interpolation.
- Never compile a template from a string a user supplied.
- Key every v-for with a stable id. Do not put v-if on the same element as v-for.`;

export const NUXT = `Nuxt and Vite:
- Never expose a dev server or devtools to a network. Vite CVE-2025-30208 and CVE-2025-31125 served arbitrary files that way, and Nuxt CVE-2025-24360 leaked source through permissive dev CORS.
- Route rules are not an authorization boundary. Check auth in the handler.`;

export const GRAPHQL = `GraphQL:
- Authorize inside each resolver against the context user. A resolver that trusts args.id is an IDOR.
- Set a depth limit, a complexity budget, and pagination. Without them one query can take the server down.`;

export const PERF = `Performance, on the server:
- Nothing synchronous in a request handler. No readFileSync, no bcrypt.compareSync, no long loops. Node runs your code on one thread and everyone queues behind it.
- Do not await inside a loop when the calls are independent. Promise.all them, with a limiter when the list size comes from a request.
- Never query the database inside a loop. Fetch with an IN clause and join in memory.
- Any cache that lives for the process needs a size cap or a TTL.

Performance, in the browser:
- Keys are stable ids, never the array index.
- Do not compute derived values inside useEffect or a watcher. Work them out during render or in a computed.
- Do not add useMemo everywhere. React's own docs say it only helps for genuinely slow work with stable dependencies.`;

export const NPM = `Dependencies:
- Use npm ci in CI, never npm install.
- Confirm a package exists on the registry before adding it. Made up names get registered by attackers within hours.
- Prefer --ignore-scripts. Install scripts run with your permissions.`;

const DETECTORS = [
  { pack: EXPRESS, deps: ['express', 'koa', 'hapi', '@hapi/hapi'] },
  { pack: NEST, deps: ['@nestjs/core', '@nestjs/common'] },
  { pack: FASTIFY, deps: ['fastify'] },
  { pack: SQL, deps: ['pg', 'mysql', 'mysql2', 'sqlite3', 'better-sqlite3', 'knex', 'sequelize', 'typeorm', '@prisma/client', 'prisma', 'drizzle-orm', 'mongoose', 'mongodb'] },
  { pack: REACT, deps: ['react', 'react-dom'] },
  { pack: NEXT, deps: ['next'] },
  { pack: VUE, deps: ['vue'] },
  { pack: NUXT, deps: ['nuxt', 'vite'] },
  { pack: GRAPHQL, deps: ['graphql', '@apollo/server', 'apollo-server', 'graphql-yoga', '@trpc/server'] },
];

/** Which packs apply, based on what the project actually depends on. */
export function packsFor(dependencies) {
  const names = new Set(Object.keys(dependencies ?? {}));
  const chosen = [CORE];

  for (const detector of DETECTORS) {
    if (detector.deps.some((dep) => names.has(dep))) chosen.push(detector.pack);
  }

  chosen.push(PERF);
  chosen.push(NPM);
  return chosen;
}

export function stackLabel(dependencies) {
  const names = new Set(Object.keys(dependencies ?? {}));
  const found = [];
  const check = (label, deps) => {
    if (deps.some((dep) => names.has(dep))) found.push(label);
  };

  check('Express', ['express']);
  check('Fastify', ['fastify']);
  check('NestJS', ['@nestjs/core']);
  check('Next.js', ['next']);
  check('React', ['react']);
  check('Nuxt', ['nuxt']);
  check('Vue', ['vue']);
  check('GraphQL', ['graphql']);
  check('Prisma', ['@prisma/client', 'prisma']);
  check('Mongo', ['mongoose', 'mongodb']);

  return found.length > 0 ? found.join(', ') : 'plain Node';
}
