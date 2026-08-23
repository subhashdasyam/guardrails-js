# guardrails-js design

## Build status

v1.0 is built and tested: the engine, all three hooks, 78 rules across eight packs, four dependency version advisories, the npm install gate, session priming, suppression, the loop guard, the report file, both slash commands, all three skills, the CI binary, and the workflows. See [CHANGELOG.md](../CHANGELOG.md).

The rule inventory further down was written before any code existed. The section below is what actually shipped, and the plan text is left as written so the reasoning stays visible.

### Five things that came out differently from the plan

1. **No `if` field in hooks.json.** It is CLI-version dependent and the hook must self-filter anyway, so relying on it bought nothing and could break quietly.
2. **Vue templates use a scanner, not `@vue/compiler-sfc`.** That compiler would roughly double the bundle for rules that only read attribute names. The scanner misses dynamic attribute names like `:[key]`, and misses them as no match rather than a wrong match.
3. **Version rules are not AST rules.** A middleware bypass is a property of the version installed, not of any line of code, so those read the lockfile instead.
4. **Default severity floor is `perf`, not `low`.** The plan's `low` sits above `perf` and would have silently hidden the entire performance pack.
5. **Rule cases live in `test/cases/`** rather than one directory per rule. Same requirement enforced: one firing case, two safe lookalikes, checked in CI.

### Bugs the tool found in itself

The false-positive corpus caught four, all fixed: `new URL(req.body.url)` treated as mass assignment; allowlist lookups like `SORT[req.query.sort]` carrying taint (the exact pattern the tool recommends); PERF-N01 treating any function that mentions "request" as a handler; PERF-N07 flagging `Promise.all` over an already-sliced list. The list-key rule was also flagging every `<td>` inside a mapped `<tr>`.

Two findings in its own source turned out to be real and now carry suppressions with written reasons. CI fails the build if the self-audit ever stops being clean.

### Built after the first pass through this plan

Two things were missing when the plan was first checked against the code, and both are now in.

**The four supply chain rules.** `SUPPLY-LOCK`, `SUPPLY-SCRIPTS`, `SUPPLY-DENY`, and `SUPPLY-PROV` exist as rules with ids, severities, and OWASP mappings, in `src/rules/supply/manifest.js`. They needed a third rule shape: `target: 'manifest'` with a `matchManifest(ctx)` that takes a project rather than a syntax tree, because whether a lockfile exists, whether install scripts can run, and whether anybody ever verifies a signature are properties of a project and not of any line of code. `src/engine/manifest.js` builds that context from `package.json`, the lockfile, `.npmrc`, and the CI directory, and returns findings in the same shape as everything else, so the report file, the severity split, the loop guard, and the audit command all handle them without knowing they are different. They run on a write to `package.json`, `.npmrc`, or a lockfile, once at session start, and in the audit.

This replaced the ad hoc lockfile and denylist notes that the SessionStart hook used to build by hand. One implementation instead of two that could drift apart.

**Model escalation.** `hooks/escalation.json` is a `prompt` hook that asks a fast model to judge the four classes a parser cannot settle: IDOR-01, AUTHZ-01, CSRF-01, and MASS-01. It reads the written code out of `$ARGUMENTS`, is told to refute by default and stay silent unless it can name a line and describe what an attacker sends and what they get back, and can only add context. It cannot block a write or stop a turn, because a model should not get to halt someone's work on its own judgement.

It is deliberately not loaded by the plugin. Claude Code auto discovers `hooks/hooks.json` and `hooks.json` only, so the filename keeps it off, and the manifest does not reference it. Installing it into your own settings is the switch. There is no config flag on purpose: a flag would be a second source of truth that could disagree with whether the hook is actually registered, and the plugin advertises zero model calls, which has to stay true unless you say otherwise.

### What the plan asked for and still is not built

1. **Detection-rate tracking against NodeGoat and Juice Shop.** Planned as a reported metric rather than a merge gate, and still absent. The false-positive corpus is the gate that actually shapes the rules. Nothing yet measures what the ruleset misses.
2. **`PP-VUE`.** Dropped. `PP-02` and `PP-03` already cover merging request data into long lived objects, and framing it as a Vue rule added a name without adding detection. `VUE-URL` was built instead, covering bound `:href` and `:src` with no protocol check, which was the real gap.

