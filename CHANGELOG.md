# Changelog

## 1.0.0

First release. 74 rules and 4 dependency advisories, three hooks, two commands, three skills, and a CLI for CI.

### What it does

Tells Claude when the JavaScript it just wrote is unsafe or slow, so it gets fixed in the same turn. It never blocks a file write. The one place it interrupts is an `npm install` that looks risky, because advice after a postinstall script has already run is worthless.

No Python. No model calls. No runtime dependencies.

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

Dependency versions, because some problems are not in your code at all:

- Next.js middleware bypass (CVE-2025-29927) and image optimizer exhaustion
- React Server Components unauthenticated remote code execution (CVE-2025-55182)
- Nuxt dev server disclosure (CVE-2025-24360) and the 2026 server island fixes
- Vite dev server arbitrary file read (CVE-2025-30208, CVE-2025-31125)

### npm install gate

Offline checks decide whether to ask: a bundled known-bad list, edit distance and lookalike folding against popular package names, absence from the lockfile, unpinned specifiers, remote and local sources, and global installs. Online lookups to osv.dev and the npm registry add detail to the prompt and can be turned off.

### Design notes

- Findings are scoped to the function Claude just edited, so it is not blamed for existing code. A small critical set still runs file wide.
- Critical and high findings exit 2 with the detail on stderr, which reaches Claude without stopping the turn. Everything else arrives as context and does not interrupt.
- A finding that comes back twice gets two loud rounds, then drops to advisory. Claude and a rule can never argue forever.
- Suppressions require a reason. An ignore without one is reported itself.
- Rules that need to reason across functions to be sure report at medium and never reach the loud channel.
- There is no rule for missing `useMemo`. React's own documentation says memoization is an optimization and not a semantic guarantee.

### Verification

282 unit tests, 17 hook contract tests, a clean code corpus where any finding fails the build, and a latency budget. Measured at 37 ms for a clean file and 49 ms when a rule fires, most of it Node starting up. The tool reports nothing against its own source.
