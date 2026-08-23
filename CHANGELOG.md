# Changelog

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