`PERF-N05` in the pack list below is the same detector as `REDOS-01` and was counted twice in the plan. `RATE-01`, covering login endpoints with no rate limit, was added during v0.2 and never appeared in the plan inventory.

### Numbers, corrected

The plan targeted about 60 enforced rules. What shipped:

| | Count |
|---|---|
| Rules in `RULES` | 78 |
| Dependency advisory ids (`NEXT-VER`, `RSC-VER`, `NUXT-VER`, `VITE-VER`) | 4 |
| Distinct finding ids in total | 82 |
| Packs | 8 |

Rules come in three shapes. Most take an AST node. Vue template rules take a scanned element. Supply chain rules take a project.

Measured on the development machine: 37 ms for a clean file, 49 ms when a rule fires, against budgets of 60 ms and 140 ms. The tool reports nothing against its own source, with two documented suppressions where the hook reads back the file it was told about.

### Everything else verified against the code

Checked line by line: no `if` field in hooks.json; `async` and `asyncRewake` both set; critical and high go out as exit 2 with stderr while everything else goes as `additionalContext`; the npm gate returns `ask` and never `deny`; all six offline install signals present; OSV enrichment capped at two seconds with a TTL cache; loop guard at two loud rounds before downgrading; state in `${CLAUDE_PLUGIN_DATA}` and written through a rename; findings scoped to the changed region widened to the enclosing function, with a file-wide critical set; report at `.claude/guardrails-js-report.md`; three skills, two commands, and a CI job that runs tests, a bundle staleness check, the latency budget, the hook contract, and a self-audit that fails on high.

## Why

Claude writes JavaScript fast, and by default it writes it badly. String-built SQL. `child_process.exec` with data from a request. `dangerouslySetInnerHTML`. `v-html`. `Math.random()` for tokens. `rejectUnauthorized: false`. Unbounded `Promise.all`. Sync file reads in a request handler. It also runs `npm install` when asked, and a malicious postinstall script runs before anyone can look at it.

The plugin tells Claude when the code it just wrote is unsafe or slow, so Claude fixes it in the same turn. It advises, it does not gate. No denied `Write` or `Edit`. The one exception is `npm install`, where advice after the fact is useless because the code has already run.

Two things found during research shaped the design.

There is no OWASP Top 10 2026. The current web edition is Top 10:2025, published November 2025. Rules map to 2025 IDs, with CWE and API Top 10:2023 as secondary labels. An LLM Top 10 2026 exists as of August 2026, but that is a different project and out of scope.

Anthropic already ships a `security-guidance` plugin. It does per-edit substring matching plus a model-backed diff review. It also needs Python 3.10 or later, has no parser, no npm gate, no performance rules, and no dependency CVE checks. guardrails-js is built to fill those gaps. Both can run at once.

## What this is and is not

It is a deterministic parser-based analyzer, delivered through Claude Code hooks, that tells Claude what it did wrong and how to fix it.

The only thing it gates is `npm install` of a risky package, and even that asks you rather than refusing.

It does not block `Write` or `Edit`. Files always land, then the correction follows.

It does not replace `security-guidance`, `/security-review`, or CI scanning.

It contains no Python anywhere, including the analyzer, the hooks, and the build.

### Next to security-guidance

| Capability | security-guidance | guardrails-js |
|---|---|---|
| Runtime | Python 3.10+, pip, Agent SDK | Node only, nothing to install |
| Per-edit detection | substring and regex | regex first, then parser and taint tracking |
| Stack awareness | any language, generic patterns | Node, Express, Fastify, Nest, React, Next, Vue, Nuxt |
| npm supply chain | none | install gate, known-bad list, typosquat check |
| Performance | none | event loop, concurrency, memory, React and Vue render |
| Dependency CVE ranges | none | Next.js, RSC, Nuxt, Vite version checks |
| Model cost | model call per turn and per commit | none |
| Deep model review | yes, via Stop and commit hooks | opt-in only, off by default |

