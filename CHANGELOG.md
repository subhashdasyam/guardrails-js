# Changelog

## 1.3.0

Performance findings are now graded, and there is a switch for the report file.

The pack was all or nothing, which meant turning it on brought findings whose cost depends on data the analyzer cannot see. Every performance rule now declares an impact. Nine are high: sync work in a request handler, N+1 queries, unbounded fan out, lost stream backpressure, async forEach, unbounded caches, and unstable list keys in React and Vue. Four are low: a sequential await loop, a fresh prop passed to a memoized child, derived state in an effect, and v-for beside v-if.

Saying yes in the install panel reports the high set, which is the default. Anyone who wants the rest sets performance to all in .guardrails-js.json, and false still turns the lot off.

The install panel now asks four yes or no questions rather than three. The new one saves the report file at .claude/guardrails-js-report.md, and answering no means nothing is written into your project.

Defaults, all together: security floor medium, online checks on, report file on, performance on at high impact.

## 1.2.1

Finishes separating performance findings from security findings.

Reporting was already decoupled in 1.2.0. One place was not: `--fail-on perf` in
the CLI would break a build over a note about an N+1 query. Performance findings
now never fail a build at any level, and `--fail-on perf` is rejected with a
reason rather than accepted and quietly doing the wrong thing.

Performance reports by default and no security setting can hide it. Tests cover
both: a performance finding is reported at every security floor, and a project
whose only finding is a performance note passes `--fail-on` at low, medium,
high, and critical.

## 1.2.0

Nothing in the install prompt asks you to type a value any more, and one setting no longer switches off another.

The manifest has no enum, options, or choices field, and a string option always renders as a free text box that nothing validates. So min_severity was a box where you could type anything, and typing something wrong silently changed what got reported. It is gone from the prompt.

Installing now asks three yes or no questions, all defaulting to yes: check packages online, report performance findings, send rules at session start. Pressing through without reading gets sensible behaviour.

The deeper problem was that a severity floor and a performance switch were the same setting. Performance sits below low on the severity scale, so choosing medium removed all thirteen performance rules without saying so. They are now separate. minSeverity covers security findings and defaults to medium. Performance answers to its own switch and defaults to on.

An unusable severity value now falls back to the default rather than silently hiding everything, since nothing outside this code validates it.

## 1.1.2

The settings panel advertised a default that did not match the code.

min_severity was shown as defaulting to `low`, while the code has defaulted to
`perf` since the performance pack shipped. Performance findings sit below low,
so anyone who accepted the panel default switched off all thirteen performance
rules without being told. Fixed, and the descriptions now say what each option
actually does rather than restating its name.

A test now asserts the panel defaults match the code defaults, so the two cannot
drift again. Verified by putting the mismatch back and watching it fail.

## 1.1.1

Fixes an install failure. The plugin would install and then refuse to load:

    Duplicate hooks file detected: ./hooks/hooks.json resolves to already loaded
    file ... The standard hooks/hooks.json is loaded automatically, so
    manifest.hooks should only reference additional hook files.

The manifest declared `hooks: ./hooks/hooks.json`, which is the exact path
Claude Code discovers on its own. The hooks field is only for extra hook files
beyond the standard one. Removed it, and auto discovery does the work.

Nothing in the test suite could have caught this, because the manifest is read
by the harness and never by any code in the project. It now has nine tests of
its own, covering the duplicate path, that every declared path exists, that
declared paths stay inside the plugin, that the version matches package.json,
that the marketplace entry points at the plugin, and that the escalation hook
stays undeclared so it stays opt in. Verified by reintroducing the bug and
watching the test fail.

## 1.1.0

Nine more rules, Svelte support, and a much larger package list.

### NestJS and tRPC

Both frameworks make authorization a decoration rather than a statement, so a route missing one reads exactly like a route that has one.

