# guardrails-js

A Claude Code plugin that tells Claude when the JavaScript it just wrote is unsafe or slow, so Claude fixes it in the same turn.

**v0.1 works today**: 22 rules for Node and Express, the npm install gate, session priming, and the repo audit command. React, Vue, and the performance pack are next. The full design is in [docs/PLAN.md](docs/PLAN.md).

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

It makes no model calls, so it costs nothing to run.

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
| Model cost | a model call per turn and per commit | none |
| Deep model review | yes | none |

They use different hooks and do not fight each other. Run both.

## What it checks today

22 rules, each mapped to [OWASP Top 10:2025](https://owasp.org/Top10/2025/) and CWE.

| Rule | What it catches | OWASP |
|---|---|---|
| SQL-01, SQL-02, SQL-03 | SQL built from request data, raw ORM queries, `$queryRawUnsafe` | A05 |
| NOSQL-01, NOSQL-02 | Mongo operator injection, `$where` with user input | A05 |
| CMD-01, CMD-02 | `exec` with a built string, `shell: true` on spawn | A05 |
| PATH-01 | File paths from user input with no containment check | A05 |
| SSTI-01 | Templates compiled from user input | A05 |
| HTTP-01 | Header injection and open redirects | A05 |
| SSRF-01, SSRF-02, SSRF-03 | Requests to user supplied URLs, redirect following, string based host blocking | A01 |
| DESER-01 to DESER-04 | `node-serialize`, `vm` and `vm2`, computed `require`, unsafe YAML | A08, A05 |
| SECRET-01 | Keys written into source | A04 |
| TLS-01 | Certificate checking turned off | A02 |
| CORS-01 | Any origin allowed with credentials | A02 |
| ERR-01 | Stack traces sent to clients | A10 |
| PROXY-01 | `trust proxy` set to true | A02 |

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

## Privacy

By default the npm check asks osv.dev and registry.npmjs.org about packages you are about to install. That means package names leave your machine. Set `"network": false` to turn it off. The offline checks still work: the bundled known-bad list, the typosquat distance check, and the lockfile comparison all run locally in about five milliseconds.

Nothing else ever leaves your machine. File contents are never sent anywhere.

## Development

```bash
npm ci --ignore-scripts
npm test              # 109 rule and engine tests
npm run build         # rebuild dist/, which is committed
npm run check:dist    # fail if the committed bundle is stale
npm run bench         # latency budget
node test/hooks.contract.mjs
```

Every rule needs one case that must fire and at least two safe lookalikes that must not, in `test/cases/`. On top of that, `test/corpus/` holds correct code full of near misses, and any finding there fails the build. That gate is what stops the rule set turning into noise.

Measured on this machine: 34 ms for a clean file, 48 ms when a rule fires. Most of that is Node starting up.

## What is next

| Version | What lands |
|---|---|
| v0.2 | Auth, crypto, access control, denial of service, prototype pollution |
| v0.3 | React and Next.js, including the middleware and server action rules |
| v0.4 | Vue and Nuxt, with real template parsing |
| v0.5 | Performance rules |
| v1.0 | Published to the marketplace |

## License

MIT