The README carries this table. Do not rebuild their `Stop` hook review.

## Decisions

| Area | Decision |
|---|---|
| Name | `guardrails-js`, commands `/guardrails-js:audit` and `/guardrails-js:report` |
| Repo | github.com/subhashdasyam/guardrails-js, public |
| Ships as | Claude Code marketplace plugin |
| Enforcement | Advisory. Never denies `Write` or `Edit` |
| Delivery | `SessionStart` priming plus `PostToolUse` per-write feedback |
| Feedback channel | exit 2 with stderr for critical and high, `additionalContext` for the rest |
| Execution | `async: true` and `asyncRewake: true`, so it never blocks Claude and wakes it on exit 2 |
| Engine | regex prefilter, then `@babel/parser`, then taint tracking. `@vue/compiler-sfc` for `.vue` |
| Bundling | esbuild single file into `dist/`, committed, no runtime dependencies |
| Rule format | JS module with metadata, a `prefilter` regex, and a `match(node, ctx)` function |
| Scan scope | changed region plus the function around it, with a small set of file-wide critical rules |
| npm installs | `PreToolUse` on Bash, returns `permissionDecision: "ask"` for risky installs |
| Threat data | offline signals decide, OSV and the registry enrich with a 2 second timeout and a cache |
| Corpus | about 60 enforced rules, the rest covered as guidance prose |
| Loop guard | fingerprint plus two blocking rounds, then downgrade to advisory |
| Suppression | inline `// guardrails-js-ignore <rule-id> -- reason` plus `.guardrails-js.json` |
| Visibility | Claude context, `.claude/guardrails-js-report.md`, and a slash command |
| Model calls | none by default, opt-in escalation for medium authz and IDOR findings only |
| Existing code | `/guardrails-js:audit [path]` on demand |
| Standards | OWASP Top 10:2025 primary, CWE Top 25 2025 and API Top 10:2023 secondary |

## Layout

As planned. Two things differ in the built tree: `test/fixtures/` does not exist, because rule cases live in `test/cases/` as one module per pack, and there are more rule directories than shown here (`node-auth/`, `node-dos/`, `react/`, `vue/`, `perf-node/`, `perf-react/`), plus `src/engine/vue-template.js` and `src/supply-chain/dependencies.js`.

```
guardrails-js/                        # repo root is also the marketplace root
├── .claude-plugin/
│   ├── plugin.json                   # manifest, including userConfig
│   └── marketplace.json              # marketplace entry pointing at ./
├── hooks/
│   └── hooks.json
├── dist/                             # committed esbuild output, this is what runs
│   ├── session-start.mjs
│   ├── post-write.mjs
│   ├── pre-bash.mjs
│   └── audit.mjs
├── src/
│   ├── hooks/                        # thin entrypoints: read stdin, write stdout
│   ├── engine/
│   │   ├── prefilter.js              # regex triage on raw source
│   │   ├── parse.js                  # babel and vue-sfc, imported lazily
│   │   ├── taint.js                  # source, propagation, sink, guard
│   │   ├── scope.js                  # changed region and enclosing function
│   │   ├── suppress.js               # inline comments and config
│   │   ├── fingerprint.js            # loop guard state in CLAUDE_PLUGIN_DATA
│   │   └── report.js                 # severity split, stderr vs additionalContext
│   ├── rules/
│   │   ├── node-core/                # injection, secrets, config, deser, ssrf
│   │   ├── node-auth/                # jwt, crypto, session, csrf, access control
│   │   ├── node-dos/                 # redos, body limits, rate limits, upload, zip
│   │   ├── react/                    # xss, next.js, rsc, server actions
│   │   ├── vue/                      # v-html, nuxt, vite
│   │   ├── perf-node/
│   │   ├── perf-react/
│   │   └── perf-vue/
│   ├── supply-chain/
│   │   ├── parse-command.js          # shell AST, not substring matching
│   │   ├── signals.js                # denylist, typosquat, lockfile, scripts
│   │   ├── osv.js                    # optional enrichment with a TTL cache
│   │   └── data/                     # denylist.json, top-packages.json, generated
│   └── priming/                      # per-stack context packs, markdown
├── skills/
│   ├── node-security/SKILL.md
│   ├── react-vue-security/SKILL.md
│   └── npm-supply-chain/SKILL.md
├── commands/
│   ├── audit.md
│   └── report.md
├── test/
│   ├── fixtures/<rule-id>/{vulnerable,safe-*}.{js,ts,tsx,vue}
│   ├── corpus/                       # clean OSS files, false positive gate
│   └── bench/
├── scripts/build.mjs
├── .github/workflows/{ci.yml,threat-data.yml}
├── package.json                      # dev dependencies only, dist/ is what ships
└── README.md
```