- `NEST-GUARD` fires on a mutating route with no `@UseGuards`, but only in a controller that guards its other routes. A controller where nothing is guarded is far more likely to be covered by a global `APP_GUARD`, and saying otherwise would be noise.
- `NEST-PUBLIC` fires on `@Public()` over a sensitive or state changing route.
- `NEST-WHITELIST` fires on a `ValidationPipe` without `whitelist`, which validates undeclared properties as absent and then passes them through anyway.
- `TRPC-PUBLIC` fires on a mutation started from a public builder, in a router that has a protected one to use.
- `TRPC-INPUT` fires on a resolver that reads `input` with no `.input(schema)` in the chain, where the TypeScript type is a comment rather than a check.

### Angular and Svelte

Same sinks as React and Vue under different names. `.svelte` files are now parsed, so the script block gets all the existing rules as well.

- `NG-BYPASS` on `bypassSecurityTrust*` with anything that is not a reviewed constant.
- `NG-INNERHTML` on `[innerHTML]` in an inline component template.
- `SVELTE-HTML` on `{@html}` with no sanitiser.
- `SVELTE-URL` on `href={...}` with no protocol check.

### The Vue parser question, settled with a measurement

The plan said to switch to the real Vue compiler if the bundle cost stopped mattering or the scanner started missing things. Neither happened, and now there is evidence rather than an opinion.

`@vue/compiler-dom` is 1248 KB bundled and costs about 30 ms to load, against 727 KB and 20 ms for the whole plugin. Full `@vue/compiler-sfc` will not bundle at all: it pulls in `consolidate` and 39 optional template engines.

So the real parser is now a dev dependency, never shipped, and `test/vue-parity.test.mjs` holds the scanner against it on 18 cases picked to break a hand written scanner. They agree on all 18. If that ever stops being true, the test says so, and that is when the 1248 KB becomes worth paying.

### A wider package list

The install gate's known package list went from 336 names to 3292, so it asks far less often about real dependencies. The refresh script was quietly broken: it paged the npm search API one letter at a time, and single letters return nothing, so every run collected zero names and left the file alone. It now walks a list of the subjects packages are actually about.

### osv.dev lookups now find something

The integration worked but almost never did anything useful. Enrichment only ran once the offline signals had already decided to prompt, and those signals fire on unknown and typosquatted names, which are exactly the packages that have no advisories. Installing a known vulnerable release of a package everyone trusts passed every check in silence.

An install pinned to an exact version now gets its own advisory lookup, and that lookup can raise a prompt on its own.

It only speaks up when a fix is published. An advisory whose only fix is a version nobody has released is not something anyone can act on, and reporting it would fire on ordinary installs. The lookup asks the registry what the latest published version is and keeps only advisories fixed at or below it, then leads with the worst severity and names the version to upgrade to.

The lookups also had no test coverage at all. They now have fourteen tests against a stubbed fetch, covering the reachable fix rule, response parsing, caching, the four package cap, and the guarantee that a network failure returns nothing rather than throwing.

### Fixes

Two false positives the corpus caught, both the same root cause: rules checked the expression at the sink without looking at what it was bound to. Sanitising once into a variable and then using the variable is the normal way to write this, and it was being flagged. `{@html safeBody}` where `safeBody` came from `DOMPurify.sanitize`, and an Angular bypass of a module level URL constant. There is now one shared resolver for both questions, used by the React, Vue, Angular, and Svelte rules.


## 1.0.0

First release. 78 rules and 4 dependency advisories, three hooks, two commands, three skills, and a CLI for CI.

### What it does

Tells Claude when the JavaScript it just wrote is unsafe or slow, so it gets fixed in the same turn. It never blocks a file write. The one place it interrupts is an `npm install` that looks risky, because advice after a postinstall script has already run is worthless.

No Python. No runtime dependencies. No model calls unless you install the opt-in second opinion hook yourself.

### Rules

Security, mapped to OWASP Top 10:2025 and CWE:

