// Built by scripts/build.mjs. Do not edit. Source lives in src/.

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/supply-chain/osv.js
var osv_exports = {};
__export(osv_exports, {
  enrich: () => enrich,
  queryOsv: () => queryOsv,
  queryRegistry: () => queryRegistry
});
import fs4 from "node:fs";
import os from "node:os";
import path4 from "node:path";
function cacheDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA || path4.join(os.homedir(), ".claude", "plugins", "data", "guardrails-js");
  return path4.join(base, "cache");
}
function cacheFile(key) {
  const safe = String(key).replace(/[^A-Za-z0-9_.@-]/g, "-");
  return path4.join(cacheDir(), `${safe}.json`);
}
function readCache(key, now) {
  try {
    const raw = JSON.parse(fs4.readFileSync(cacheFile(key), "utf8"));
    if (now - raw.at > CACHE_TTL_MS) return null;
    return raw.value;
  } catch {
    return null;
  }
}
function writeCache(key, value, now) {
  try {
    fs4.mkdirSync(cacheDir(), { recursive: true });
    const file = cacheFile(key);
    const temp = `${file}.${process.pid}.tmp`;
    fs4.writeFileSync(temp, JSON.stringify({ at: now, value }), "utf8");
    fs4.renameSync(temp, file);
  } catch {
  }
}
async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function queryOsv(packages, timeoutMs = 2e3, now = Date.now()) {
  if (packages.length === 0) return /* @__PURE__ */ new Map();
  const results = /* @__PURE__ */ new Map();
  const toAsk = [];
  for (const pkg of packages) {
    const key = `osv-${pkg.name}@${pkg.version ?? "any"}`;
    const cached = readCache(key, now);
    if (cached !== null) results.set(pkg.name, cached);
    else toAsk.push(pkg);
  }
  if (toAsk.length === 0) return results;
  const body = {
    queries: toAsk.map(
      (pkg) => pkg.version ? { package: { name: pkg.name, ecosystem: "npm" }, version: pkg.version } : { package: { name: pkg.name, ecosystem: "npm" } }
    )
  };
  const json = await fetchJson(
    "https://api.osv.dev/v1/querybatch",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    },
    timeoutMs
  );
  if (!json?.results) return results;
  json.results.forEach((entry, index) => {
    const pkg = toAsk[index];
    if (!pkg) return;
    const ids = (entry.vulns ?? []).map((vuln) => vuln.id).slice(0, 5);
    results.set(pkg.name, ids);
    writeCache(`osv-${pkg.name}@${pkg.version ?? "any"}`, ids, now);
  });
  return results;
}
async function queryRegistry(name, timeoutMs = 2e3, now = Date.now()) {
  const key = `npm-${name}`;
  const cached = readCache(key, now);
  if (cached !== null) return cached;
  const json = await fetchJson(
    `https://registry.npmjs.org/${encodeURIComponent(name).replace("%40", "@")}`,
    { headers: { accept: "application/json" } },
    timeoutMs
  );
  if (!json) return null;
  const latest = json["dist-tags"]?.latest ?? null;
  const times = json.time ?? {};
  const latestPublished = latest ? times[latest] : null;
  const value = {
    exists: true,
    latest,
    created: times.created ?? null,
    latestPublished,
    ageDays: latestPublished ? Math.floor((now - new Date(latestPublished).getTime()) / 864e5) : null,
    versionCount: Object.keys(json.versions ?? {}).length,
    repository: json.repository?.url ?? null,
    deprecated: Boolean(json.versions?.[latest]?.deprecated)
  };
  writeCache(key, value, now);
  return value;
}
async function enrich(packages, timeoutMs = 2e3) {
  const notes = [];
  const now = Date.now();
  const registry = ["npm", "osv"];
  const [osvResults, registryResults] = await Promise.all([
    queryOsv(packages, timeoutMs, now),
    Promise.all(packages.slice(0, 4).map((pkg) => queryRegistry(pkg.name, timeoutMs, now)))
  ]);
  packages.slice(0, 4).forEach((pkg, index) => {
    const info = registryResults[index];
    if (info === null) {
      notes.push(`${pkg.name} was not found on the npm registry, or the lookup timed out`);
      return;
    }
    if (info.ageDays !== null && info.ageDays <= 7) {
      notes.push(`${pkg.name} published its latest version ${info.ageDays} day(s) ago`);
    }
    if (info.versionCount <= 2) {
      notes.push(`${pkg.name} has only ${info.versionCount} published version(s)`);
    }
    if (!info.repository) {
      notes.push(`${pkg.name} lists no source repository`);
    }
    if (info.deprecated) {
      notes.push(`${pkg.name} latest version is marked deprecated`);
    }
  });
  for (const [name, ids] of osvResults) {
    if (ids && ids.length > 0) {
      notes.push(`${name} has open advisories: ${ids.join(", ")}`);
    }
  }
  return notes;
}
var CACHE_TTL_MS;
var init_osv = __esm({
  "src/supply-chain/osv.js"() {
    CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
  }
});

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
function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}
`);
}
function emitAdditionalContext(eventName, text) {
  emitJson({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: text
    }
  });
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

// src/engine/config.js
import fs2 from "node:fs";
import path2 from "node:path";
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
  modelEscalation: false,
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

// src/supply-chain/parse-command.js
var SEPARATORS = /* @__PURE__ */ new Set(["&&", "||", ";", "|", "&"]);
function tokenize(command) {
  const tokens = [];
  let current = "";
  let quote = null;
  let i = 0;
  const push = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = "";
    }
  };
  while (i < command.length) {
    const ch = command[i];
    if (quote) {
      if (ch === "\\" && quote === '"' && i + 1 < command.length) {
        current += command[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === "\\" && i + 1 < command.length) {
      current += command[i + 1];
      i += 2;
      continue;
    }
    if (/\s/.test(ch)) {
      push();
      i += 1;
      continue;
    }
    const two = command.slice(i, i + 2);
    if (two === "&&" || two === "||") {
      push();
      tokens.push(two);
      i += 2;
      continue;
    }
    if (ch === ";" || ch === "|" || ch === "&" || ch === "\n") {
      push();
      tokens.push(ch === "\n" ? ";" : ch);
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  push();
  return tokens;
}
function segments(command) {
  const out = [];
  let current = [];
  for (const token of tokenize(command)) {
    if (SEPARATORS.has(token)) {
      if (current.length > 0) out.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) out.push(current);
  return out;
}
var MANAGERS = /* @__PURE__ */ new Set(["npm", "yarn", "pnpm", "bun", "npx"]);
var INSTALL_SUBCOMMANDS = /* @__PURE__ */ new Set(["install", "i", "add", "in", "ins", "isnt", "isntall"]);
function findInstallCommands(command) {
  const found = [];
  for (const argv of segments(command)) {
    let start = 0;
    while (start < argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[start])) start += 1;
    if (start >= argv.length) continue;
    let manager = argv[start];
    if (manager === "sudo") {
      start += 1;
      manager = argv[start];
    }
    if (!manager || !MANAGERS.has(manager)) continue;
    const rest = argv.slice(start + 1);
    if (manager === "npm" && rest[0] === "ci") {
      found.push({ manager, subcommand: "ci", flags: rest.filter((a) => a.startsWith("-")), packages: [], argv });
      continue;
    }
    let subcommand = rest[0];
    let args = rest.slice(1);
    if (manager === "npx") {
      subcommand = "exec";
      args = rest;
    } else if (!subcommand || !INSTALL_SUBCOMMANDS.has(subcommand)) {
      continue;
    }
    const flags = args.filter((arg) => arg.startsWith("-"));
    const packages = args.filter((arg) => !arg.startsWith("-"));
    found.push({ manager, subcommand, flags, packages, argv });
  }
  return found;
}
function parseSpecifier(spec) {
  const raw = String(spec);
  if (/^(https?|git|git\+https?|git\+ssh|file|github|gitlab|bitbucket):/i.test(raw)) {
    return { name: raw, version: null, kind: "remote" };
  }
  if (raw.startsWith(".") || raw.startsWith("/") || raw.startsWith("~")) {
    return { name: raw, version: null, kind: "path" };
  }
  if (raw.includes("/") && !raw.startsWith("@")) {
    return { name: raw, version: null, kind: "remote" };
  }
  if (raw.startsWith("@")) {
    const at2 = raw.indexOf("@", 1);
    if (at2 === -1) return { name: raw, version: null, kind: "registry" };
    return { name: raw.slice(0, at2), version: raw.slice(at2 + 1), kind: "registry" };
  }
  const at = raw.indexOf("@");
  if (at === -1) return { name: raw, version: null, kind: "registry" };
  return { name: raw.slice(0, at), version: raw.slice(at + 1), kind: "registry" };
}
function riskyShellPatterns(command) {
  const notes = [];
  if (/curl[^|]*\|\s*(sudo\s+)?(ba)?sh/i.test(command) || /wget[^|]*\|\s*(sudo\s+)?(ba)?sh/i.test(command)) {
    notes.push("a script is downloaded and piped straight into a shell, so nobody reads it first");
  }
  if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0/.test(command)) {
    notes.push("NODE_TLS_REJECT_UNAUTHORIZED=0 turns off certificate checking for this command");
  }
  if (/npm\s+config\s+set\s+ignore-scripts\s+false/.test(command)) {
    notes.push("this turns install scripts back on");
  }
  if (/--unsafe-perm/.test(command)) {
    notes.push("--unsafe-perm runs install scripts as root");
  }
  if (/npm\s+config\s+set\s+registry|--registry[= ]/.test(command)) {
    notes.push("the registry is being changed, which decides where the code comes from");
  }
  return notes;
}

// src/supply-chain/signals.js
import fs3 from "node:fs";
import path3 from "node:path";

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

// src/supply-chain/data/top-packages.json
var top_packages_default = {
  note: "Popular package names used for two things: typosquat distance, and deciding whether a name Claude produced is real. Refreshed by .github/workflows/threat-data.yml. A name missing from this list is not proof of anything, it only lowers confidence.",
  updated: "2026-08-23",
  names: [
    "react",
    "react-dom",
    "react-router",
    "react-router-dom",
    "react-redux",
    "redux",
    "@reduxjs/toolkit",
    "next",
    "nuxt",
    "vue",
    "vue-router",
    "pinia",
    "vuex",
    "svelte",
    "@sveltejs/kit",
    "angular",
    "@angular/core",
    "solid-js",
    "preact",
    "astro",
    "express",
    "fastify",
    "koa",
    "hapi",
    "@hapi/hapi",
    "restify",
    "@nestjs/core",
    "@nestjs/common",
    "hono",
    "elysia",
    "polka",
    "connect",
    "body-parser",
    "cookie-parser",
    "cors",
    "helmet",
    "morgan",
    "compression",
    "multer",
    "express-session",
    "express-rate-limit",
    "csurf",
    "passport",
    "passport-jwt",
    "passport-local",
    "lodash",
    "underscore",
    "ramda",
    "immer",
    "rxjs",
    "date-fns",
    "dayjs",
    "moment",
    "luxon",
    "uuid",
    "nanoid",
    "chalk",
    "colors",
    "picocolors",
    "kleur",
    "debug",
    "commander",
    "yargs",
    "inquirer",
    "prompts",
    "ora",
    "boxen",
    "figlet",
    "cli-table3",
    "axios",
    "node-fetch",
    "got",
    "undici",
    "superagent",
    "ky",
    "cross-fetch",
    "request",
    "ws",
    "socket.io",
    "socket.io-client",
    "graphql",
    "apollo-server",
    "@apollo/client",
    "@apollo/server",
    "@trpc/server",
    "@trpc/client",
    "graphql-yoga",
    "mongoose",
    "mongodb",
    "sequelize",
    "typeorm",
    "prisma",
    "@prisma/client",
    "knex",
    "drizzle-orm",
    "pg",
    "mysql",
    "mysql2",
    "sqlite3",
    "better-sqlite3",
    "redis",
    "ioredis",
    "typescript",
    "ts-node",
    "tsx",
    "esbuild",
    "vite",
    "webpack",
    "rollup",
    "parcel",
    "babel",
    "@babel/core",
    "@babel/parser",
    "@babel/preset-env",
    "swc",
    "@swc/core",
    "turbo",
    "nx",
    "tsup",
    "rimraf",
    "cross-env",
    "concurrently",
    "nodemon",
    "pm2",
    "eslint",
    "prettier",
    "stylelint",
    "husky",
    "lint-staged",
    "commitlint",
    "jest",
    "vitest",
    "mocha",
    "chai",
    "sinon",
    "ava",
    "tap",
    "jasmine",
    "karma",
    "cypress",
    "playwright",
    "@playwright/test",
    "puppeteer",
    "testing-library",
    "@testing-library/react",
    "@testing-library/jest-dom",
    "supertest",
    "nock",
    "msw",
    "tailwindcss",
    "postcss",
    "autoprefixer",
    "sass",
    "less",
    "styled-components",
    "@emotion/react",
    "@emotion/styled",
    "clsx",
    "classnames",
    "framer-motion",
    "@mui/material",
    "antd",
    "bootstrap",
    "bulma",
    "chakra-ui",
    "@chakra-ui/react",
    "zod",
    "yup",
    "joi",
    "ajv",
    "class-validator",
    "class-transformer",
    "superstruct",
    "valibot",
    "io-ts",
    "jsonwebtoken",
    "jose",
    "bcrypt",
    "bcryptjs",
    "argon2",
    "crypto-js",
    "node-forge",
    "dotenv",
    "dotenv-expand",
    "config",
    "convict",
    "env-var",
    "winston",
    "pino",
    "bunyan",
    "loglevel",
    "signale",
    "consola",
    "fs-extra",
    "glob",
    "globby",
    "chokidar",
    "minimatch",
    "picomatch",
    "fast-glob",
    "path-to-regexp",
    "qs",
    "query-string",
    "url-parse",
    "normalize-url",
    "js-yaml",
    "yaml",
    "toml",
    "ini",
    "papaparse",
    "csv-parse",
    "xml2js",
    "fast-xml-parser",
    "cheerio",
    "jsdom",
    "happy-dom",
    "linkedom",
    "dompurify",
    "isomorphic-dompurify",
    "sanitize-html",
    "marked",
    "markdown-it",
    "remark",
    "rehype",
    "gray-matter",
    "sharp",
    "jimp",
    "canvas",
    "pdfkit",
    "pdf-lib",
    "exceljs",
    "xlsx",
    "archiver",
    "adm-zip",
    "tar",
    "unzipper",
    "yauzl",
    "extract-zip",
    "nodemailer",
    "sendgrid",
    "@sendgrid/mail",
    "twilio",
    "stripe",
    "@stripe/stripe-js",
    "aws-sdk",
    "@aws-sdk/client-s3",
    "firebase",
    "firebase-admin",
    "@supabase/supabase-js",
    "@google-cloud/storage",
    "@azure/storage-blob",
    "@octokit/rest",
    "bull",
    "bullmq",
    "agenda",
    "node-cron",
    "cron",
    "p-limit",
    "p-queue",
    "p-retry",
    "async",
    "bluebird",
    "eventemitter3",
    "rxjs-compat",
    "semver",
    "minimist",
    "arg",
    "dedent",
    "strip-ansi",
    "ansi-styles",
    "wrap-ansi",
    "supports-color",
    "color-convert",
    "color-name",
    "is-arrayish",
    "error-ex",
    "esbuild-register",
    "tslib",
    "core-js",
    "regenerator-runtime",
    "polyfill",
    "@types/node",
    "@types/react",
    "@types/express",
    "@types/jest",
    "@types/lodash",
    "openai",
    "@anthropic-ai/sdk",
    "langchain",
    "@langchain/core",
    "ollama",
    "@modelcontextprotocol/sdk",
    "ai",
    "tiktoken",
    "gpt-3-encoder",
    "three",
    "d3",
    "chart.js",
    "recharts",
    "echarts",
    "plotly.js",
    "leaflet",
    "mapbox-gl",
    "monaco-editor",
    "codemirror",
    "prismjs",
    "highlight.js",
    "shiki",
    "electron",
    "electron-builder",
    "tauri",
    "@tauri-apps/api",
    "capacitor",
    "react-native",
    "expo",
    "@react-navigation/native",
    "react-hook-form",
    "formik",
    "swr",
    "@tanstack/react-query",
    "react-query",
    "zustand",
    "jotai",
    "valtio",
    "mobx",
    "storybook",
    "@storybook/react",
    "husky-init",
    "npm-run-all",
    "wait-on",
    "serve",
    "http-server",
    "live-server",
    "browser-sync",
    "localtunnel",
    "ngrok"
  ]
};

// src/supply-chain/signals.js
var TOP_NAMES = new Set(top_packages_default.names);
var SUSPICIOUS = new Set(denylist_default.suspiciousNames);
function editDistance(a, b, cap = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > cap) return cap + 1;
    previous = current;
  }
  return previous[b.length];
}
function foldLookalikes(name) {
  return String(name).toLowerCase().replace(/rn/g, "m").replace(/vv/g, "w").replace(/[1l|]/g, "i").replace(/0/g, "o").replace(/5/g, "s").replace(/[-_.]/g, "");
}
function nearestPopularName(name) {
  const lower = String(name).toLowerCase();
  if (TOP_NAMES.has(lower)) return null;
  const folded = foldLookalikes(lower);
  let best = null;
  for (const candidate of TOP_NAMES) {
    if (Math.abs(candidate.length - lower.length) > 2) continue;
    const distance = editDistance(lower, candidate, 2);
    if (distance <= 2 && distance > 0 && (best === null || distance < best.distance)) {
      best = { candidate, distance, reason: "spelling" };
      if (distance === 1) break;
    }
    if (foldLookalikes(candidate) === folded && candidate !== lower) {
      best = { candidate, distance: 0, reason: "lookalike characters" };
      break;
    }
  }
  return best;
}
function knownPackageNames(projectRoot) {
  const names = /* @__PURE__ */ new Set();
  const addAll = (object) => {
    if (!object) return;
    for (const key of Object.keys(object)) names.add(key);
  };
  try {
    const pkg = JSON.parse(fs3.readFileSync(path3.join(projectRoot, "package.json"), "utf8"));
    addAll(pkg.dependencies);
    addAll(pkg.devDependencies);
    addAll(pkg.peerDependencies);
    addAll(pkg.optionalDependencies);
  } catch {
  }
  const lockfiles = ["package-lock.json", "npm-shrinkwrap.json"];
  for (const file of lockfiles) {
    try {
      const lock = JSON.parse(fs3.readFileSync(path3.join(projectRoot, file), "utf8"));
      addAll(lock.dependencies);
      for (const key of Object.keys(lock.packages ?? {})) {
        const cleaned = key.replace(/^node_modules\//, "").replace(/.*\/node_modules\//, "");
        if (cleaned) names.add(cleaned);
      }
    } catch {
    }
  }
  for (const file of ["yarn.lock", "pnpm-lock.yaml"]) {
    try {
      const text = fs3.readFileSync(path3.join(projectRoot, file), "utf8");
      const pattern = /^\s{0,4}"?(@?[a-z0-9][\w.-]*(?:\/[\w.-]+)?)"?@/gim;
      let match;
      while ((match = pattern.exec(text)) !== null) names.add(match[1]);
    } catch {
    }
  }
  return names;
}
function hasLockfile(projectRoot) {
  return ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].some(
    (file) => fs3.existsSync(path3.join(projectRoot, file))
  );
}
function versionIsPinned(version) {
  if (!version) return false;
  if (version === "latest" || version === "*" || version === "next") return false;
  return /^\d+\.\d+\.\d+/.test(version);
}
function evaluateInstall(install, context) {
  const { projectRoot } = context;
  const known = context.known ?? knownPackageNames(projectRoot);
  const reasons = [];
  const packages = [];
  let weightHigh = 0;
  let weightLow = 0;
  const ignoresScripts = install.flags.some(
    (flag) => flag === "--ignore-scripts" || flag.startsWith("--ignore-scripts=")
  );
  const isGlobal = install.flags.some((flag) => flag === "-g" || flag === "--global");
  for (const spec of install.packages) {
    const parsed = parseSpecifier(spec);
    packages.push(parsed);
    const lower = parsed.name.toLowerCase();
    if (parsed.kind === "remote" || parsed.kind === "path") {
      reasons.push(`"${spec}" is installed straight from a ${parsed.kind === "path" ? "local path" : "URL or git repo"}, so the registry never sees it and no version is recorded`);
      weightHigh += 1;
      continue;
    }
    const entry = denylist_default.packages[lower];
    if (entry) {
      if (!parsed.version || entry.versions.includes(parsed.version)) {
        const incident = denylist_default.incidents[entry.incident];
        reasons.push(
          `${lower} has known compromised releases (${entry.versions.join(", ")}): ${incident?.description ?? "known bad release"}`
        );
        weightHigh += 1;
        continue;
      }
    }
    if (SUSPICIOUS.has(lower)) {
      const imitates = nearestPopularName(lower);
      reasons.push(
        imitates ? `${lower} is a name used in past typosquatting campaigns, imitating "${imitates.candidate}"` : `${lower} is a name used in past typosquatting campaigns`
      );
      weightHigh += 1;
      continue;
    }
    const near = nearestPopularName(lower);
    if (near) {
      reasons.push(
        `"${lower}" is ${near.reason === "lookalike characters" ? "a lookalike of" : `one or two letters away from`} "${near.candidate}". Check you meant the one you typed.`
      );
      weightHigh += 1;
      continue;
    }
    const isKnownHere = known.has(parsed.name);
    const isPopular = TOP_NAMES.has(lower);
    if (!isKnownHere && !isPopular) {
      reasons.push(
        `${parsed.name} is not in this project already and is not a package I recognise. If an assistant suggested the name, confirm it exists before installing, because attackers register made up names.`
      );
      weightLow += ignoresScripts ? 1 : 2;
      continue;
    }
    if (!isKnownHere && !versionIsPinned(parsed.version)) {
      reasons.push(`${parsed.name} is new here and unpinned, so you get whatever version was published most recently`);
      weightLow += 1;
    }
  }
  if (install.manager === "npx" && packages.length > 0) {
    const unknown = packages.filter((p) => !TOP_NAMES.has(p.name.toLowerCase()) && !known.has(p.name));
    if (unknown.length > 0) {
      reasons.push("npx downloads and runs the package immediately, so there is no window to review it");
      weightHigh += 1;
    }
  }
  if (isGlobal && reasons.length > 0) {
    reasons.push("this is a global install, so it affects every project on this machine");
    weightLow += 1;
  }
  if (!ignoresScripts && weightHigh + weightLow > 0) {
    reasons.push(
      "install scripts are not disabled, so any preinstall or postinstall in the package tree runs with your permissions"
    );
  }
  if (!hasLockfile(projectRoot) && install.packages.length > 0) {
    reasons.push("this project has no lockfile, so the exact versions installed are not recorded anywhere");
    weightLow += 1;
  }
  return {
    prompt: weightHigh > 0 || weightLow >= 2,
    reasons,
    packages,
    ignoresScripts,
    isGlobal
  };
}

// src/hooks/pre-bash.js
function ask(reason) {
  emitJson({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason
    }
  });
}
async function main() {
  const input = readHookInput();
  if (input.tool_name !== "Bash") return;
  const command = input.tool_input?.command;
  if (typeof command !== "string" || command.length === 0) return;
  const installs = findInstallCommands(command);
  const shellNotes = riskyShellPatterns(command);
  if (installs.length === 0 && shellNotes.length === 0) return;
  const cwd = input.cwd || process.cwd();
  const config = loadConfig(cwd);
  const { root } = readPackageJson(cwd);
  const projectRoot = config.projectRoot || root || cwd;
  if (installs.length === 0) {
    emitAdditionalContext(
      "PreToolUse",
      `guardrails-js note on this command: ${shellNotes.join("; ")}.`
    );
    return;
  }
  const known = knownPackageNames(projectRoot);
  const allReasons = [...shellNotes];
  const allPackages = [];
  let shouldPrompt = false;
  for (const install of installs) {
    if (install.subcommand === "ci") continue;
    const verdict = evaluateInstall(install, { projectRoot, known });
    if (verdict.prompt) shouldPrompt = true;
    allReasons.push(...verdict.reasons);
    allPackages.push(...verdict.packages.filter((pkg) => pkg.kind === "registry"));
  }
  if (!shouldPrompt) {
    if (allReasons.length > 0) {
      emitAdditionalContext("PreToolUse", `guardrails-js note: ${allReasons.join("; ")}.`);
    }
    return;
  }
  if (config.network && allPackages.length > 0) {
    try {
      const { enrich: enrich2 } = await Promise.resolve().then(() => (init_osv(), osv_exports));
      const extra = await enrich2(allPackages, 2e3);
      allReasons.push(...extra);
    } catch {
    }
  }
  const bullets = allReasons.map((reason) => `  - ${reason}`).join("\n");
  const names = allPackages.map((pkg) => pkg.name).join(", ") || "this command";
  ask(
    `guardrails-js flagged this install (${names}):
${bullets}

Installing runs the package's install scripts on your machine straight away. Approve only if you recognise the package.`
  );
}
await main();
export {
  main
};