Notes on the layout:

`.claude-plugin/` holds only the two manifests. Every component directory sits at the repo root and gets picked up automatically.

`dist/` is committed on purpose. Claude Code's npm auto-install is best effort. It gets skipped when a yarn or pnpm lockfile is present, and a failed install does not stop the plugin from loading. A security tool should not depend on that. Shipping zero runtime dependencies also means the plugin has no supply chain of its own to worry about.

State that has to survive (fingerprints, the OSV cache) goes in `${CLAUDE_PLUGIN_DATA}`, not `${CLAUDE_PLUGIN_ROOT}`. The root path changes every time the plugin updates.

## Hook wiring

`hooks/hooks.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "exec",
        "args": ["node", "${CLAUDE_PLUGIN_ROOT}/dist/session-start.mjs"], "timeout": 5 } ] }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit|NotebookEdit",
        "if": "Edit(*.js|*.jsx|*.ts|*.tsx|*.vue|*.mjs|*.cjs|package.json)",
        "hooks": [ { "type": "command", "command": "exec",
          "args": ["node", "${CLAUDE_PLUGIN_ROOT}/dist/post-write.mjs"],
          "async": true, "asyncRewake": true, "timeout": 15,
          "statusMessage": "guardrails-js scanning" } ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [ { "type": "command", "command": "exec",
          "args": ["node", "${CLAUDE_PLUGIN_ROOT}/dist/pre-bash.mjs"], "timeout": 5 } ]
      }
    ]
  }
}
```

Things the code has to get right:

`matcher` and `if` are two different systems. `matcher` is a regex over the tool name. `if` takes permission-rule syntax and is the only place file extension filtering works. `if` depends on the CLI version, so every hook must also check `tool_input.file_path` itself and exit 0 straight away for anything it does not handle.

Use exec form (`"command": "exec"` with `args`) so the shell never tokenizes a `${CLAUDE_PLUGIN_ROOT}` path that has a space in it.

stdout is a control channel. Never `console.log`. All diagnostics go to stderr.

Field names drift between CLI versions. `PostToolUse` gives the tool output as `tool_response` in some versions and `tool_result` in others. Read both. Treat every field except `hook_event_name`, `tool_name`, and `tool_input` as optional.

Hooks run at the same time as each other. Parallel `Write` calls mean parallel `post-write.mjs` processes. Writes to the report file and the fingerprint store must be atomic (write to a temp file, then rename), never read then modify then write.

`async: true` means the scan cannot slow Claude down. `asyncRewake: true` means exit code 2 wakes Claude with stderr as the message. Clean files exit 0 quietly and cost nothing.

### What each hook does

`session-start.mjs`, about 15ms:

1. Read `package.json` and the lockfile from `cwd`. Work out the stack: express, fastify, nest, react, next, vue, nuxt, prisma, graphql.
2. Print the always-on core primer (about 400 tokens) plus only the packs for the stacks actually present (another 400 to 600 tokens). Claude Code adds plain stdout to context on this event.
3. Baseline check of `package.json`: missing lockfile, denylisted dependency versions, scripts that run `npm install` without `--ignore-scripts`. Append anything found to the primer.
4. Clear the fingerprint store for this session.

`post-write.mjs`, about 25ms clean and 60 to 90ms when something matches:

