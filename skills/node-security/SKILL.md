---
name: node-security
description: Fix recipes for insecure Node.js and TypeScript server code. Use when writing or reviewing Express, Fastify, NestJS, or any Node backend, when a guardrails-js finding needs more detail than the one line fix, or when the task involves SQL, shell commands, file paths, outbound requests, authentication, or error handling.
---

# Fixing insecure Node server code

Rules map to OWASP Top 10:2025. The category ids moved in 2025, so check them: injection is A05, access control and SSRF are A01, configuration is A02, crypto and secrets are A04, deserialization is A08, and resource exhaustion and error handling are A10.

## Injection, A05

Parameterise. Escaping is not a substitute, because escaping tries to make hostile data safe while parameters keep data out of the query language.

```js
// wrong
pool.query(`SELECT * FROM users WHERE id = '${req.query.id}'`);

// right
pool.query('SELECT * FROM users WHERE id = $1', [req.query.id]);
```

Table names, column names, and sort direction cannot be parameters. Map them:

```js
const SORT = { name: 'name', created: 'created_at' };
const column = SORT[req.query.sort] ?? 'created_at';
const rows = await pool.query(`SELECT * FROM users ORDER BY ${column}`);
```

Per library:

- Prisma: use the ``$queryRaw`...` `` tagged template. `$queryRawUnsafe` does no binding at all.
- Knex: use the query builder, or `knex.raw('... ?', [value])`.
- Sequelize: `sequelize.query(sql, { replacements: { id } })`.
- TypeORM: `:id` placeholders with `setParameter`.
- Mongo: force scalars with `String(value)` or validate a schema first. A JSON body of `{"email": {"$ne": null}}` turns a lookup into "match anything".

## Shell, A05

`exec` runs the string through `/bin/sh`, so a semicolon starts a second command. `execFile` with an argument array never involves a shell.

```js
// wrong
exec('convert ' + req.body.file);

// right
execFile('/usr/bin/convert', ['-thumbnail', '200x200', name], { shell: false });
```

`shell: true` on `spawn` puts the shell back and undoes the point of using `spawn`.

## Path traversal, A05

Resolve, then check the result is still under the root. Checking the input for `..` is not enough, because URL encoding, unicode, and absolute paths all get past it.

```js
const target = path.resolve(ROOT, name);
if (!target.startsWith(ROOT + path.sep)) throw new Error('bad path');
```

## Server side request forgery, A01

Do not accept a whole URL when an id will do. If you must:

```js
const target = new URL(input);
if (target.protocol !== 'https:') throw new Error('bad protocol');
if (!ALLOWED_HOSTS.has(target.hostname)) throw new Error('host not allowed');
const response = await fetch(target, { redirect: 'error' });
```

Three things people get wrong:

1. Blocking `169.254.169.254` as a string. `0xa9fea9fe`, `2130706433`, `[::]`, and a hostname that resolves to a private address all get past it.
2. Checking the hostname and then following redirects. Hop one is public, hop two is localhost. Set `redirect: 'error'` and re-check yourself.
3. Resolving DNS once to check and again to connect. Between the two, the answer can change. Pin the connection to the address you validated.

## Access control, A01

Query by the record id and the current user together, not by id alone:

```js
// wrong
const invoice = await Invoice.findById(req.params.id);

// right
const invoice = await Invoice.findOne({ where: { id: req.params.id, orgId: req.user.orgId } });
```

For mass assignment, list the fields you accept. Never hand a request body to a model constructor.

## Auth and crypto, A04 and A07

- Pin the JWT algorithm: `jwt.verify(token, key, { algorithms: ['RS256'], issuer, audience })`. `jwt.decode` does not verify anything.
- Passwords go through argon2id, or bcrypt with a cost of at least 10 for older systems.
- Compare secrets with `crypto.timingSafeEqual` on equal length buffers, not `===`.
- Tokens come from `crypto.randomBytes(32)` or `crypto.randomUUID()`.
- Cookies need `httpOnly`, `secure`, and `sameSite`. Regenerate the session id after login.

## Errors and limits, A10

Log the detail, return a correlation id:

```js
app.use((err, req, res, next) => {
  const requestId = crypto.randomUUID();
  logger.error({ err, requestId });
  res.status(500).json({ error: 'Internal error', requestId });
});
```

Set a body limit (`express.json({ limit: '1mb' })`), rate limit login and password reset, and bound any loop or fan out whose size comes from a request.

## When a finding is wrong

Suppress it with a reason, so the decision is on the record:

```js
// guardrails-js-ignore PATH-01 -- name comes from a fixed enum in the route schema
```
