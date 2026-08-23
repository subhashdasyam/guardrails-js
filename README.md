<p align="center">
  <img src="assets/images/guardrails-js-hero.jpg" alt="guardrails-js" width="820">
</p>

<h1 align="center">🛡️ guardrails-js</h1>

<p align="center">
  <b>Claude writes the SQL injection. This catches it before you ever see it.</b>
</p>

<p align="center">
  <a href="https://github.com/subhashdasyam/guardrails-js/actions/workflows/ci.yml"><img src="https://github.com/subhashdasyam/guardrails-js/actions/workflows/ci.yml/badge.svg" alt="ci"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20.10-brightgreen" alt="node">
  <img src="https://img.shields.io/badge/rules-87-blue" alt="rules">
  <img src="https://img.shields.io/badge/runtime%20deps-0-blue" alt="runtime deps">
  <img src="https://img.shields.io/badge/python-none-blue" alt="python">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license">
</p>

A Claude Code plugin that reads every file Claude writes, spots the unsafe and slow patterns, and tells Claude to fix them. In the same turn. Before the code reaches you.

---

## 😬 The 20 seconds this saves you

You ask for an endpoint. Claude writes this:

```js
app.get('/user', async (req, res) => {
  const rows = await pool.query(`SELECT * FROM users WHERE id = '${req.query.id}'`);
  res.json(rows);
});
```

The file lands. Then, without you doing anything:

```
guardrails-js found 1 issue in api.js that needs fixing before you move on:

1. SQL-01 [HIGH | OWASP A05:2025 | CWE-89] line 6
   SQL string is built from req.query.id. A value like "' OR 1=1 --" changes the query.
   found: `SELECT * FROM users WHERE id = '${req.query.id}'`
   fix: pool.query('SELECT * FROM users WHERE id = $1', [req.query.id])
```

Claude reads that and rewrites it. You watch the corrected version appear. 🎯

---

## 🔬 Why not just tell Claude to write secure code?

Because it agrees with you and then does it anyway on the next file.