1. Read stdin. Check the file extension. Exit 0 if it is not ours.
2. Read the file from disk, since it has already landed. Work out the changed region from `tool_input`. `Write` means the whole file. `Edit` and `MultiEdit` give you `new_string` offsets.
3. Run the regex prefilter over the raw source. No match means exit 0, and do not import the parser.
4. On a match, lazily import the parser, build the AST, and find the function around the changed region.
5. Run the candidate rules. Run the file-wide critical rules no matter where the change was.
6. Apply suppressions (inline comments, `.guardrails-js.json`), then the loop guard fingerprint filter.
7. Append whatever survives to `.claude/guardrails-js-report.md`, atomically.
8. If anything is critical or high, write the findings to stderr and exit 2. Otherwise print JSON with `hookSpecificOutput.additionalContext` and exit 0.

`pre-bash.mjs`, about 5ms, synchronous:

1. Parse `tool_input.command` as a shell AST, not a substring match. Handle `&&`, `;`, pipes, quoting, and env prefixes.
2. Find `npm`, `yarn`, `pnpm`, or `bun` with `install`, `add`, or `i`, and pull out the package specifiers.
3. Score against the offline signals below. Under the threshold means exit 0 quietly.
4. Over the threshold, optionally enrich from OSV and the registry, then return `permissionDecision: "ask"` with a reason that names the specific signals.
5. Separately flag, as advisory context and never as a prompt: `NODE_TLS_REJECT_UNAUTHORIZED=0`, `curl ... | sh`, `npm config set ignore-scripts false`, and `npm install` where `npm ci` is the right call.

## Rule format

```js
export default {
  id: 'node.sql.raw-query-taint',
  severity: 'high',                    // critical | high | medium | low | perf
  owasp2025: 'A05',
  cwe: ['CWE-89'],
  api: 'API8',                         // optional
  languages: ['js', 'ts', 'jsx', 'tsx'],
  fileWide: false,                     // true means it runs outside the changed region
  prefilter: /\.(query|raw)\s*\(/,     // cheap triage on raw source
  match(node, ctx) {                   // ctx: { taint, scope, imports, pkg, file }
    // return null, or { line, column, evidence }
  },
  message: 'Request data reaches a SQL string instead of a bound parameter.',
  fix: "pool.query('SELECT * FROM users WHERE id = $1', [req.query.id])",
};
```

The taint model in `src/engine/taint.js`:

Sources are `req.body`, `req.query`, `req.params`, `req.headers`, cookies, `location`, `postMessage` data, upload filenames, GraphQL args, tRPC input, and parsed JSON or YAML.

Propagation happens through template literals, concatenation, spread, recursive merge, URL building, `.map`, aliases, destructuring, and ORM builders.

Sinks are raw query APIs, shell APIs, filesystem paths, HTML and script sinks, response headers, network clients, deserializers, dynamic `require` and `import`, and crypto config.

Guards that clear a finding: parameter binding, a schema validator covering that exact field, an ownership check, a canonical path prefix check, an exact host allowlist, or a literal-only argument.

Each finding records the sink, the source, the path between them, the missing guard, the CWE, the OWASP category, a confidence level, and a fix.

## Rules

Rule IDs match the research corpus so fixtures line up one to one.

This inventory is the plan, not the shipped set. The differences are listed under Build status: `PP-VUE` and the four `SUPPLY-*` entries were not built as rules, `PERF-N05` is the same detector as `REDOS-01` and is counted twice here, and `RATE-01` and `VUE-URL` shipped without appearing below. The pack counts in the headings are the plan's counts and several are wrong: pack B lists twenty ids under a heading that says sixteen. For the shipped list run `node -e "import('./src/rules/index.js').then(m => console.log(m.RULES.map(r => r.id).join(' ')))"`.

Pack A, node-core, 22 rules, v0.1:
`SQL-01/02/03` for pg, sequelize, knex, typeorm raw queries and Prisma `$queryRawUnsafe`. `NOSQL-01/02` for `$ne` and `$where` operator injection. `CMD-01/02` for `exec`, `execSync`, and `shell: true`. `PATH-01` for traversal without a resolve and prefix check. `SSTI-01`. `HTTP-01` for CRLF and header injection. `SSRF-01/02/03` for tainted URLs, redirect following, and denylist-only checks. `DESER-01/02/03/04` for `node-serialize`, `vm` and `vm2`, dynamic `require`, and version-aware `js-yaml`. `SECRET-01`. `TLS-01` for `rejectUnauthorized: false`. `CORS-01` for `origin: true` with credentials. `ERR-01` for stack traces sent to clients. `PROXY-01` for `trust proxy: true`.

