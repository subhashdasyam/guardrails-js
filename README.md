# guardrails-js

A Claude Code plugin that tells Claude when the JavaScript it just wrote is unsafe or slow, so Claude fixes it in the same turn.

**v1.0**: 78 rules covering security and performance across Node, Express, Fastify, NestJS, React, Next.js, Vue, and Nuxt, plus dependency version checks, the npm install gate, session priming, a repo audit command, and a CLI for CI. See the [changelog](CHANGELOG.md) and the [design notes](docs/PLAN.md).

## The problem

Claude writes JavaScript fast, and by default it writes it badly. String-built SQL. `child_process.exec` with data from a request. `dangerouslySetInnerHTML`. `Math.random()` for session tokens. `rejectUnauthorized: false`. Then it runs `npm install` on a package nobody checked, and the postinstall script runs before you can look at it.

## How it works

Three hooks.

**At session start** it reads your `package.json`, works out your stack, and gives Claude a short rule set for that stack only. A Vue project never gets React rules. It also flags problems that are already there, such as a missing lockfile or a known compromised dependency version.

**After every file write** it scans the code. A regex pass runs first, and if nothing matches the hook exits having done almost no work. On a match it parses the file, tracks where request data flows, and reports what it finds. Critical and high findings go back to Claude on the loud channel so it rewrites them. Everything else arrives as a quiet note.

The scan runs in the background and never makes Claude wait.

**Before every `npm install`** it checks the package against a known-bad list, measures how close the name is to a popular package, and looks at whether it is already in your lockfile. If anything looks off you get asked before the install runs.

## What it will not do

It never blocks a file write. The file lands, then Claude gets told what is wrong. Blocking edits makes Claude get stuck, and one bad rule ruins your day.

The `npm install` prompt is the only place it interrupts you, because advice after a postinstall script has already run is worthless. Even then it asks rather than refusing.

There is no Python in it. Not in the analyzer, not in the hooks, not in the build.

It makes no model calls by default, so it costs nothing to run. There is an opt-in second opinion, described below, that you have to install yourself.

## Install

```
/plugin marketplace add subhashdasyam/guardrails-js
/plugin install guardrails-js@guardrails-js
```

Nothing else to set up. There are no runtime dependencies: the parser is bundled into `dist/`, which is committed, so a clone is all it takes.

Check it loaded with `/hooks`. You should see three entries under Plugin Hooks.

## Commands

| Command | What it does |
|---|---|
| `/guardrails-js:audit [path]` | Scan the whole repository, not just what Claude touched |
| `/guardrails-js:report` | Summarise what has been flagged this session |

There is also a CLI for CI:

```bash
node dist/audit.mjs src --format json --fail-on high
```

## How it compares to the official plugin