- Injection: SQL through raw drivers and ORMs, Mongo operator injection, shell commands, path traversal, template injection, header injection, archive extraction
- Access control: server side request forgery, records fetched by id with no ownership check, mass assignment, routes with no middleware, missing CSRF, prototype pollution
- Authentication and crypto: JWT algorithm pinning, decode used in place of verify, keys in source, `Math.random` for tokens, broken ciphers, fast hashes on passwords, timing unsafe comparison, cookie flags, session fixation
- Configuration and limits: disabled certificate checking, wildcard CORS with credentials, stack traces to clients, `trust proxy`, catastrophic regular expressions, missing body and upload limits, unrated login endpoints, unsafe deserialization
- React and Next.js: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, unchecked link targets, `postMessage` with no origin check, middleware treated as an auth boundary, server actions with no auth check, an open image optimizer
- Vue and Nuxt: `v-html`, bound URLs with no protocol check, templates compiled from strings, dev servers bound to every interface, route rules used as authorization

Performance, always on the quiet channel:

- Server: synchronous work in request handlers, sequential awaits, unbounded fan out, lost stream backpressure, async callbacks in `forEach`, caches that never evict, N+1 queries
- Client: fresh objects passed to memoized children, index and random list keys, derived state in effects, `v-for` with `v-if`, `v-for` with no key

Supply chain, which takes a project rather than a syntax tree and reads `package.json`, the lockfile, `.npmrc`, and your CI:

- No lockfile, lockfile writing turned off, or a script bypassing it
- Install scripts left enabled, so every package in the tree runs code on install
- A known compromised release present in the lockfile or pinned in the manifest
- Nothing anywhere that verifies registry signatures

Dependency versions, because some problems are not in your code at all:

- Next.js middleware bypass (CVE-2025-29927) and image optimizer exhaustion
- React Server Components unauthenticated remote code execution (CVE-2025-55182)
- Nuxt dev server disclosure (CVE-2025-24360) and the 2026 server island fixes
- Vite dev server arbitrary file read (CVE-2025-30208, CVE-2025-31125)

### npm install gate

Offline checks decide whether to ask: a bundled known-bad list, edit distance and lookalike folding against popular package names, absence from the lockfile, unpinned specifiers, remote and local sources, and global installs. Online lookups to osv.dev and the npm registry add detail to the prompt and can be turned off.

### Model escalation, off by default

Four rules cannot be settled by a parser alone: IDOR-01, AUTHZ-01, CSRF-01, and MASS-01. `hooks/escalation.json` is a prompt hook that asks a fast model to judge those four and nothing else.

It is not loaded by the plugin. Claude Code auto discovers `hooks/hooks.json` only, and the manifest does not reference this file, so installing it into your own settings is the switch. There is no config flag, because a flag would be a second source of truth that could disagree with whether the hook is registered.

The prompt tells it to refute by default and stay silent unless it can name a line and describe what an attacker sends and what they get back. It can only add context. It cannot block a write or stop a turn: a model should not get to halt someone's work on its own judgement.

### Design notes

- Findings are scoped to the function Claude just edited, so it is not blamed for existing code. A small critical set still runs file wide.
- Critical and high findings exit 2 with the detail on stderr, which reaches Claude without stopping the turn. Everything else arrives as context and does not interrupt.
- A finding that comes back twice gets two loud rounds, then drops to advisory. Claude and a rule can never argue forever.
- Suppressions require a reason. An ignore without one is reported itself.
- Rules that need to reason across functions to be sure report at medium and never reach the loud channel.
- There is no rule for missing `useMemo`. React's own documentation says memoization is an optimization and not a semantic guarantee.

### Verification

309 unit tests, 17 hook contract tests, a clean code corpus where any finding fails the build, and a latency budget. The latency gate measures the plugin rather than the machine: 20 ms to load the bundle over a bare node process, 2 ms to scan a clean file, 15 ms to scan one with findings. The tool reports nothing against its own source.