Pack B, auth, access control, and denial of service, 16 rules, v0.2:
`JWT-01/02/03` for unpinned `algorithms`, `decode` used as verification, and `alg: none`. `AUTH-01/02` for hardcoded secrets and `Math.random()` tokens. `CRYPTO-01/02` for `createCipher` and ECB or fixed IV. `PASS-01/02` for fast hashes on passwords and weak cost settings. `TIMING-01`. `COOKIE-01`. `SESSION-01`. `CSRF-01`. `IDOR-01`. `MASS-01`. `AUTHZ-01`. `REDOS-01`. `BODY-01`. `UPLOAD-01`. `ZIP-01`.

Pack C, React and Next, 11 rules, v0.3:
`XSS-01` for `dangerouslySetInnerHTML`. `XSS-02` for `innerHTML` and `document.write`. `XSS-05` for `eval` and `new Function`. `XSS-06` for `javascript:` in href. `MSG-01` for postMessage handlers with no origin check. `LINK-01` for `target="_blank"` without `rel`. `NEXT-MW` for middleware as the only auth check and trusting `x-middleware-subrequest` (CVE-2025-29927). `NEXT-VER` for affected `next` version ranges. `RSC-VER` for `react-server-dom-*` (CVE-2025-55182). `SERVER-ACTION` for `'use server'` functions with no auth or validation. `NEXT-IMG` for wide `remotePatterns` and an unbounded image optimizer.

Pack D, Vue and Nuxt, 7 rules, v0.4:
`XSS-03` for `v-html`. `VUE-SSR` for template compilation from user input. `NUXT-VER` for CVE-2025-24360 dev CORS and the 2026 server island fixes. `VITE-VER` for CVE-2025-30208 and CVE-2025-31125 `@fs` disclosure. `VITE-HOST` for a dev server bound to a non-local address. `PP-VUE` for reactive merge of request data. `NUXT-ROUTE-RULES` for route rules used as the only auth boundary.

Pack E, prototype pollution and supply chain, 8 rules, v0.2 and v0.5:
`PP-01/02/03/04` for recursive merge, `Object.assign` from a request body, `_.merge` and `_.set`, and `__proto__` gadgets. `SUPPLY-LOCK` for a missing or ignored lockfile. `SUPPLY-SCRIPTS` for `ignore-scripts` not being set. `SUPPLY-DENY` for a denylisted package version in the lockfile. `SUPPLY-PROV` for a widely-depended-on package with no provenance.

Pack F, performance, advisory only, about 14 rules, v0.5:
Node gets `PERF-N01` sync filesystem in a handler, `N02` sync crypto and KDF, `N05` ReDoS, `N06` sequential await in a loop, `N07` unbounded `Promise.all`, `N08` ignored stream backpressure, `N10` async callback in `forEach`, `N12` unbounded cache, and `N17` N+1 queries.
React gets `REACT-04` unstable props passed to a memoized child, `REACT-05` missing or index keys, and `REACT-07` derived state computed in an effect.
Vue gets `VUE-04` `v-for` combined with `v-if` and `VUE-07` unkeyed `v-for`.

Left out on purpose because they are too noisy: missing `useMemo`, missing compression, missing keep-alive, generic `Buffer.allocUnsafe`, and retained request closures. React's own docs say memoization is an optimization and not a bug, so never lint for its absence. These stay in the guidance prose instead of becoming detectors.

Severity to channel:

| Severity | Examples | Channel |
|---|---|---|
| critical | `node-serialize.unserialize(req.body)`, `exec(req.query.x)`, a live API key in source, `rejectUnauthorized: false` | exit 2 with stderr |
| high | tainted SQL, `v-html` from a request, `jwt.decode` used for auth, SSRF, `'use server'` with no auth check | exit 2 with stderr |
| medium | object lookup with no visible ownership check, `_.merge` with a request body, missing CSRF, mass assignment | `additionalContext` |
| low and perf | everything in Pack F, config findings that are closer to style | `additionalContext` |

