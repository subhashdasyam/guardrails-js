// Built by scripts/build.mjs. Do not edit. Source lives in src/.


// src/hooks/util.js
import fs from "node:fs";
import path from "node:path";
function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function findUp(startDir, filename, limit = 30) {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < limit; depth += 1) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function readPackageJson(startDir) {
  const file = findUp(startDir, "package.json");
  if (!file) return { pkg: null, root: startDir, file: null };
  try {
    return { pkg: JSON.parse(fs.readFileSync(file, "utf8")), root: path.dirname(file), file };
  } catch {
    return { pkg: null, root: path.dirname(file), file };
  }
}
function allDependencies(pkg) {
  if (!pkg) return {};
  return {
    ...pkg.dependencies ?? {},
    ...pkg.devDependencies ?? {},
    ...pkg.peerDependencies ?? {},
    ...pkg.optionalDependencies ?? {}
  };
}

// src/engine/config.js
import fs2 from "node:fs";
import path2 from "node:path";
var SEVERITY_ORDER = ["perf", "low", "medium", "high", "critical"];
var DEFAULTS = {
  severityOverrides: {},
  disableRules: [],
  excludePaths: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.min.js"
  ],
  network: true,
  primingPacks: ["auto"],
  priming: true,
  // Everything by default. Performance findings sit below low, so a default of
  // "low" would have silently hidden the whole performance pack.
  minSeverity: "perf"
};
function readJson(file) {
  try {
    return JSON.parse(fs2.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function findConfigFile(startDir) {
  let dir = path2.resolve(startDir);
  for (let depth = 0; depth < 30; depth += 1) {
    const candidate = path2.join(dir, ".guardrails-js.json");
    if (fs2.existsSync(candidate)) return candidate;
    const parent = path2.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === void 0) return fallback;
  return !["0", "false", "no", "off", ""].includes(String(raw).toLowerCase());
}
function loadConfig(cwd = process.cwd()) {
  const file = findConfigFile(cwd);
  const fromFile = file ? readJson(file) ?? {} : {};
  const config = {
    ...DEFAULTS,
    ...fromFile,
    severityOverrides: { ...DEFAULTS.severityOverrides, ...fromFile.severityOverrides ?? {} },
    excludePaths: fromFile.excludePaths ?? DEFAULTS.excludePaths,
    disableRules: fromFile.disableRules ?? DEFAULTS.disableRules,
    configFile: file,
    projectRoot: file ? path2.dirname(file) : cwd
  };
  if (fromFile.network === void 0) {
    config.network = envBool("CLAUDE_PLUGIN_OPTION_NETWORK", DEFAULTS.network);
  }
  if (fromFile.priming === void 0) {
    config.priming = envBool("CLAUDE_PLUGIN_OPTION_PRIMING", DEFAULTS.priming);
  }
  if (fromFile.minSeverity === void 0 && process.env.CLAUDE_PLUGIN_OPTION_MIN_SEVERITY) {
    config.minSeverity = process.env.CLAUDE_PLUGIN_OPTION_MIN_SEVERITY;
  }
  const disabled = new Set(config.disableRules.map((id) => String(id).toUpperCase()));
  const overrides = {};
  for (const [id, value] of Object.entries(config.severityOverrides)) {
    overrides[String(id).toUpperCase()] = String(value).toLowerCase();
  }
  config.isRuleDisabled = (ruleId) => {
    const id = String(ruleId).toUpperCase();
    if (disabled.has(id)) return true;
    return overrides[id] === "off";
  };
  config.severityFor = (rule) => {
    const override = overrides[String(rule.id).toUpperCase()];
    if (override && override !== "off") return override;
    return rule.severity;
  };
  return config;
}
function meetsMinSeverity(severity, minSeverity) {
  const have = SEVERITY_ORDER.indexOf(severity);
  const need = SEVERITY_ORDER.indexOf(minSeverity);
  if (have === -1 || need === -1) return true;
  return have >= need;
}

// src/priming/packs.js
var CORE = `guardrails-js is watching this session. Write it right the first time:
- Never build SQL, shell commands, file paths, URLs, or HTML by pasting request data into a string. Use bound parameters, argument arrays, path containment checks, and URL allowlists.
- Use execFile with an argument array, never exec with a built string.
- Secrets come from process.env. Never write a key into source, not even a test one.
- Never set rejectUnauthorized to false or NODE_TLS_REJECT_UNAUTHORIZED to 0.
- crypto.randomBytes or crypto.randomUUID for anything security related. Math.random is not random enough.
- Send generic errors to clients. Log the detail server side with a request id.`;
var EXPRESS = `Express and friends:
- Every state changing route needs an auth check and an ownership check. Query by both the record id and the current user id, not by id alone.
- express.json needs a limit. app.use(express.json({ limit: '1mb' })).
- cors with credentials needs an exact origin allowlist, never origin: true and never a wildcard.
- trust proxy takes a hop count or a CIDR list, not true.
- Rate limit login, password reset, and anything that sends mail.`;
var NEST = `NestJS:
- Sensitive controllers need @UseGuards or a global guard. A missing guard is a public endpoint.
- Use DTOs with class-validator and whitelist: true so unexpected fields are stripped rather than saved.`;
var FASTIFY = `Fastify:
- Route level auth goes in preHandler. A route with no preHandler and no global hook is public.
- Give every route a body schema. Fastify validates it for free and it kills operator injection.`;
var SQL = `Databases:
- Parameterised queries only. pool.query('... WHERE id = $1', [id]).
- Prisma: use the $queryRaw tagged template, never $queryRawUnsafe.
- Table names, column names, and sort direction cannot be parameters. Map them through an allowlist object.
- Mongo: force scalars with String(...) or validate a schema first, or {"$ne": null} matches everything.`;
var REACT = `React:
- dangerouslySetInnerHTML needs sanitised HTML from DOMPurify, or do not use it.
- Give list items a stable id as the key. Not the array index, not Math.random().
- Do not compute derived state inside useEffect. Work it out during render.
- postMessage handlers must check event.origin against an exact value before touching event.data.`;
var NEXT = `Next.js:
- Middleware is not an authorization boundary on its own. Check auth again inside the route or server action. CVE-2025-29927 bypassed middleware with a request header.
- Every function marked 'use server' is a public HTTP endpoint. It needs its own auth check and input validation, whatever page links to it.
- Keep next and react-server-dom packages patched. CVE-2025-55182 was unauthenticated remote code execution in React Server Components.`;
var VUE = `Vue:
- v-html renders raw HTML. Sanitise first or use text interpolation.
- Never compile a template from a string a user supplied.
- Key every v-for with a stable id. Do not put v-if on the same element as v-for.`;
var NUXT = `Nuxt and Vite:
- Never expose a dev server or devtools to a network. Vite CVE-2025-30208 and CVE-2025-31125 served arbitrary files that way, and Nuxt CVE-2025-24360 leaked source through permissive dev CORS.
- Route rules are not an authorization boundary. Check auth in the handler.`;
var GRAPHQL = `GraphQL:
- Authorize inside each resolver against the context user. A resolver that trusts args.id is an IDOR.
- Set a depth limit, a complexity budget, and pagination. Without them one query can take the server down.`;
var PERF = `Performance, on the server:
- Nothing synchronous in a request handler. No readFileSync, no bcrypt.compareSync, no long loops. Node runs your code on one thread and everyone queues behind it.
- Do not await inside a loop when the calls are independent. Promise.all them, with a limiter when the list size comes from a request.
- Never query the database inside a loop. Fetch with an IN clause and join in memory.
- Any cache that lives for the process needs a size cap or a TTL.

Performance, in the browser:
- Keys are stable ids, never the array index.
- Do not compute derived values inside useEffect or a watcher. Work them out during render or in a computed.
- Do not add useMemo everywhere. React's own docs say it only helps for genuinely slow work with stable dependencies.`;
var NPM = `Dependencies:
- Use npm ci in CI, never npm install.
- Confirm a package exists on the registry before adding it. Made up names get registered by attackers within hours.
- Prefer --ignore-scripts. Install scripts run with your permissions.`;
var DETECTORS = [
  { pack: EXPRESS, deps: ["express", "koa", "hapi", "@hapi/hapi"] },
  { pack: NEST, deps: ["@nestjs/core", "@nestjs/common"] },
  { pack: FASTIFY, deps: ["fastify"] },
  { pack: SQL, deps: ["pg", "mysql", "mysql2", "sqlite3", "better-sqlite3", "knex", "sequelize", "typeorm", "@prisma/client", "prisma", "drizzle-orm", "mongoose", "mongodb"] },
  { pack: REACT, deps: ["react", "react-dom"] },
  { pack: NEXT, deps: ["next"] },
  { pack: VUE, deps: ["vue"] },
  { pack: NUXT, deps: ["nuxt", "vite"] },
  { pack: GRAPHQL, deps: ["graphql", "@apollo/server", "apollo-server", "graphql-yoga", "@trpc/server"] }
];
function packsFor(dependencies) {
  const names = new Set(Object.keys(dependencies ?? {}));
  const chosen = [CORE];
  for (const detector of DETECTORS) {
    if (detector.deps.some((dep) => names.has(dep))) chosen.push(detector.pack);
  }
  chosen.push(PERF);
  chosen.push(NPM);
  return chosen;
}
function stackLabel(dependencies) {
  const names = new Set(Object.keys(dependencies ?? {}));
  const found = [];
  const check = (label, deps) => {
    if (deps.some((dep) => names.has(dep))) found.push(label);
  };
  check("Express", ["express"]);
  check("Fastify", ["fastify"]);
  check("NestJS", ["@nestjs/core"]);
  check("Next.js", ["next"]);
  check("React", ["react"]);
  check("Nuxt", ["nuxt"]);
  check("Vue", ["vue"]);
  check("GraphQL", ["graphql"]);
  check("Prisma", ["@prisma/client", "prisma"]);
  check("Mongo", ["mongoose", "mongodb"]);
  return found.length > 0 ? found.join(", ") : "plain Node";
}

// src/engine/fingerprint.js
import fs3 from "node:fs";
import os from "node:os";
import path3 from "node:path";
function stateDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA || path3.join(os.homedir(), ".claude", "plugins", "data", "guardrails-js");
  return path3.join(base, "fingerprints");
}
function stateFile(sessionId) {
  const safe = String(sessionId || "no-session").replace(/[^A-Za-z0-9_-]/g, "-");
  return path3.join(stateDir(), `${safe}.json`);
}
function resetSession(sessionId) {
  try {
    fs3.rmSync(stateFile(sessionId), { force: true });
  } catch {
  }
}

// src/engine/manifest.js
import fs5 from "node:fs";
import path5 from "node:path";

// src/supply-chain/data/denylist.json
var denylist_default = {
  note: "Known compromised npm releases. This list is a starting point, not full coverage. The scheduled CI job in .github/workflows/threat-data.yml refreshes it from OSV and GHSA, and live OSV lookups fill the gap between releases. Never treat an absence from this list as a clean bill of health.",
  updated: "2026-08-23",
  incidents: {
    "chalk-debug-2025-09": {
      description: "Maintainer account takeover on 8 September 2025. Popular colour and logging packages published with a browser wallet stealer.",
      reference: "https://socket.dev/blog/npm-author-qix-compromised-in-major-supply-chain-attack"
    },
    "shai-hulud-2025-09": {
      description: "Self replicating worm that stole npm and cloud credentials and republished itself into other packages.",
      reference: "https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem"
    },
    "shai-hulud-2025-11": {
      description: "Second wave, added persistence through CI runners and public repositories.",
      reference: "https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem"
    },
    historical: {
      description: "Earlier incidents kept because these exact versions still appear in old lockfiles.",
      reference: "https://github.com/advisories"
    }
  },
  packages: {
    chalk: { versions: ["5.6.1"], incident: "chalk-debug-2025-09" },
    debug: { versions: ["4.4.2"], incident: "chalk-debug-2025-09" },
    "ansi-styles": { versions: ["6.2.2"], incident: "chalk-debug-2025-09" },
    "strip-ansi": { versions: ["7.1.1"], incident: "chalk-debug-2025-09" },
    "ansi-regex": { versions: ["6.2.1"], incident: "chalk-debug-2025-09" },
    "wrap-ansi": { versions: ["9.0.1"], incident: "chalk-debug-2025-09" },
    "slice-ansi": { versions: ["7.1.1"], incident: "chalk-debug-2025-09" },
    "color-convert": { versions: ["3.1.1"], incident: "chalk-debug-2025-09" },
    "color-name": { versions: ["2.0.1"], incident: "chalk-debug-2025-09" },
    "color-string": { versions: ["2.1.1"], incident: "chalk-debug-2025-09" },
    color: { versions: ["5.0.1"], incident: "chalk-debug-2025-09" },
    "is-arrayish": { versions: ["0.3.3"], incident: "chalk-debug-2025-09" },
    "error-ex": { versions: ["1.3.3"], incident: "chalk-debug-2025-09" },
    "simple-swizzle": { versions: ["0.2.3"], incident: "chalk-debug-2025-09" },
    "supports-color": { versions: ["10.2.1"], incident: "chalk-debug-2025-09" },
    "supports-hyperlinks": { versions: ["4.1.1"], incident: "chalk-debug-2025-09" },
    "has-ansi": { versions: ["6.0.1"], incident: "chalk-debug-2025-09" },
    "chalk-template": { versions: ["1.1.1"], incident: "chalk-debug-2025-09" },
    backslash: { versions: ["0.2.1"], incident: "chalk-debug-2025-09" },
    "proto-tinker-wc": { versions: ["0.1.87"], incident: "chalk-debug-2025-09" },
    "event-stream": { versions: ["3.3.6"], incident: "historical" },
    "flatmap-stream": { versions: ["0.1.1", "0.1.2"], incident: "historical" },
    "ua-parser-js": { versions: ["0.7.29", "0.8.0", "1.0.0"], incident: "historical" },
    "node-ipc": { versions: ["10.1.1", "10.1.2", "10.1.3", "9.2.2"], incident: "historical" },
    coa: { versions: ["2.0.3", "2.0.4", "2.1.1", "2.1.3", "3.0.1"], incident: "historical" },
    rc: { versions: ["1.2.9", "1.3.9", "2.3.9"], incident: "historical" },
    "eslint-scope": { versions: ["3.7.2"], incident: "historical" },
    "eslint-config-eslint": { versions: ["5.0.2"], incident: "historical" },
    "bootstrap-sass": { versions: ["3.2.0.3"], incident: "historical" },
    "electron-native-notify": { versions: ["1.1.6"], incident: "historical" }
  },
  suspiciousNames: [
    "crossenv",
    "cross-env.js",
    "d3.js",
    "fabric-js",
    "ffmepg",
    "gruntcli",
    "http-proxy.js",
    "jquery.js",
    "mariadb",
    "mongose",
    "mssql.js",
    "mssql-node",
    "mysqljs",
    "node-fabric",
    "node-opencv",
    "node-opensl",
    "node-openssl",
    "node-sqlite",
    "node-tkinter",
    "nodecaffe",
    "nodefabric",
    "nodeffmpeg",
    "nodemailer-js",
    "nodemailer.js",
    "nodemssql",
    "noderequest",
    "nodesass",
    "nodesqlite",
    "opencv.js",
    "openssl.js",
    "proxy.js",
    "shadowsock",
    "smb",
    "sqlite.js",
    "sqliter",
    "sqlserver",
    "tkinter"
  ]
};

// src/rules/supply/manifest.js
var CI_INSTALL = /\bnpm\s+install\b|\bnpm\s+i\b(?!\w)/;
var SUPPLY_LOCK = {
  id: "SUPPLY-LOCK",
  title: "Dependency versions are not pinned by a lockfile",
  severity: "medium",
  owasp2025: "A03",
  cwe: ["CWE-1357", "CWE-829"],
  target: "manifest",
  matchManifest(ctx) {
    const problems = [];
    if (!ctx.hasLockfile) {
      problems.push("there is no lockfile, so nothing records the exact versions that were installed");
    }
    if (/^\s*package-lock\s*=\s*false/im.test(ctx.npmrc)) {
      problems.push(".npmrc sets package-lock=false, which turns lockfile writing off");
    }
    for (const [name, body] of Object.entries(ctx.pkg?.scripts ?? {})) {
      if (typeof body !== "string") continue;
      if (!CI_INSTALL.test(body)) continue;
      if (/--no-package-lock/.test(body)) {
        problems.push(`the "${name}" script passes --no-package-lock`);
      }
    }
    if (problems.length === 0) return null;
    return { problems };
  },
  message: (f) => {
    const joined = f.problems.join(", and ");
    return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. Without a lockfile every install can resolve to a different tree, so a compromised release reaches you silently and nobody can tell what you shipped.`;
  },
  fix: "npm install once, commit package-lock.json, then use npm ci everywhere else."
};
var SUPPLY_SCRIPTS = {
  id: "SUPPLY-SCRIPTS",
  title: "Install scripts are allowed to run",
  severity: "medium",
  owasp2025: "A03",
  cwe: ["CWE-829", "CWE-94"],
  target: "manifest",
  matchManifest(ctx) {
    const dependencyCount = Object.keys(ctx.pkg?.dependencies ?? {}).length + Object.keys(ctx.pkg?.devDependencies ?? {}).length;
    if (dependencyCount === 0) return null;
    if (/^\s*ignore-scripts\s*=\s*true/im.test(ctx.npmrc)) return null;
    const scripts = Object.entries(ctx.pkg?.scripts ?? {});
    const guarded = scripts.some(
      ([, body]) => typeof body === "string" && /--ignore-scripts/.test(body)
    );
    if (guarded) return null;
    const ownHooks = scripts.filter(([name]) => /^(pre|post)?install$/.test(name) || name === "prepare").map(([name]) => name);
    return { dependencyCount, ownHooks };
  },
  message: (f) => `Nothing in this project disables install scripts, and there are ${f.dependencyCount} dependencies.${f.ownHooks.length > 0 ? ` This package also defines ${f.ownHooks.join(" and ")}.` : ""} Installing runs code from every package in the tree with your permissions, before you have read any of it.`,
  fix: "npm config set ignore-scripts true --location=project\n# then run the few packages that genuinely need a build step on purpose"
};
var SUPPLY_DENY = {
  id: "SUPPLY-DENY",
  title: "A known compromised release is installed",
  severity: "critical",
  owasp2025: "A03",
  cwe: ["CWE-506", "CWE-829"],
  target: "manifest",
  matchManifest(ctx) {
    const hits = [];
    for (const [name, version] of ctx.locked) {
      const entry = denylist_default.packages[name];
      if (!entry) continue;
      if (!entry.versions.includes(version)) continue;
      hits.push({ name, version, incident: denylist_default.incidents[entry.incident] });
    }
    for (const [name, range] of Object.entries({
      ...ctx.pkg?.dependencies ?? {},
      ...ctx.pkg?.devDependencies ?? {}
    })) {
      if (ctx.locked.has(name)) continue;
      const entry = denylist_default.packages[name];
      if (!entry) continue;
      const exact = /^\d+\.\d+\.\d+$/.test(String(range).trim()) ? String(range).trim() : null;
      if (!exact || !entry.versions.includes(exact)) continue;
      hits.push({ name, version: exact, incident: denylist_default.incidents[entry.incident] });
    }
    if (hits.length === 0) return null;
    return { hits };
  },
  message: (f) => {
    const listed = f.hits.map((hit) => `${hit.name}@${hit.version}`).join(", ");
    const why = f.hits[0].incident?.description ?? "Published with malicious code.";
    return `${listed} is a release known to have shipped malicious code. ${why} Assume anything this machine could read has been taken.`;
  },
  fix: "Upgrade past the affected version, delete node_modules, reinstall from a clean checkout, and rotate every npm, cloud, and git credential this machine has touched."
};
var VERIFIES_PROVENANCE = /npm\s+audit\s+signatures|--provenance|cosign\s+verify|slsa-verifier|sigstore/;
var SUPPLY_PROV = {
  id: "SUPPLY-PROV",
  title: "Package signatures are never verified",
  severity: "low",
  owasp2025: "A03",
  cwe: ["CWE-345", "CWE-494"],
  target: "manifest",
  matchManifest(ctx) {
    const dependencyCount = Object.keys(ctx.pkg?.dependencies ?? {}).length;
    if (dependencyCount === 0) return null;
    const scripts = Object.values(ctx.pkg?.scripts ?? {}).join("\n");
    if (VERIFIES_PROVENANCE.test(scripts)) return null;
    const workflows = ctx.read(".github/workflows");
    if (workflows && VERIFIES_PROVENANCE.test(workflows)) return null;
    return { dependencyCount };
  },
  message: (f) => `Nothing in this project ever checks that its ${f.dependencyCount} dependencies came from where they claim. Registry signatures and provenance attestations exist and go unread unless something asks for them.`,
  fix: "npm audit signatures\n# add it to CI, so a tampered tarball fails the build rather than shipping"
};
var manifest_default = [SUPPLY_LOCK, SUPPLY_SCRIPTS, SUPPLY_DENY, SUPPLY_PROV];

// src/supply-chain/dependencies.js
import fs4 from "node:fs";
import path4 from "node:path";

// src/supply-chain/data/framework-advisories.json
var framework_advisories_default = {
  note: "Version ranges for framework issues a source scanner cannot see. An exposed dev server, a middleware bypass, or a vulnerable server component package is a property of the version you installed, not of your code. Thresholds come from the vendor advisories and are refreshed by .github/workflows/threat-data.yml. Live OSV lookups and npm audit remain authoritative.",
  updated: "2026-08-23",
  advisories: [
    {
      package: "next",
      id: "CVE-2025-29927",
      severity: "critical",
      title: "Middleware authorization bypass",
      summary: "A request carrying the x-middleware-subrequest header skipped middleware entirely. Anything protected only by middleware was open.",
      action: "Upgrade. Until you can, strip x-middleware-subrequest at the edge and repeat the auth check inside the route handler.",
      affectsOlderMajors: true,
      fixes: [
        { major: 15, fixed: "15.2.3" },
        { major: 14, fixed: "14.2.25" },
        { major: 13, fixed: "13.5.9" },
        { major: 12, fixed: "12.3.5" }
      ]
    },
    {
      package: "next",
      id: "CVE-2026-64644",
      severity: "medium",
      title: "Image optimizer resource exhaustion",
      summary: "A self hosted instance processing a remote image can be made to burn CPU on a crafted file.",
      action: "Upgrade, and narrow images.remotePatterns to the hosts you actually use.",
      fixes: [
        { major: 16, fixed: "16.2.11" },
        { major: 15, fixed: "15.5.21" }
      ]
    },
    {
      package: "react-server-dom-webpack",
      id: "CVE-2025-55182",
      severity: "critical",
      title: "Unauthenticated remote code execution in React Server Components",
      summary: "Server function requests were deserialized unsafely, which gave remote code execution with no authentication.",
      action: "Upgrade immediately. This one does not need a server action of your own to be reachable.",
      fixes: [
        { major: 19, minor: 2, fixed: "19.2.1" },
        { major: 19, minor: 1, fixed: "19.1.2" },
        { major: 19, minor: 0, fixed: "19.0.1" }
      ]
    },
    {
      package: "react-server-dom-turbopack",
      id: "CVE-2025-55182",
      severity: "critical",
      title: "Unauthenticated remote code execution in React Server Components",
      summary: "Server function requests were deserialized unsafely, which gave remote code execution with no authentication.",
      action: "Upgrade immediately.",
      fixes: [
        { major: 19, minor: 2, fixed: "19.2.1" },
        { major: 19, minor: 1, fixed: "19.1.2" },
        { major: 19, minor: 0, fixed: "19.0.1" }
      ]
    },
    {
      package: "react-server-dom-parcel",
      id: "CVE-2025-55182",
      severity: "critical",
      title: "Unauthenticated remote code execution in React Server Components",
      summary: "Server function requests were deserialized unsafely, which gave remote code execution with no authentication.",
      action: "Upgrade immediately.",
      fixes: [
        { major: 19, minor: 2, fixed: "19.2.1" },
        { major: 19, minor: 1, fixed: "19.1.2" },
        { major: 19, minor: 0, fixed: "19.0.1" }
      ]
    },
    {
      package: "nuxt",
      id: "CVE-2025-24360",
      severity: "medium",
      title: "Development server source disclosure through permissive CORS",
      summary: "A dev server reachable from the network could hand its source to any origin.",
      action: "Upgrade, and never bind a dev server to a network interface.",
      fixes: [{ major: 3, fixed: "3.15.3" }]
    },
    {
      package: "nuxt",
      id: "GHSA-nuxt-2026-server-islands",
      severity: "high",
      title: "Server island and route rule issues fixed in 2026",
      summary: "Fixes covered server island instantiation, a route rule authorization bypass, a server component denial of service, and cached payloads leaking across users.",
      action: "Upgrade. Do not treat route rules as an authorization boundary.",
      fixes: [
        { major: 4, fixed: "4.5.1" },
        { major: 3, fixed: "3.21.10" }
      ]
    },
    {
      package: "vite",
      id: "CVE-2025-30208 and CVE-2025-31125",
      severity: "high",
      title: "Development server served files outside the allowed roots",
      summary: "Crafted requests using the @fs prefix and query tricks read arbitrary files from the machine running the dev server.",
      action: "Upgrade, and keep the dev server on localhost. It is not built to face a network.",
      fixes: [
        { major: 6, minor: 2, fixed: "6.2.4" },
        { major: 6, minor: 1, fixed: "6.1.3" },
        { major: 6, minor: 0, fixed: "6.0.13" },
        { major: 5, fixed: "5.4.16" },
        { major: 4, fixed: "4.5.11" }
      ]
    }
  ]
};

// src/supply-chain/dependencies.js
function readLockedVersions(projectRoot) {
  const found = /* @__PURE__ */ new Map();
  for (const file of ["package-lock.json", "npm-shrinkwrap.json"]) {
    let lock;
    try {
      lock = JSON.parse(fs4.readFileSync(path4.join(projectRoot, file), "utf8"));
    } catch {
      continue;
    }
    for (const [key, value] of Object.entries(lock.packages ?? {})) {
      const name = key.replace(/^node_modules\//, "").replace(/.*\/node_modules\//, "");
      if (name && value?.version && !found.has(name)) found.set(name, value.version);
    }
    for (const [name, value] of Object.entries(lock.dependencies ?? {})) {
      if (value?.version && !found.has(name)) found.set(name, value.version);
    }
  }
  return found;
}
function parseVersion(value) {
  if (!value) return null;
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(String(value));
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  const short = /(\d+)\.(\d+)/.exec(String(value));
  if (short) return [Number(short[1]), Number(short[2]), 0];
  const major = /(\d+)/.exec(String(value));
  if (major) return [Number(major[1]), 0, 0];
  return null;
}
function compareVersions(a, b) {
  const left = Array.isArray(a) ? a : parseVersion(a);
  const right = Array.isArray(b) ? b : parseVersion(b);
  if (!left || !right) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}
function rangeMinimum(range) {
  if (!range) return null;
  const text = String(range).trim();
  if (text === "*" || text === "latest" || text === "") return null;
  if (/^(file|link|workspace|git|github|https?):/i.test(text)) return null;
  return parseVersion(text);
}
function fixFor(advisory, version) {
  const [major, minor] = version;
  const exact = advisory.fixes.find((fix) => fix.major === major && fix.minor === minor);
  if (exact) return exact;
  const byMajor = advisory.fixes.find((fix) => fix.major === major && fix.minor === void 0);
  if (byMajor) return byMajor;
  const majors = advisory.fixes.map((fix) => fix.major);
  if (major < Math.min(...majors)) {
    return advisory.affectsOlderMajors ? { major, fixed: null, tooOld: true } : null;
  }
  const sameMajor = advisory.fixes.filter((fix) => fix.major === major);
  if (sameMajor.length > 0) {
    const highest = sameMajor.reduce(
      (best, fix) => compareVersions(fix.fixed, best.fixed) > 0 ? fix : best
    );
    if (minor < (highest.minor ?? 0)) return highest;
  }
  return null;
}
function checkPackage(name, version, advisories = framework_advisories_default.advisories) {
  const parsed = Array.isArray(version) ? version : parseVersion(version);
  if (!parsed) return [];
  const matches = [];
  for (const advisory of advisories) {
    if (advisory.package !== name) continue;
    const fix = fixFor(advisory, parsed);
    if (!fix) continue;
    if (fix.tooOld) {
      matches.push({ ...advisory, installed: parsed.join("."), fixed: null });
      continue;
    }
    if (compareVersions(parsed, fix.fixed) < 0) {
      matches.push({ ...advisory, installed: parsed.join("."), fixed: fix.fixed });
    }
  }
  return matches;
}
function checkDependencies(pkg, locked = /* @__PURE__ */ new Map()) {
  if (!pkg) return [];
  const declared = {
    ...pkg.dependencies ?? {},
    ...pkg.devDependencies ?? {},
    ...pkg.optionalDependencies ?? {}
  };
  const seen = /* @__PURE__ */ new Set();
  const findings = [];
  const consider = (name, version, exact) => {
    const key = `${name}@${version}`;
    if (seen.has(key)) return;
    seen.add(key);
    for (const match of checkPackage(name, version)) {
      findings.push({
        ruleId: match.package === "next" ? "NEXT-VER" : match.package.startsWith("react-server-dom") ? "RSC-VER" : match.package === "nuxt" ? "NUXT-VER" : "VITE-VER",
        package: name,
        advisory: match.id,
        severity: exact ? match.severity : downgrade(match.severity),
        title: match.title,
        summary: match.summary,
        action: match.action,
        installed: match.installed,
        fixed: match.fixed,
        exact
      });
    }
  };
  for (const [name, version] of locked) consider(name, version, true);
  for (const [name, range] of Object.entries(declared)) {
    if (locked.has(name)) continue;
    const min = rangeMinimum(range);
    if (!min) continue;
    consider(name, min, false);
  }
  return findings;
}
function downgrade(severity) {
  if (severity === "critical") return "high";
  if (severity === "high") return "medium";
  return "low";
}
function describeDependencyFinding(finding) {
  const version = finding.exact ? `${finding.package}@${finding.installed}` : `${finding.package} (range allows ${finding.installed})`;
  const fix = finding.fixed ? `Upgrade to ${finding.fixed} or later.` : "This major version line has no fix. Move to a supported one.";
  return `${finding.ruleId} ${version}: ${finding.title} (${finding.advisory}). ${finding.summary} ${fix} ${finding.action}`;
}

// src/engine/manifest.js
var LOCKFILES = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];
function readText(file) {
  try {
    return fs5.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function makeReader(projectRoot) {
  return (relative) => {
    const target = path5.join(projectRoot, relative);
    let stats;
    try {
      stats = fs5.statSync(target);
    } catch {
      return "";
    }
    if (stats.isFile()) return readText(target);
    if (!stats.isDirectory()) return "";
    try {
      return fs5.readdirSync(target).filter((name) => /\.(ya?ml|json|sh|toml)$/i.test(name)).map((name) => readText(path5.join(target, name))).join("\n");
    } catch {
      return "";
    }
  };
}
function manifestContext(projectRoot, pkg = null) {
  const read = makeReader(projectRoot);
  let manifest = pkg;
  if (!manifest) {
    try {
      manifest = JSON.parse(readText(path5.join(projectRoot, "package.json")));
    } catch {
      manifest = null;
    }
  }
  const lockfileName = LOCKFILES.find((name) => fs5.existsSync(path5.join(projectRoot, name))) ?? null;
  return {
    projectRoot,
    pkg: manifest,
    locked: readLockedVersions(projectRoot),
    npmrc: read(".npmrc"),
    hasLockfile: Boolean(lockfileName),
    lockfileName,
    read
  };
}
function runManifestRules(projectRoot, config, pkg = null, rules = manifest_default) {
  const ctx = manifestContext(projectRoot, pkg);
  if (!ctx.pkg) return [];
  const findings = [];
  for (const rule of rules) {
    if (config.isRuleDisabled(rule.id)) continue;
    let hit;
    try {
      hit = rule.matchManifest(ctx);
    } catch {
      continue;
    }
    if (!hit) continue;
    const severity = config.severityFor({ ...rule, severity: hit.severityHint ?? rule.severity });
    if (!meetsMinSeverity(severity, config.minSeverity)) continue;
    findings.push({
      ruleId: rule.id,
      title: rule.title,
      severity,
      owasp2025: rule.owasp2025,
      cwe: rule.cwe ?? [],
      api: rule.api ?? null,
      line: 1,
      column: 1,
      evidence: ctx.lockfileName ? `package.json, ${ctx.lockfileName}` : "package.json",
      message: typeof rule.message === "function" ? rule.message(hit) : rule.message,
      fix: rule.fix,
      filePath: "package.json"
    });
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3, perf: 4 };
  findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  return findings;
}

// src/hooks/session-start.js
function baselineNotes(projectRoot, pkg, config) {
  const notes = [];
  for (const finding of runManifestRules(projectRoot, config, pkg)) {
    notes.push(`${finding.ruleId} ${finding.message} Fix: ${finding.fix.split("\n")[0]}`);
  }
  for (const finding of checkDependencies(pkg, readLockedVersions(projectRoot))) {
    notes.push(describeDependencyFinding(finding));
  }
  return notes;
}
function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.cwd();
  resetSession(input.session_id);
  const config = loadConfig(cwd);
  if (!config.priming) return;
  const { pkg, root } = readPackageJson(cwd);
  const projectRoot = config.configFile ? config.projectRoot : root || cwd;
  if (!pkg) return;
  const dependencies = allDependencies(pkg);
  const packs = packsFor(dependencies);
  const notes = baselineNotes(projectRoot, pkg, config);
  const parts = [
    `guardrails-js is active. Stack detected: ${stackLabel(dependencies)}.`,
    "",
    ...packs
  ];
  if (notes.length > 0) {
    parts.push("", "Things already wrong in this project:");
    for (const note of notes) parts.push(`- ${note}`);
  }
  parts.push(
    "",
    "Findings arrive after each file write. Critical and high ones need fixing before moving on."
  );
  process.stdout.write(`${parts.join("\n")}
`);
}
main();
export {
  main
};