This does not ask nicely. It parses what was actually written, tracks where request data flows, and reports what it finds. **87 rules**, each mapped to [OWASP Top 10:2025](https://owasp.org/Top10/2025/) and CWE.

Three hooks do the work:

🌱 **Session start.** Reads your `package.json`, works out your stack, and hands Claude a short rule set for that stack only. A Vue project never gets React rules. It also flags what is already broken: a missing lockfile, a known compromised dependency.

🔍 **After every file write.** A regex pass runs first. Nothing matches, the hook exits having done almost no work. Something matches, it parses the file properly and tracks the taint. Critical and high findings go back loud so Claude rewrites them. Everything else arrives as a quiet note. The scan runs in the background and never makes Claude wait.

🚧 **Before every `npm install`.** Checks the name against a known-bad list, measures how close it is to a popular package, looks at whether it is already in your lockfile, and asks osv.dev whether that exact version has a published problem.

---

## 🚨 The osv.dev check, and why most tools get this wrong

This is the part worth reading.

`npm install lodash@4.17.11` passes every offline check anyone would write. lodash is real. The name is spelled correctly. It is one of the most installed packages on earth. Nothing about it looks wrong.

It also has **seven known advisories, one of them CRITICAL**.

So before a pinned install runs, guardrails-js asks osv.dev:

```
guardrails-js flagged this install (lodash):
  - lodash@4.17.11 has 7 known advisories with a fix available,
    worst is CRITICAL GHSA-jf85-cpcp-j695. Upgrade to 4.17.12 or later.
  - this project has no lockfile, so the exact versions installed are not recorded anywhere

Installing runs the package's install scripts on your machine straight away.
Approve only if you recognise the package.
```

### 🧠 The part that took real work: only advisories you can act on

Here is where a naive version becomes useless.

Ask osv.dev about `lodash@4.17.21` and it returns three advisories. Fire a prompt on that and you have just interrupted someone installing the most ordinary package in the ecosystem. Do it twice and they stop reading your prompts forever.

Look at what those three advisories actually say:

| Advisory | Severity | Fixed in |
|---|---|---|
| GHSA-f23m-r3pf-42rh | MODERATE | 4.18.0 |
| GHSA-r5fr-rjxr-66jc | HIGH | 4.18.0 |
| GHSA-xxjr-mmjv-4gpg | MODERATE | 4.17.23 |

When 4.17.21 was the newest lodash in existence, **none of those versions were published**. There was nothing to upgrade to. Reporting them would have been noise with no action attached.

So the check asks the registry what the latest published version actually is, and keeps only advisories fixed at or below it. Same data, opposite answer, depending on a fact that changes over time. 🕰️

The rule pays off in both directions:

- ✅ `lodash@4.17.11` → seven reachable fixes → **prompt**
- 🤐 `lodash@4.17.21` back when 4.17.23 did not exist → nothing reachable → **silent**
- ✅ `lodash@4.17.21` today, now that 4.18.1 is out → reachable → **prompt, and it names 4.18.0**
- 🤐 `npm install express` unpinned → resolves to latest, nothing reachable → **silent**

### ⚙️ How it behaves

| | |
|---|---|
| When it runs | Only on installs pinned to an exact version, or when a prompt was already going to appear |
| Cost | About 800 ms, once, then cached |
| Timeout | 2 seconds, and a failure falls back to the offline verdict without a word |
| Privacy | Package names go to `api.osv.dev` and `registry.npmjs.org`. Nothing else leaves your machine, ever |
| Off switch | `"network": false` in `.guardrails-js.json`. The offline checks keep working |

Fourteen tests cover it, all against a stubbed fetch, so they need no network and cannot quietly pass by timing out. 🧪

---

## ⚡ Install

```
/plugin marketplace add subhashdasyam/guardrails-js
/plugin install guardrails-js@guardrails-js
```

That is the whole setup. **Zero runtime dependencies.** The parser is bundled into `dist/`, which is committed, so a clone is all it takes. No install step, no network, nothing to break behind a corporate proxy.

Needs Node 20.10 or later. Tested on 20, 22, 24, and 26.

Run `/hooks` to confirm. Three entries should appear under Plugin Hooks.

---

## 🧭 Two commands

| Command | What it does |
|---|---|
| `/guardrails-js:audit [path]` | Scan the whole repository, not just what Claude touched |
| `/guardrails-js:report` | Summarise what has been flagged this session |

And a CLI, for CI:

```bash
node dist/audit.mjs src --format json --fail-on high
```

---

## 🥊 Next to Anthropic's own plugin

Anthropic ships [`security-guidance`](https://code.claude.com/docs/en/security-guidance). You should probably install that too. It solves a different part of the problem, and they use different hooks so they do not fight.

| | security-guidance | guardrails-js |
|---|---|---|
| Runtime | Python 3.10+, pip, Agent SDK | Node only, nothing to install |
| How it detects | substring and regex match | regex first, then a real parser and taint tracking |
| Languages | any language, generic patterns | Node, Express, Fastify, Nest, tRPC, React, Next, Vue, Nuxt, Angular, Svelte |
| npm supply chain | nothing | install gate, known-bad list, typosquat check, live advisories |
| Performance checks | nothing | event loop, concurrency, memory, React and Vue render |
| Dependency CVEs | nothing | Next.js, React Server Components, Nuxt, Vite version checks |
| Model cost | a model call per turn and per commit | none unless you opt in |

---

## 🎯 What it catches

87 rules plus 4 dependency advisories, each mapped to OWASP Top 10:2025, CWE, and where it fits the OWASP API Top 10.

<details>
<summary><b>💉 Injection and interpreters (A05)</b></summary>

| Rule | What it catches |
|---|---|
| SQL-01, SQL-02, SQL-03 | SQL built from request data, raw ORM queries, `$queryRawUnsafe` |
| NOSQL-01, NOSQL-02 | Mongo operator injection, `$where` with user input |
| CMD-01, CMD-02 | `exec` with a built string, `shell: true` on spawn |
| PATH-01, ZIP-01 | Paths from user input, archive entries written outside the target directory |
| SSTI-01 | Templates compiled from user input |
| HTTP-01 | Header injection and open redirects |

</details>

<details>
<summary><b>🔓 Access control and requests (A01)</b></summary>

| Rule | What it catches |
|---|---|
| SSRF-01, SSRF-02, SSRF-03 | User supplied URLs, redirect following, string based host blocking |
| IDOR-01 | Records fetched by id with nothing tying them to the caller |
| MASS-01 | Request body written straight into a model |
| AUTHZ-01 | Sensitive route registered with no middleware |
| CSRF-01 | Cookie authenticated route with no CSRF protection |
| PP-01 to PP-04 | Recursive merge, `Object.assign` from a body, lodash deep merge, computed key writes |

</details>

<details>
<summary><b>🔑 Authentication and cryptography (A04, A07)</b></summary>

| Rule | What it catches |
|---|---|
| JWT-01, JWT-02, JWT-03 | Algorithm not pinned, `decode` used instead of `verify`, `none` allowed |
| AUTH-01, AUTH-02 | Signing key in source, security values from `Math.random` |
| CRYPTO-01, CRYPTO-02 | `createCipher`, fixed IV, ECB and other broken modes |
| PASS-01, PASS-02 | Passwords through a fast hash, bcrypt cost below 10 |
| TIMING-01 | Secrets compared with `===` |
| COOKIE-01, SESSION-01 | Missing cookie flags, session id not rotated at login |
| SECRET-01 | Keys written into source |

</details>

<details>
<summary><b>⚙️ Configuration and resource limits (A02, A10)</b></summary>

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

</details>

<details>
<summary><b>⚛️ React and Next.js</b></summary>

| Rule | What it catches |
|---|---|
| XSS-01, XSS-02 | `dangerouslySetInnerHTML` and `innerHTML` with no sanitiser |
| XSS-05 | `eval`, `new Function`, `setTimeout` with a string |
| XSS-06, LINK-01 | Link targets with no protocol check, `target="_blank"` with no `rel` |
| MSG-01 | `postMessage` handlers that never check `event.origin` |
| NEXT-MW | Middleware used as the only auth check, and code trusting `x-middleware-subrequest` |
| SERVER-ACTION | A `'use server'` function with no auth check, which is a public endpoint |
| NEXT-IMG | Image optimizer configured to fetch from any host |

</details>

<details>
<summary><b>💚 Vue, Nuxt, Angular, Svelte</b></summary>

| Rule | What it catches |
|---|---|
| XSS-03 | `v-html` with no sanitiser |
| VUE-URL | A bound `:href` or `:src` with no protocol check |
| VUE-SSR | A Vue template compiled from a string that came from outside |
| VITE-HOST | A dev server bound to every interface |
| NUXT-ROUTE-RULES | Route rules covering a sensitive path, which is rendering config and not authorization |
| NG-BYPASS | `bypassSecurityTrust*` on anything that is not a reviewed constant |
| NG-INNERHTML | `[innerHTML]` in an inline component template |
| SVELTE-HTML | `{@html}` with no sanitiser |
| SVELTE-URL | `href={...}` with no protocol check |

</details>

<details>
<summary><b>🛂 NestJS and tRPC authorization</b></summary>

Both frameworks make authorization a decoration rather than a statement, so a route missing one reads exactly like a route that has one.

| Rule | What it catches |
|---|---|
| NEST-GUARD | A mutating route with no `@UseGuards`, in a controller that guards its other routes |
| NEST-PUBLIC | `@Public()` on a sensitive or state changing route |
| NEST-WHITELIST | `ValidationPipe` without `whitelist`, so undeclared fields pass through |
| TRPC-PUBLIC | A mutation started from a public builder in a router that has a protected one |
| TRPC-INPUT | A resolver reading `input` with no `.input(schema)` in the chain |

</details>

<details>
<summary><b>📦 Supply chain and dependency versions (A03)</b></summary>

These take a project rather than a syntax tree, so they read `package.json`, the lockfile, `.npmrc`, and your CI.

| Rule | What it catches |
|---|---|
| SUPPLY-LOCK | No lockfile, `package-lock=false` in `.npmrc`, or a script passing `--no-package-lock` |
| SUPPLY-SCRIPTS | Nothing disables install scripts, so every package in the tree runs code on install |
| SUPPLY-DENY | A known compromised release present in the lockfile or pinned in the manifest |
| SUPPLY-PROV | Nothing in the project or its CI ever runs `npm audit signatures` |

Some problems are not in your code at all. These read the lockfile instead:

| Rule | What it catches |
|---|---|
| NEXT-VER | Next.js middleware bypass (CVE-2025-29927) and image optimizer exhaustion |
| RSC-VER | React Server Components unauthenticated RCE (CVE-2025-55182) |
| NUXT-VER | Nuxt dev server disclosure and the 2026 server island fixes |
| VITE-VER | Vite dev server arbitrary file read (CVE-2025-30208, CVE-2025-31125) |

Version checks read the lockfile when there is one, because that is the version you actually installed. With no lockfile they fall back to the lowest version the range allows and drop a severity level, since a range such as `^15.1.0` may already resolve to something patched.

</details>

<details>
<summary><b>🐌 Performance traps</b></summary>

These always report on the quiet channel and never interrupt, because whether they matter depends on data the analyzer cannot see.

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

</details>

🗓️ For the record: there is no OWASP Top 10 2026. The 2025 list came out in November 2025 and is the current one. An LLM Top 10 2026 exists, but that is a separate project.

---

## 🤐 What it will not do

**It never blocks a file write.** The file lands, then Claude gets told what is wrong. Blocking edits makes Claude get stuck, and one bad rule ruins your day.

**It interrupts you in exactly one place**, the `npm install` prompt, because advice after a postinstall script has already run is worthless. Even then it asks rather than refusing.

**It contains no Python.** Not in the analyzer, not in the hooks, not in the build.

**It makes no model calls by default**, so it costs nothing to run.

Rules that would need to reason across functions to be certain, such as IDOR-01, AUTHZ-01, and CSRF-01, ship at medium severity and stay on the quiet channel. They are prompts to look, not accusations. 🔎

---

## 🔧 Configuration

Installing asks three questions. All three are yes or no, all three default to yes, and pressing through without reading gets you sensible behaviour:

| Question | Default | What no does |
|---|---|---|
| Check packages online before installing | Yes | Skips osv.dev and the registry. Offline checks keep working |
| Report performance findings | Yes | Only security findings. Never interrupts either way |
| Send rules at session start | Yes | Saves about a thousand tokens per session |

Everything else lives in an optional `.guardrails-js.json` in your project root, which nobody is prompted for:

```json
{
  "disableRules": ["PROXY-01"],
  "severityOverrides": { "HTTP-01": "low" },
  "excludePaths": ["**/legacy/**"],
  "network": true,
  "performance": true,
  "minSeverity": "medium",
  "priming": true
}
```

`minSeverity` is one of `low`, `medium`, `high`, `critical` and covers security findings only. It defaults to `medium`, which hides two low severity rules. Performance findings are not on that scale and answer to `performance` instead, so raising the floor cannot switch them off by accident.

To silence one line, say why:

```js
// guardrails-js-ignore SQL-01 -- id is an integer validated by the route schema
const rows = await pool.query(`SELECT * FROM t WHERE id = ${id}`);
```

The reason after `--` is required. An ignore without one gets reported itself, so suppressions stay reviewable. ✍️

And if a finding comes back twice and you fix it twice, the third time it drops to a quiet note instead of looping. Claude and a rule can never argue forever.

---

## 🤖 A second opinion, off by default

Four rules cannot be settled by a parser alone, because answering them means following code across functions: IDOR-01, AUTHZ-01, CSRF-01, and MASS-01.

`hooks/escalation.json` is a prompt hook that asks a fast model to judge those four and nothing else. The plugin does not load it, because the plugin advertises zero model calls and that has to stay true unless you say otherwise. Installing it into your own `.claude/settings.json` is the switch, and there is no config flag, so there is only one thing to check when you wonder whether it is on.

It can only add context. It cannot block a write or stop a turn, which is deliberate: a model should not get to halt your work on its own judgement. The prompt tells it to refute by default and say nothing unless it can point at a line and describe what an attacker sends and what they get back. A wrong second opinion is worse than none, because it teaches you to ignore the tool.

Cost: one fast-model call per file write. Leave it off unless you are working on something where authorization mistakes are expensive.

---

## 🔒 Privacy

The npm check asks `api.osv.dev` and `registry.npmjs.org` about packages you are about to install, so package names leave your machine. Set `"network": false` to stop it. The offline checks keep working: the bundled known-bad list, the typosquat distance check, and the lockfile comparison all run locally in about five milliseconds.

**Your file contents are never sent anywhere.** Not to me, not to a model, not to any service. The analyzer runs entirely on your machine.

---

## 🧪 Development

```bash
npm ci --ignore-scripts
npm test              # 374 rule, engine, parity, supply chain, network, and dependency tests
npm run build         # rebuild dist/, which is committed
npm run check:dist    # fail if the committed bundle is stale
npm run bench         # latency budget
node test/hooks.contract.mjs
```

Every rule needs one case that must fire and at least two safe lookalikes that must not, in `test/cases/`. On top of that, `test/corpus/` holds correct code full of near misses, and **any finding there fails the build**. That gate is what stops the rule set turning into noise. It has already caught seven false positives in my own rules.

If a rule fires on correct code, that is a bug worth reporting. The corpus exists precisely so those get fixed rather than tolerated. 🐛

### 📐 Two measurements worth knowing

**The latency gate measures the plugin, not the machine.** Absolute wall clock varies by more than the thing being measured, so it compares against a bare node process and against the hook loading and exiting early. On a development machine: 20 ms to load the bundle, 2 ms to scan a clean file, 15 ms to scan one with findings. Node startup accounts for the rest of the roughly 37 ms a write costs end to end.

**Vue and Svelte components are parsed in two halves.** The `<script>` block goes through a real parser, with byte offsets preserved so line numbers need no mapping. The markup goes through a small attribute scanner instead of the framework's own compiler.

That second choice is measured, not assumed. `@vue/compiler-dom` is 1248 KB bundled and about 30 ms to load, against 727 KB and 20 ms for the entire plugin. So the real parser is a dev dependency, never shipped, and `test/vue-parity.test.mjs` holds the scanner against it on 18 cases picked to break a hand written scanner: a greater than sign inside a quoted value, a less than sign in a text node, comments containing tags, unquoted values, attributes across several lines, escaped markup inside `pre`. They agree on all 18. The day they stop agreeing, the test says so, and that is when the 1248 KB becomes worth paying. 📊

---

## 📄 License

MIT