## npm install gate

Offline signals run always, take about 5ms, and need no network. Any one of these triggers a prompt:

1. The package and version are on the bundled denylist. That covers the chalk, debug, and ansi-styles compromise of September 2025, both Shai-Hulud waves, and ChainDrop in 2026.
2. Levenshtein or homoglyph distance of 2 or less to a name in the bundled top 5000 list, which catches typosquats and slopsquats.
3. The package is not in the existing lockfile and is not in the top 5000 list, which usually means Claude made the name up.
4. An unpinned specifier such as `foo`, `foo@latest`, or `*` for a package that is not already resolved.
5. The source is a URL, a git URL, a local path, or a shell substitution.
6. A global install, or registry and scope config changed in the same command.

Enrichment is on by default and can be turned off with `"network": false`. It has a 2 second timeout and a TTL cache in `${CLAUDE_PLUGIN_DATA}`, and it falls back quietly to the offline verdict:

- OSV.dev advisories for the exact specifier.
- Registry metadata: published less than 7 days ago, fewer than 1000 weekly downloads, no repository field, no provenance attestation.

Privacy matters here. This sends package names to osv.dev and registry.npmjs.org. That belongs on the first screen of the README, not in a footnote.

The reason string names the actual signals, for example: `guardrails-js: "expres" is 1 edit from "express" (typosquat), not in package-lock.json, published 3 days ago, has a postinstall script.`

## Config, suppression, loop guard

`.guardrails-js.json` in the project root. Every field is optional.

```json
{
  "severityOverrides": { "PERF-N06": "off", "CSRF-01": "low" },
  "disableRules": ["AUTHZ-01"],
  "excludePaths": ["**/*.test.ts", "**/fixtures/**", "**/generated/**"],
  "network": true,
  "primingPacks": ["auto"],
  "modelEscalation": false
}
```

The same options appear as `userConfig` in `plugin.json` for machine-wide defaults. Claude Code passes those to hooks as `CLAUDE_PLUGIN_OPTION_*` environment variables.

Inline suppression: `// guardrails-js-ignore <rule-id> -- reason` on the line above. The reason is required. A bare ignore with no reason gets reported itself at low severity.

Loop guard: the fingerprint is `sha256(relPath + ruleId + normalizedSnippet)`, stored in `${CLAUDE_PLUGIN_DATA}/fingerprints/<session_id>.json`. Rounds 1 and 2 use the exit 2 channel. Round 3 and beyond drop to `additionalContext` and get marked `(repeat, downgraded)` in the report. This guarantees it terminates.

## Reporting and commands

`.claude/guardrails-js-report.md` gets appended atomically, grouped by file. Each entry has the rule ID, severity, OWASP 2025 category, CWE, line, evidence, and fix.

`/guardrails-js:report` renders the session report grouped by severity with counts.

`/guardrails-js:audit [path]` runs a full repo scan through `dist/audit.mjs` in whole-file mode with every rule, and writes a standalone report. The same binary goes in `bin/` so it runs headless in CI as `guardrails-js --format json --fail-on high`.

Three skills (`node-security`, `react-vue-security`, `npm-supply-chain`) hold the deep fix recipes and the full OWASP mapping. They stay out of the always-on priming budget and load only when Claude needs the detail.

Model escalation is off by default. With `"modelEscalation": true`, a `prompt` type hook adjudicates only unresolved medium authz and IDOR findings. It never sits on the critical path and never runs in the test suite.

## Testing and CI

Every rule has to pass three gates before it merges.

1. Paired fixtures. At least one `vulnerable.*` file that must fire on the exact line, and at least two `safe-*.*` lookalikes that must not fire. The safe fixtures have to include the guarded form that the rule's own `fix` recommends.
2. False positive corpus. The whole ruleset runs over `test/corpus/`, which holds clean files copied from popular open source Node, React, and Vue projects. Any finding there fails the build.
3. Latency gate. p95 `post-write.mjs` wall time under 120ms on the fixture set, and under 40ms on the clean path where the prefilter misses.