Anthropic ships [`security-guidance`](https://code.claude.com/docs/en/security-guidance), which you should probably also install. It solves a different part of the problem.

| | security-guidance | guardrails-js |
|---|---|---|
| Runtime | Python 3.10+, pip, Agent SDK | Node only, nothing to install |
| How it detects | substring and regex match | regex first, then a real parser and taint tracking |
| Languages | any language, generic patterns | Node, Express, Fastify, Nest, React, Next, Vue, Nuxt |
| npm supply chain | nothing | install gate, known-bad list, typosquat check |
| Performance checks | nothing | event loop, concurrency, memory, React and Vue render |
| Dependency CVEs | nothing | Next.js, React Server Components, Nuxt, Vite version checks |
| Model cost | a model call per turn and per commit | none unless you opt in |
| Deep model review | yes, always on | opt-in, four rules only |

They use different hooks and do not fight each other. Run both.

## What it checks today

78 rules plus 4 dependency advisories, each mapped to [OWASP Top 10:2025](https://owasp.org/Top10/2025/), CWE, and where it fits the OWASP API Top 10.

Injection and interpreters, A05:

| Rule | What it catches |
|---|---|
| SQL-01, SQL-02, SQL-03 | SQL built from request data, raw ORM queries, `$queryRawUnsafe` |
| NOSQL-01, NOSQL-02 | Mongo operator injection, `$where` with user input |
| CMD-01, CMD-02 | `exec` with a built string, `shell: true` on spawn |
| PATH-01, ZIP-01 | Paths from user input, archive entries written outside the target directory |
| SSTI-01 | Templates compiled from user input |
| HTTP-01 | Header injection and open redirects |

Access control and requests, A01:

| Rule | What it catches |
|---|---|
| SSRF-01, SSRF-02, SSRF-03 | User supplied URLs, redirect following, string based host blocking |
| IDOR-01 | Records fetched by id with nothing tying them to the caller |
| MASS-01 | Request body written straight into a model |
| AUTHZ-01 | Sensitive route registered with no middleware |
| CSRF-01 | Cookie authenticated route with no CSRF protection |
| PP-01 to PP-04 | Recursive merge, `Object.assign` from a body, lodash deep merge, computed key writes |

Authentication and cryptography, A04 and A07:

| Rule | What it catches |
|---|---|
| JWT-01, JWT-02, JWT-03 | Algorithm not pinned, `decode` used instead of `verify`, `none` allowed |
| AUTH-01, AUTH-02 | Signing key in source, security values from `Math.random` |
| CRYPTO-01, CRYPTO-02 | `createCipher`, fixed IV, ECB and other broken modes |
| PASS-01, PASS-02 | Passwords through a fast hash, bcrypt cost below 10 |
| TIMING-01 | Secrets compared with `===` |
| COOKIE-01, SESSION-01 | Missing cookie flags, session id not rotated at login |
| SECRET-01 | Keys written into source |

Configuration and resource limits, A02 and A10:

| Rule | What it catches |
|---|---|
| TLS-01 | Certificate checking turned off |
| CORS-01 | Any origin allowed with credentials |
| ERR-01 | Stack traces sent to clients |
| PROXY-01 | `trust proxy` set to true |
| REDOS-01 | Regular expressions that can backtrack forever |
| BODY-01, UPLOAD-01 | Body parsers and file uploads with no size limit |
| RATE-01 | Login and password reset endpoints with no rate limit |
| DESER-01 to DESER-04 | `node-serialize`, `vm` and `vm2`, computed `require`, unsafe YAML |

React and Next.js:

| Rule | What it catches |
|---|---|
| XSS-01, XSS-02 | `dangerouslySetInnerHTML` and `innerHTML` with no sanitiser |
| XSS-05 | `eval`, `new Function`, `setTimeout` with a string |
| XSS-06, LINK-01 | Link targets with no protocol check, `target="_blank"` with no `rel` |
| MSG-01 | `postMessage` handlers that never check `event.origin` |
| NEXT-MW | Middleware used as the only auth check, and code trusting `x-middleware-subrequest` |
| SERVER-ACTION | A `'use server'` function with no auth check, which is a public endpoint |
| NEXT-IMG | Image optimizer configured to fetch from any host |

Vue and Nuxt:

| Rule | What it catches |
|---|---|
| XSS-03 | `v-html` with no sanitiser |
| VUE-URL | A bound `:href` or `:src` with no protocol check |
| VUE-SSR | A Vue template compiled from a string that came from outside |
| VITE-HOST | A dev server bound to every interface |
| NUXT-ROUTE-RULES | Route rules covering a sensitive path, which is rendering config and not authorization |

Supply chain, A03. These take a project rather than a syntax tree, so they read `package.json`, the lockfile, `.npmrc`, and your CI:

| Rule | What it catches |
|---|---|
| SUPPLY-LOCK | No lockfile, `package-lock=false` in `.npmrc`, or a script passing `--no-package-lock` |
| SUPPLY-SCRIPTS | Nothing disables install scripts, so every package in the tree runs code on install |
| SUPPLY-DENY | A known compromised release present in the lockfile or pinned in the manifest |
| SUPPLY-PROV | Nothing in the project or its CI ever runs `npm audit signatures` |

They re-run whenever `package.json`, `.npmrc`, or a lockfile is written, and once at session start.

Dependency versions, A03. Some problems are not in your code at all, so these read the lockfile:

| Rule | What it catches |
|---|---|
| NEXT-VER | Next.js middleware bypass (CVE-2025-29927) and image optimizer exhaustion |
| RSC-VER | React Server Components unauthenticated RCE (CVE-2025-55182) |
| NUXT-VER | Nuxt dev server disclosure and the 2026 server island fixes |
| VITE-VER | Vite dev server arbitrary file read (CVE-2025-30208, CVE-2025-31125) |

Performance. These always report on the quiet channel and never interrupt, because whether they matter depends on data the analyzer cannot see:

| Rule | What it catches |
|---|---|
| PERF-N01, PERF-N02 | Synchronous file, crypto, and compression calls in a request handler |
| PERF-N06 | Awaiting one at a time in a loop when the calls are independent |
| PERF-N07 | `Promise.all` over a mapped collection with no concurrency limit |
| PERF-N08 | Stream writes that ignore the return value, so backpressure is lost |
| PERF-N10 | An async callback handed to `forEach`, which nothing waits for |
| PERF-N12 | A process wide cache that nothing ever evicts from |
| PERF-N17 | A database call inside a loop, which is the N+1 query |
| REACT-04 | A fresh object or arrow function passed to a memoized child, defeating the memo |
| REACT-05 | The array index or a random value used as a list key |
| REACT-07 | Derived state computed inside `useEffect` instead of during render |
| VUE-04, VUE-07 | `v-for` with `v-if` on the same element, and `v-for` with no stable key |

There is deliberately no rule for missing `useMemo`. React's own documentation says memoization is an optimization and not a semantic guarantee, so linting for its absence produces noise and teaches people to wrap everything, which is slower and harder to read.

Version checks read the lockfile when there is one, because that is the version you actually installed. With no lockfile they fall back to the lowest version the range allows and drop a severity level, since a range such as `^15.1.0` may already resolve to something patched.

Vue single file components are handled in two halves. The `<script>` block is parsed properly, with byte offsets preserved so line numbers need no mapping. The `<template>` block goes through a small attribute scanner rather than the real Vue compiler, which keeps the bundle less than half the size it would otherwise be. The scanner handles nesting, quoted values, comments, and shorthand bindings, and it does not handle dynamic attribute names such as `:[key]`. Those come out as no match rather than a wrong match, so the failure direction is a missed finding and never a false one.

Rules that need to reason across functions to be sure, such as IDOR-01, AUTHZ-01, and CSRF-01, ship at medium severity and stay on the quiet channel. They are prompts to look, not accusations.

For the record: there is no OWASP Top 10 2026. The 2025 list came out in November 2025 and is the current one. An LLM Top 10 2026 exists, but that is a separate project.

Three skills carry the longer fix recipes and load only when Claude needs them: `node-security`, `react-vue-security`, and `npm-supply-chain`.

## Configuration

Optional `.guardrails-js.json` in your project root:

```json
{
  "disableRules": ["PROXY-01"],
  "severityOverrides": { "HTTP-01": "low" },
  "excludePaths": ["**/legacy/**"],
  "network": true,
  "minSeverity": "low",
  "priming": true
}
```

To silence one line, say why:

```js
// guardrails-js-ignore SQL-01 -- id is an integer validated by the route schema
const rows = await pool.query(`SELECT * FROM t WHERE id = ${id}`);
```

The reason after `--` is required. An ignore without one gets reported itself, so suppressions stay reviewable.

If a finding comes back twice and you fix it twice, the third time it drops to a quiet note instead of looping.

## Model escalation, off by default

Four rules cannot be settled by a parser alone, because answering them means following code across functions: IDOR-01, AUTHZ-01, CSRF-01, and MASS-01. They ship at medium and stay on the quiet channel for exactly that reason.

If you want a second opinion on those four, `hooks/escalation.json` is a prompt hook that asks a model to judge them. It is not loaded by the plugin, because the plugin advertises zero model calls and that has to stay true unless you say otherwise. Installing it is the switch, and there is no config flag, so there is only one thing to check when you wonder whether it is on.

To turn it on, copy the `PostToolUse` entry from `hooks/escalation.json` into your `.claude/settings.json` under `hooks`. It runs on the fast model, is capped at 30 seconds, and can only add context. It cannot block a write or stop a turn, which is deliberate: a model should not get to halt your work on its own judgement.

The prompt tells it to refute by default and say nothing unless it can point at a line and describe what an attacker sends and what they get back. A wrong second opinion is worse than none, because it teaches you to ignore the tool.

Cost: one fast-model call per file write, so leave it off unless you are working on something where authorization mistakes are expensive.

## Privacy

By default the npm check asks osv.dev and registry.npmjs.org about packages you are about to install. That means package names leave your machine. Set `"network": false` to turn it off. The offline checks still work: the bundled known-bad list, the typosquat distance check, and the lockfile comparison all run locally in about five milliseconds.

Nothing else ever leaves your machine. File contents are never sent anywhere.

## Development

```bash
npm ci --ignore-scripts
npm test              # 309 rule, engine, supply chain, and dependency tests
npm run build         # rebuild dist/, which is committed
npm run check:dist    # fail if the committed bundle is stale
npm run bench         # latency budget
node test/hooks.contract.mjs
```

Every rule needs one case that must fire and at least two safe lookalikes that must not, in `test/cases/`. On top of that, `test/corpus/` holds correct code full of near misses, and any finding there fails the build. That gate is what stops the rule set turning into noise.

The latency gate measures the plugin, not the machine, because absolute wall clock varies by more than the thing being measured. It compares against a bare node process and against the hook loading and exiting early. On a development machine: 20 ms to load the bundle, 2 ms to scan a clean file, 15 ms to scan one with findings. Node startup accounts for the rest of the roughly 37 ms a write costs end to end.

## What is next

Nothing is promised. Things worth doing, roughly in order of how much they would help:

- More rules for NestJS guards and tRPC procedures, where authorization is easy to leave out and hard to see.
- A real Vue template parse, if the bundle cost stops mattering or the scanner starts missing things people hit.
- Angular and Svelte, which share most of the same sinks under different names.
- A wider popular package list so the install gate asks less often about real dependencies.

If a rule fires on correct code, that is a bug worth reporting. The false positive corpus in `test/corpus/` exists precisely so those get fixed rather than tolerated.

## License

MIT
