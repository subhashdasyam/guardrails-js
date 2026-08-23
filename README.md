# guardrails-js

A Claude Code plugin that tells Claude when the JavaScript it just wrote is unsafe or slow, so Claude fixes it in the same turn.

Status: design done, no code yet. The full design is in [docs/PLAN.md](docs/PLAN.md).

## The problem

Claude writes JavaScript fast, and by default it writes it badly. String-built SQL. `child_process.exec` with data from a request. `dangerouslySetInnerHTML`. `v-html`. `Math.random()` for session tokens. `rejectUnauthorized: false`. Sync file reads inside a route handler. Then it runs `npm install` on a package nobody checked, and the postinstall script runs before you can look at it.

## What it does

The plugin hooks into Claude Code at three points.

At session start it reads your `package.json`, works out your stack, and gives Claude a short set of rules for that stack only. A Vue project never gets React rules.

After every file write it scans the code. A cheap regex pass runs first. If nothing matches, the hook exits and costs you nothing. If something does match, it parses the file and runs the real checks. Findings go back to Claude, which rewrites the code.

Before every `npm install` it checks the package. If the name is one edit away from a popular package, or it is not in your lockfile, or it is on the known-bad list, you get asked before anything runs.

## What it does not do

It never blocks a file write. The file lands, then Claude gets told what is wrong. Blocking edits makes Claude get stuck, and one bad rule ruins your day.

The `npm install` prompt is the only place it interrupts you. Advice after a postinstall script has already run is worthless.

It has no Python in it. Not in the analyzer, not in the hooks, not in the build.

It makes no model calls by default, so it costs nothing to run.

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
| Model cost | a model call per turn and per commit | none |
| Deep model review | yes | off by default |

They use different hooks and do not fight each other. Run both.

## What it checks

About 60 rules, each mapped to [OWASP Top 10:2025](https://owasp.org/Top10/2025/), CWE, and where it fits, the OWASP API Top 10.

For the record: there is no OWASP Top 10 2026. The 2025 list came out in November 2025 and is the current one. An LLM Top 10 2026 exists, but that is a separate project.

Rules cover:

- Injection: SQL, NoSQL operators, shell, path traversal, template injection, header injection
- Cross-site scripting: `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `eval`, unsafe `href`
- Server-side request forgery, including redirect following and metadata endpoints
- Auth and crypto: JWT algorithm pinning, `jwt.decode` used as a check, weak password hashing, timing-unsafe comparison, cookie flags
- Access control: object references without an ownership check, mass assignment, routes with no guard
- Deserialization: `node-serialize`, `vm2`, dynamic `require`, `js-yaml`
- Framework CVEs: Next.js middleware bypass (CVE-2025-29927), React Server Components (CVE-2025-55182), Nuxt and Vite dev server exposure
- Secrets and config: hardcoded keys, disabled TLS checks, wildcard CORS with credentials, stack traces sent to clients
- Prototype pollution
- npm supply chain: lockfile policy, install scripts, known-bad versions
- Performance: sync work in request handlers, unbounded `Promise.all`, ignored stream backpressure, N+1 queries, React key and re-render problems, Vue reactivity problems

It does not warn about missing `useMemo`. React's own docs say memoization is an optimization, not a bug, and linting for its absence is noise.

## Privacy

By default the npm check asks osv.dev and registry.npmjs.org about packages you are installing. That means package names leave your machine. Set `"network": false` in `.guardrails-js.json` to turn it off. The offline checks still work.

## Install

Not published yet. When it is:

```
/plugin marketplace add subhashdasyam/guardrails-js
/plugin install guardrails-js@guardrails-js
```

## Build order

| Version | What lands |
|---|---|
| v0.1 | Engine, hooks, config, reporting, 22 Node rules, npm gate |
| v0.2 | Auth, crypto, access control, denial of service, prototype pollution |
| v0.3 | React and Next.js |
| v0.4 | Vue and Nuxt |
| v0.5 | Performance rules |
| v1.0 | Repo-wide audit command, CI mode, docs, published |

Roughly three weeks. Every version works on its own.

## License

MIT