CI also does:

- A `dist/` staleness check. Rebuild from the lockfile and fail if the committed bundle differs.
- Hook contract tests. Feed recorded stdin JSON for each event and assert the exact stdout and exit code.
- A scheduled `threat-data.yml` job that pulls OSV, GHSA, and npm advisories, regenerates `denylist.json` and `top-packages.json`, and opens a PR. Never fetched at runtime. A security tool must not take instructions from a remote server.
- Detection rate tracking against NodeGoat and Juice Shop, reported as a metric rather than enforced as a gate.

## Build order

| Version | Contents | Estimate |
|---|---|---|
| v0.1 | Repo, manifests, hooks, engine (prefilter, parse, taint, scope, suppress, fingerprint, report), config, report file, Pack A, npm gate, priming core, test harness, CI | about 1 week |
| v0.2 | Pack B plus the four prototype pollution rules, `/guardrails-js:report` | about 4 days |
| v0.3 | Pack C including dependency version rules | about 3 days |
| v0.4 | Pack D and the `.vue` SFC pipeline | about 3 days |
| v0.5 | Pack F plus the supply chain config rules | about 3 days |
| v1.0 | `/guardrails-js:audit`, CI mode in `bin/`, three skills, README, marketplace publish, tagged release | about 4 days |

Around three weeks. Every version installs and works on its own.

Build the thin vertical slice first. Before writing 22 rules, get three of them (`CMD-01`, `SQL-01`, `SECRET-01`) running end to end through real hooks. That proves out async and asyncRewake, the exit 2 channel, `if` filtering, fingerprinting, and the report file against the actual CLI, which is where the version drift risk lives.

## How to check it works

In a scratch project:

1. `/plugin marketplace add subhashdasyam/guardrails-js` then `/plugin install guardrails-js@guardrails-js`. Run `/hooks` and confirm all three registrations show up under Plugin Hooks.
2. Start a session in a scratch Express project. Confirm the SessionStart primer arrived and holds only the Express and Node packs, with no React rules in a non-React project.
3. Ask Claude to add an endpoint that looks up a user by an id from the query string. The file should land, then Claude should be woken with the `SQL-01` finding on stderr and rewrite it with a bound parameter, without you doing anything.
4. Ask Claude to run `npm install expres`. You should get a permission prompt naming the typosquat distance and the lockfile miss. Deny it and confirm nothing installed.
5. Write a file with three medium findings. They should arrive as `additionalContext` and not interrupt Claude.
6. Force a false positive with a guarded pattern, add `// guardrails-js-ignore SQL-01 -- bound via helper`, rewrite, and confirm silence.
7. Make Claude fix a finding wrongly three times. The third round should downgrade to advisory instead of looping.
8. Run `/guardrails-js:audit .` against NodeGoat and compare to the tracked detection rate baseline.
9. Run `node dist/audit.mjs --format json --fail-on high` in a clean open source repo. Expect exit 0 and no findings.
10. Time it with hyperfine on both the clean path and the hit path, against the 40ms and 120ms gates.

## Known risks

Version drift is the biggest one. Several hook fields and the `if` filter depend on the CLI version, and some events do not have fully published schemas. The fix is to self-filter in every hook, treat everything except `hook_event_name`, `tool_name`, and `tool_input` as optional, log the received event shape during development, and state a tested minimum CLI version in the README.

Ordering under asyncRewake. Because the scan is async, Claude may write a second file before the first correction lands. That is acceptable for an advisor. If it turns out to be confusing in practice, fall back to a sync prefilter with an async parse.

Rules that need to reason across functions (`AUTHZ-01`, `IDOR-01`, `CSRF-01`, `UPLOAD-01`) have high false positive rates by nature. They ship at medium severity, on the advisory channel only, and must never reach the exit 2 path.

The denylist goes stale between releases. The CI refresh job and OSV enrichment cover the gap, but the README must not overstate what the plugin protects against.
