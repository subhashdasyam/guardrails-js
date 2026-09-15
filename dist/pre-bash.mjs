// Built by scripts/build.mjs. Do not edit. Source lives in src/.

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/supply-chain/allow.js
function allows(allowPackages, name, version) {
  if (!Array.isArray(allowPackages)) return false;
  return allowPackages.some(
    (entry) => entry === name || version != null && entry === `${name}@${version}`
  );
}
var init_allow = __esm({
  "src/supply-chain/allow.js"() {
  }
});

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var safeSrc = exports.safeSrc = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var isPrereleaseIdentifier = (prerelease, identifier) => {
      const identifiers = identifier.split(".");
      if (identifiers.length > prerelease.length) {
        return false;
      }
      for (let i = 0; i < identifiers.length; i++) {
        if (compareIdentifiers(prerelease[i], identifiers[i]) !== 0) {
          return false;
        }
      }
      return true;
    };
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (isPrereleaseIdentifier(this.prerelease, identifier)) {
                const prereleaseBase = this.prerelease[identifier.split(".").length];
                if (isNaN(prereleaseBase)) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compare2 = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare2;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var rcompare = (a, b, loose) => compare2(b, a, loose);
    module.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var compareLoose = (a, b) => compare2(a, b, true);
    module.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports, module) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gt = (a, b, loose) => compare2(a, b, loose) > 0;
    module.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lt = (a, b, loose) => compare2(a, b, loose) < 0;
    module.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var eq = (a, b, loose) => compare2(a, b, loose) === 0;
    module.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var neq = (a, b, loose) => compare2(a, b, loose) !== 0;
    module.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var gte = (a, b, loose) => compare2(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports, module) {
    "use strict";
    var compare2 = require_compare();
    var lte = (a, b, loose) => compare2(a, b, loose) <= 0;
    module.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports, module) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module.exports = coerce;
  }
});

// node_modules/semver/functions/truncate.js
var require_truncate = __commonJS({
  "node_modules/semver/functions/truncate.js"(exports, module) {
    "use strict";
    var parse = require_parse();
    var constants = require_constants();
    var SemVer = require_semver();
    var truncate = (version, truncation, options) => {
      if (!constants.RELEASE_TYPES.includes(truncation)) {
        return null;
      }
      const clonedVersion = cloneInputVersion(version, options);
      return clonedVersion && doTruncation(clonedVersion, truncation);
    };
    var cloneInputVersion = (version, options) => {
      const versionStringToParse = version instanceof SemVer ? version.version : version;
      return parse(versionStringToParse, options);
    };
    var doTruncation = (version, truncation) => {
      if (isPrerelease(truncation)) {
        return version.version;
      }
      version.prerelease = [];
      switch (truncation) {
        case "major":
          version.minor = 0;
          version.patch = 0;
          break;
        case "minor":
          version.patch = 0;
          break;
      }
      return version.format();
    };
    var isPrerelease = (type) => {
      return type.startsWith("pre");
    };
    module.exports = truncate;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports, module) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports, module) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.replace(BUILDSTRIPRE, "");
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      src,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var BUILDSTRIPRE = new RegExp(src[t.BUILD], "g");
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var invalidXRangeOrder = (M, m, p) => isX(M) && !isX(m) || isX(m) && p && !isX(p);
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        if (invalidXRangeOrder(M, m, p)) {
          return comp;
        }
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports, module) {
    "use strict";
    var ANY = Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports, module) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports, module) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports, module) {
    "use strict";
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    module.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare2(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports, module) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare2 = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare2(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !c.test(gt.semver)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !c.test(lt.semver)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare2(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports, module) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare2 = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var truncate = require_truncate();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare: compare2,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      truncate,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/supply-chain/osv.js
var osv_exports = {};
__export(osv_exports, {
  BLOCKING_SEVERITIES: () => BLOCKING_SEVERITIES,
  actionableAdvisories: () => actionableAdvisories,
  advisoryNotes: () => advisoryNotes,
  enrich: () => enrich,
  queryOsv: () => queryOsv,
  queryOsvDetailed: () => queryOsvDetailed,
  queryRegistry: () => queryRegistry
});
import fs6 from "node:fs";
import os2 from "node:os";
import path7 from "node:path";
import { createHash } from "node:crypto";
function cacheDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA || path7.join(os2.homedir(), ".claude", "plugins", "data", "guardrails-js");
  return path7.join(base, "cache");
}
function cacheFile(key) {
  const safe = String(key).replace(/[^A-Za-z0-9_.@-]/g, "-");
  return path7.join(cacheDir(), `${safe}.json`);
}
function readCache(key, now, maxAge = CACHE_TTL_MS) {
  try {
    const raw = JSON.parse(fs6.readFileSync(cacheFile(key), "utf8"));
    if (now - raw.at > maxAge) return null;
    return raw.value;
  } catch {
    return null;
  }
}
function writeCache(key, value, now) {
  try {
    fs6.mkdirSync(cacheDir(), { recursive: true });
    const file = cacheFile(key);
    const temp = `${file}.${process.pid}.tmp`;
    fs6.writeFileSync(temp, JSON.stringify({ at: now, value }), "utf8");
    fs6.renameSync(temp, file);
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
function maintainerChange(name, maintainers, now) {
  if (!Array.isArray(maintainers) || maintainers.length === 0) return null;
  if (maintainers.some((entry) => typeof entry?.name !== "string" || !entry.name.trim() || /[\u0000-\u001f\u007f]/.test(entry.name))) return null;
  const names = [...new Set(maintainers.map((entry) => entry.name.trim()))].sort();
  const key = `maintainers-${createHash("sha256").update(name).digest("hex")}`;
  const previous = readCache(key, now, Infinity);
  const validPrevious = Array.isArray(previous) && previous.length > 0 && previous.every((entry) => typeof entry === "string" && entry.length > 0);
  const added = validPrevious ? names.filter((entry) => !previous.includes(entry)) : [];
  const removed = validPrevious ? previous.filter((entry) => !names.includes(entry)) : [];
  writeCache(key, names, now);
  return added.length || removed.length ? { added, removed } : null;
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
    deprecated: Boolean(json.versions?.[latest]?.deprecated),
    maintainerChange: maintainerChange(name, json.maintainers, now)
  };
  writeCache(key, value, now);
  return value;
}
function compare(a, b) {
  const left = String(a).match(/\d+/g)?.map(Number) ?? [];
  const right = String(b).match(/\d+/g)?.map(Number) ?? [];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}
async function queryOsvDetailed(name, version, timeoutMs = 2e3, now = Date.now()) {
  const key = `osvfull-${name}@${version}`;
  const cached = readCache(key, now);
  if (cached !== null) return cached;
  const json = await fetchJson(
    "https://api.osv.dev/v1/query",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ package: { name, ecosystem: "npm" }, version })
    },
    timeoutMs
  );
  if (!json) return [];
  const advisories = (json.vulns ?? []).map((vuln) => {
    const fixed = [];
    for (const affected of vuln.affected ?? []) {
      if (affected.package?.name !== name) continue;
      for (const range of affected.ranges ?? []) {
        for (const event of range.events ?? []) {
          if (event.fixed) fixed.push(event.fixed);
        }
      }
    }
    return {
      id: vuln.id,
      severity: String(vuln.database_specific?.severity ?? "").toUpperCase() || "UNKNOWN",
      fixed
    };
  });
  writeCache(key, advisories, now);
  return advisories;
}
function actionableAdvisories(advisories, latestPublished) {
  if (!latestPublished) return [];
  return advisories.filter(
    (advisory) => advisory.fixed.some((fix) => compare(fix, latestPublished) <= 0)
  ).sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
  );
}
async function advisoryNotes(packages, timeoutMs = 2e3, now = Date.now(), limit = 4) {
  const notes = [];
  for (const pkg of packages.slice(0, limit)) {
    const info = await queryRegistry(pkg.name, timeoutMs, now);
    if (!info?.latest) continue;
    const version = pkg.version ?? info.latest;
    const advisories = await queryOsvDetailed(pkg.name, version, timeoutMs, now);
    const actionable = actionableAdvisories(advisories, info.latest);
    if (actionable.length === 0) continue;
    const worst = actionable[0];
    const upgrade = worst.fixed.filter((fix) => compare(fix, info.latest) <= 0).sort(compare).pop();
    notes.push({
      name: pkg.name,
      version,
      severity: worst.severity,
      text: `${pkg.name}@${version} has ${actionable.length} known ${actionable.length === 1 ? "advisory" : "advisories"} with a fix available, worst is ${worst.severity} ${worst.id}. Upgrade to ${upgrade} or later.`
    });
  }
  return notes;
}
async function enrich(packages, timeoutMs = 2e3) {
  const notes = [];
  const now = Date.now();
  const results = await Promise.all(
    packages.slice(0, 4).map((pkg) => queryRegistry(pkg.name, timeoutMs, now))
  );
  packages.slice(0, 4).forEach((pkg, index) => {
    const info = results[index];
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
    if (info.maintainerChange) {
      const { added, removed } = info.maintainerChange;
      const details = [
        added.length ? `added: ${added.map((name) => JSON.stringify(name)).join(", ")}` : "",
        removed.length ? `removed: ${removed.map((name) => JSON.stringify(name)).join(", ")}` : ""
      ].filter(Boolean).join("; ");
      notes.push(`${pkg.name}: This package's maintainer list changed since your last check. Review before upgrading. (${details})`);
    }
  });
  return notes;
}
var CACHE_TTL_MS, SEVERITY_RANK, BLOCKING_SEVERITIES;
var init_osv = __esm({
  "src/supply-chain/osv.js"() {
    CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
    SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };
    BLOCKING_SEVERITIES = /* @__PURE__ */ new Set(["CRITICAL", "HIGH"]);
  }
});

// src/supply-chain/manifest-advisories.js
var manifest_advisories_exports = {};
__export(manifest_advisories_exports, {
  LOOKUP_CAP: () => LOOKUP_CAP,
  findingSeverity: () => findingSeverity,
  manifestAdvisories: () => manifestAdvisories,
  pinnedDependencies: () => pinnedDependencies,
  worstFirst: () => worstFirst
});
function pinnedDependencies(pkg) {
  const declared = { ...pkg?.dependencies ?? {}, ...pkg?.devDependencies ?? {} };
  const pinned = [];
  for (const [name, range] of Object.entries(declared)) {
    const version = String(range ?? "").trim();
    if (!EXACT.test(version)) continue;
    pinned.push({ name, version });
  }
  return pinned;
}
function worstFirst(notes) {
  return [...notes].sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9));
}
async function manifestAdvisories(pkg, config, timeoutMs = 3e3, deadlineMs = 6e3) {
  const pinned = pinnedDependencies(pkg);
  if (pinned.length === 0) return { notes: [], checked: 0, skipped: 0 };
  const checking = pinned.slice(0, LOOKUP_CAP);
  const notes = await Promise.race([
    advisoryNotes(checking, timeoutMs, Date.now(), LOOKUP_CAP),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve([]), deadlineMs);
      timer.unref?.();
    })
  ]);
  const kept = notes.filter((note) => !allows(config.allowPackages, note.name, note.version));
  return {
    notes: worstFirst(kept),
    checked: checking.length,
    skipped: pinned.length - checking.length
  };
}
function findingSeverity(advisorySeverity) {
  return BLOCKING_SEVERITIES.has(advisorySeverity) ? advisorySeverity.toLowerCase() : "medium";
}
var EXACT, LOOKUP_CAP, RANK;
var init_manifest_advisories = __esm({
  "src/supply-chain/manifest-advisories.js"() {
    init_osv();
    init_allow();
    EXACT = /^\d+\.\d+\.\d+$/;
    LOOKUP_CAP = 10;
    RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };
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
var pendingNotice = null;
function queueHookNotice(event, text) {
  if (!text) return;
  pendingNotice = { event, text };
  process.once("beforeExit", () => {
    if (pendingNotice) emitAdditionalContext(pendingNotice.event, "");
  });
}
function emitJson(payload) {
  if (pendingNotice) {
    payload.hookSpecificOutput ||= { hookEventName: pendingNotice.event };
    payload.hookSpecificOutput.additionalContext = [pendingNotice.text, payload.hookSpecificOutput.additionalContext].filter(Boolean).join("\n\n");
    pendingNotice = null;
  }
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
function emitLoud(text) {
  if (pendingNotice) {
    text += `

${pendingNotice.text}`;
    pendingNotice = null;
  }
  process.stderr.write(`${text}
`);
  process.exit(2);
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
var SECURITY_SEVERITIES = ["low", "medium", "high", "critical"];
var DEFAULTS = {
  severityOverrides: {},
  disableRules: [],
  // Package specifiers that never hard block, as "lodash" or "lodash@4.17.21".
  // A blocked install has no other way past, so this is the release valve for a
  // project that genuinely needs a version carrying an advisory.
  allowPackages: [],
  excludePaths: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/coverage/**",
    "**/*.min.js"
  ],
  network: true,
  threatDataAutoRefresh: true,
  threatDataRefreshHours: 24,
  primingPacks: ["auto"],
  priming: true,
  // Security findings below this are dropped. Performance findings are not on
  // this scale, see the note above SECURITY_SEVERITIES.
  minSeverity: "medium",
  // Performance findings are advisory and never interrupt, so they are on by
  // default and switched separately from the security floor.
  //
  //   true or 'high'  the findings that reliably bite, which is the default
  //   'all'           everything, including the ones that depend on data we
  //                   cannot see, such as whether a render is actually slow
  //   false or 'off'  none
  performance: "high",
  // Write .claude/guardrails-js-report.md as findings arrive.
  report: true
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
function loadConfig(cwd = process.cwd()) {
  const file = findConfigFile(cwd);
  const fromFile = file ? readJson(file) ?? {} : {};
  const config = {
    ...DEFAULTS,
    ...fromFile,
    severityOverrides: { ...DEFAULTS.severityOverrides, ...fromFile.severityOverrides ?? {} },
    excludePaths: fromFile.excludePaths ?? DEFAULTS.excludePaths,
    disableRules: fromFile.disableRules ?? DEFAULTS.disableRules,
    allowPackages: fromFile.allowPackages ?? DEFAULTS.allowPackages,
    configFile: file,
    projectRoot: file ? path2.dirname(file) : cwd
  };
  if (!SECURITY_SEVERITIES.includes(config.minSeverity)) {
    config.minSeverity = DEFAULTS.minSeverity;
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
    const inRedirect = ch === "&" && (current.endsWith(">") || command[i + 1] === ">");
    if (!inRedirect && (ch === ";" || ch === "|" || ch === "&" || ch === "\n")) {
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
var FD_DUPLICATE = /^(\d+|&)?>&\d*-?$/;
var BARE_OPERATOR = /^(\d+|&)?(>>?\|?|<<?<?)$/;
var GLUED_TARGET = /^(\d+|&)?(>>?|<<?<?)\S+$/;
function stripRedirections(argv) {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (FD_DUPLICATE.test(token)) continue;
    if (BARE_OPERATOR.test(token)) {
      i += 1;
      continue;
    }
    if (GLUED_TARGET.test(token)) continue;
    out.push(token);
  }
  return out;
}
var MANAGERS = /* @__PURE__ */ new Set(["npm", "yarn", "pnpm", "bun", "npx"]);
var INSTALL_SUBCOMMANDS = /* @__PURE__ */ new Set(["install", "i", "add", "in", "ins", "isnt", "isntall"]);
function findInstallCommands(command) {
  const found = [];
  for (const raw of segments(command)) {
    const argv = stripRedirections(raw);
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
init_allow();
import fs5 from "node:fs";
import path6 from "node:path";

// src/supply-chain/data/top-packages.json
var top_packages_default = {
  note: "Popular package names used for two things: typosquat distance, and deciding whether a name Claude produced is real. Refreshed by .github/workflows/threat-data.yml. A name missing from this list is not proof of anything, it only lowers confidence.",
  updated: "2026-08-23",
  names: [
    "@5minds/node-red-contrib-processcube",
    "@a2ui/angular",
    "@abhivarde/svelte-drawer",
    "@adipanda/xyflow-svelte",
    "@adobe/react-spectrum",
    "@aegenet/belt-benchmark",
    "@agm/core",
    "@ai-sdk/angular",
    "@ai-sdk/react",
    "@ai-sdk/svelte",
    "@algolia/requester-node-http",
    "@ali-hm/angular-tree-component",
    "@almothafar/angular-signature-pad",
    "@amaster.ai/pi-image-gen",
    "@analogjs/astro-angular",
    "@analogjs/storybook-angular",
    "@analogjs/vite-plugin-angular",
    "@analogjs/vitest-angular",
    "@angular-architects/module-federation",
    "@angular-architects/module-federation-runtime",
    "@angular-architects/module-federation-tools",
    "@angular-architects/ngrx-toolkit",
    "@angular-boot/animation",
    "@angular-boot/common",
    "@angular-builders/common",
    "@angular-builders/custom-esbuild",
    "@angular-builders/custom-webpack",
    "@angular-builders/jest",
    "@angular-devkit/architect",
    "@angular-devkit/build-ng-packagr",
    "@angular-devkit/core",
    "@angular-devkit/schematics",
    "@angular-devkit/schematics-cli",
    "@angular-eslint/builder",
    "@angular-eslint/bundled-angular-compiler",
    "@angular-eslint/eslint-plugin",
    "@angular-eslint/eslint-plugin-template",
    "@angular-eslint/schematics",
    "@angular-eslint/template-parser",
    "@angular-eslint/utils",
    "@angular-ex/uploader",
    "@angular-extensions/lint-rules",
    "@angular-extensions/pretty-html-log",
    "@angular-material-components/color-picker",
    "@angular-material-components/datetime-picker",
    "@angular-material-components/file-input",
    "@angular-material-components/moment-adapter",
    "@angular-mdc/web",
    "@angular-redux/store",
    "@angular-ru/cdk",
    "@angular-ru/ngxs",
    "@angular-slider/ngx-slider",
    "@angular/aria",
    "@angular/bazel",
    "@angular/build",
    "@angular/cdk",
    "@angular/cdk-experimental",
    "@angular/cli",
    "@angular/common",
    "@angular/compiler",
    "@angular/compiler-cli",
    "@angular/core",
    "@angular/create",
    "@angular/elements",
    "@angular/fire",
    "@angular/forms",
    "@angular/google-maps",
    "@angular/language-server",
    "@angular/language-service",
    "@angular/localize",
    "@angular/material",
    "@angular/material-date-fns-adapter",
    "@angular/material-experimental",
    "@angular/material-luxon-adapter",
    "@angular/material-moment-adapter",
    "@angular/platform-browser",
    "@angular/platform-server",
    "@angular/pwa",
    "@angular/router",
    "@angular/service-worker",
    "@angular/ssr",
    "@angular/upgrade",
    "@angular/youtube-player",
    "@angularclass/hmr",
    "@ant-design/icons-angular",
    "@ant-design/icons-vue",
    "@ant-design/react-slick",
    "@anthropic-ai/sdk",
    "@antv/g-plugin-image-loader",
    "@antv/x6-vue-shape",
    "@apollo/client",
    "@apollo/react-hooks",
    "@apollo/server",
    "@apollo/utils.createhash",
    "@apollo/utils.isnodelike",
    "@applitools/image",
    "@arco-design/web-vue",
    "@ariakit/react",
    "@ariakit/react-components",
    "@ariakit/react-store",
    "@ariakit/react-utils",
    "@arikajs/benchmark",
    "@ark-ui/svelte",
    "@ashborn-sec/cli",
    "@astrojs/react",
    "@astrojs/svelte",
    "@astrojs/vue",
    "@atlaskit/image",
    "@atom8n/n8n-benchmark",
    "@audiowave/react",
    "@auth0/angular-jwt",
    "@auth0/auth0-angular",
    "@auth0/auth0-react",
    "@auth0/auth0-vue",
    "@authbroker/mongo-benchmark",
    "@authenio/xml-encryption",
    "@aws-amplify/ui-angular",
    "@aws-amplify/ui-svelte",
    "@aws-amplify/ui-vue",
    "@aws-sdk/client-s3",
    "@aws-sdk/eventstream-handler-node",
    "@aws-sdk/util-user-agent-node",
    "@azure/msal-angular",
    "@azure/msal-node",
    "@azure/msal-node-extensions",
    "@azure/msal-node-runtime",
    "@azure/msal-react",
    "@azure/storage-blob",
    "@babeard/svelte-heroicons",
    "@babel/core",
    "@babel/parser",
    "@babel/plugin-transform-react-jsx",
    "@babel/plugin-transform-react-jsx-development",
    "@babel/plugin-transform-react-pure-annotations",
    "@babel/preset-env",
    "@babel/preset-react",
    "@backstage/plugin-catalog-node",
    "@backstage/plugin-events-node",
    "@backstage/plugin-proxy-node",
    "@backstage/plugin-scaffolder-node",
    "@bazel/benchmark-runner",
    "@better-scroll/observe-image",
    "@better-svelte-email/components",
    "@better-svelte-email/preview",
    "@better-svelte-email/server",
    "@blazediff/core",
    "@blocklet/benchmark",
    "@box2d/benchmark",
    "@braid/vue-formulate",
    "@braid/vue-formulate-i18n",
    "@breadstone/mosaik-elements-svelte",
    "@browsercore/devtools",
    "@bsky.app/expo-image-crop-tool",
    "@bugsnag/plugin-angular",
    "@builder.io/sdk-svelte",
    "@builder.io/sdk-vue",
    "@bulatdashiev/svelte-slider",
    "@buoy-gg/perf-monitor",
    "@calculator53295/bench-task",
    "@callstack/react-theme-provider",
    "@canvas/image",
    "@canvasjs/angular-charts",
    "@capacitor/angular",
    "@carbon/charts-angular",
    "@carbon/charts-svelte",
    "@casl/angular",
    "@casl/react",
    "@casl/vue",
    "@castlenine/svelte-qrcode",
    "@cds/angular",
    "@cfcs/core",
    "@chainsafe/benchmark",
    "@chakra-ui/image",
    "@chakra-ui/react",
    "@chargebee/chargebee-js-vue-wrapper",
    "@chenfengyuan/vue-barcode",
    "@chenfengyuan/vue-countdown",
    "@chenfengyuan/vue-number-input",
    "@chenfengyuan/vue-qrcode",
    "@chialab/node-resolve",
    "@circlon/angular-tree-component",
    "@ckeditor/ckeditor5-angular",
    "@ckeditor/ckeditor5-easy-image",
    "@ckeditor/ckeditor5-image",
    "@ckpack/vue-color",
    "@cleartrip/talos-image",
    "@clerk/react",
    "@clerk/vue",
    "@clevernature/benchmark-regression",
    "@cloudflare/stream-angular",
    "@cloudgraph/policy-pack-gcp-cis-1.2.0",
    "@cloudinary/vue",
    "@clr/angular",
    "@codama/node-types",
    "@codemirror/lang-angular",
    "@codemirror/lang-vue",
    "@comark/svelte",
    "@comark/vue",
    "@commitlint/config-angular",
    "@commitlint/config-angular-type-enum",
    "@compodoc/compodoc",
    "@computesdk/bench",
    "@contentful/f36-image",
    "@contractspec/lib.provider-ranking",
    "@copilotkit/angular",
    "@copilotkit/vue",
    "@coreui/angular",
    "@coreui/angular-chartjs",
    "@coreui/angular-pro",
    "@coreui/icons-angular",
    "@coreui/icons-vue",
    "@coreui/vue-chartjs",
    "@cornerstonejs/dicom-image-loader",
    "@cropper/element-image",
    "@cspell/dict-svelte",
    "@cspell/dict-vue",
    "@csstools/postcss-image-function",
    "@ctx-core/svelte",
    "@cybrid/cybrid-api-id-angular",
    "@cybrid/cybrid-api-organization-angular",
    "@cypress/angular",
    "@cypress/debugging-proxy",
    "@cypress/schematic",
    "@d11/react-native-fast-image",
    "@dailephd/my-dev-kit-lab",
    "@danielmoncada/angular-datetime-picker",
    "@danielmoncada/angular-datetime-picker-moment-adapter",
    "@danxcode/node-md",
    "@dapplion/benchmark",
    "@datadog/browser-rum-angular",
    "@datadog/browser-rum-react",
    "@datawrapper/svelte-component-info",
    "@dayflow/svelte",
    "@daypicker/react",
    "@daypilot/daypilot-lite-angular",
    "@dcloudio/uni-h5-vue",
    "@dcloudio/uni-mp-vue",
    "@deboxsoft/svelte-components",
    "@deck.gl/react",
    "@deepseek-ai/dsh-client-ui-attachment",
    "@delicious-simplicity/next-image-contentful-loader",
    "@devflow-tools/benchmark",
    "@devlikeapro/n8n-openapi-node",
    "@didomi/react",
    "@digigov/benchmark",
    "@dillingerstaffing/strand-svelte",
    "@directive-run/svelte",
    "@dnd-kit-svelte/accessibility",
    "@dnd-kit-svelte/core",
    "@dnd-kit-svelte/modifiers",
    "@dnd-kit-svelte/sortable",
    "@dnd-kit-svelte/svelte",
    "@dnd-kit-svelte/utilities",
    "@dnd-kit/svelte",
    "@docknetwork/node-types",
    "@docusaurus/utils",
    "@docusaurus/utils-validation",
    "@draft-js-plugins/image",
    "@duckdb/node-api",
    "@duckdb/node-bindings",
    "@durable-streams/benchmarks",
    "@dvcol/svelte-simple-router",
    "@dvcol/svelte-utils",
    "@earltp/vue-virtual-scroller",
    "@ecies/ciphers",
    "@edgio/angular",
    "@editorjs/image",
    "@edsdk/n1ed-react",
    "@elastic/apm-rum-angular",
    "@elastic/apm-rum-vue",
    "@element-plus/icons-vue",
    "@elevenlabs/react",
    "@embedpdf/svelte-pdf-viewer",
    "@embedpdf/vue-pdf-viewer",
    "@emotion/react",
    "@emotion/styled",
    "@endiliey/react-ideal-image",
    "@engram-mem/bench",
    "@eppo/node-server-sdk",
    "@essentials/benchmark",
    "@expo/osascript",
    "@expo/require-utils",
    "@expo/rudder-sdk-node",
    "@fairmint/canton-node-sdk",
    "@fe6/water-pro",
    "@felte/reporter-svelte",
    "@figspec/react",
    "@fingerprintjs/fingerprintjs-pro-angular",
    "@flatfile/angular-sdk",
    "@flighthq/tool-capture",
    "@flmngr/flmngr-angular",
    "@flmngr/flmngr-react",
    "@flmngr/flmngr-server-node",
    "@flmngr/flmngr-vue",
    "@floating-ui/react",
    "@floating-ui/react-dom",
    "@floating-ui/vue",
    "@flowbite-svelte-plugins/chart",
    "@fluentui/react-image",
    "@fluentui/react-list",
    "@fluid-experimental/bubblebench-baseline",
    "@fluid-experimental/bubblebench-common",
    "@fluid-experimental/bubblebench-ot",
    "@fluid-experimental/bubblebench-sharedtree",
    "@fluid-tools/benchmark",
    "@formio/angular",
    "@formkit/vue",
    "@fortawesome/angular-fontawesome",
    "@fortawesome/react-fontawesome",
    "@fortawesome/svelte-fontawesome",
    "@fortawesome/vue-fontawesome",
    "@forwardimpact/libharness",
    "@fre4x/benchmark",
    "@fullcalendar/angular",
    "@fullcalendar/react",
    "@fullcalendar/vue",
    "@fullcalendar/vue3",
    "@fumari/image-size",
    "@ggui-ai/shared",
    "@giphy/svelte-components",
    "@git-diff-view/svelte",
    "@git-diff-view/vue",
    "@gitbutler/svelte-comment-injector",
    "@github/image-crop-element",
    "@gnoyx/opencode-skill-creator",
    "@google-cloud/storage",
    "@google-pay/button-angular",
    "@gql.tada/svelte-support",
    "@granite-js/image",
    "@grapecity/spread-sheets-angular",
    "@gravitee/ui-particles-angular",
    "@gravitee/ui-policy-studio-angular",
    "@grest-ts/schema-benchmark",
    "@greynewell/mcpbr",
    "@greynewell/mcpbr-claude-plugin",
    "@grpc/grpc-js",
    "@gtm-support/vue-gtm",
    "@guolao/vue-monaco-editor",
    "@h4shed/benchmark-utils",
    "@handsontable/angular-wrapper",
    "@hapi/hapi",
    "@hapi/hoek",
    "@happycodingfriend/benchmark",
    "@happyvertical/smrt-svelte",
    "@hashbrownai/angular",
    "@hasna/bench",
    "@hazeljs/benchmark",
    "@hcaptcha/react-hcaptcha",
    "@headlessui-float/vue",
    "@headlessui/vue",
    "@heroui/image",
    "@heroui/use-image",
    "@highcharts/svelte",
    "@highlightjs/vue-plugin",
    "@histoire/plugin-svelte",
    "@honeycombio/opentelemetry-node",
    "@hoppscotch/vue-toasted",
    "@httptoolkit/websocket-stream",
    "@hueycolor/svelte",
    "@hugeicons/react",
    "@hugeicons/svelte",
    "@hugeicons/vue",
    "@hugerte/hugerte-angular",
    "@humanspeak/svelte-markdown",
    "@humanspeak/svelte-render",
    "@humanspeak/svelte-subscribe",
    "@hyperdx/node-opentelemetry",
    "@hyperledger/caliper-cli",
    "@icon-park/vue",
    "@iconify/react",
    "@iconify/svelte",
    "@iconify/vue",
    "@icons-pack/svelte-simple-icons",
    "@idrinth/api-bench",
    "@igniteui/angular-templates",
    "@imask/svelte",
    "@improved/node",
    "@indaco/svelte-iconoir",
    "@indoorequal/vue-maplibre-gl",
    "@inertiajs/react",
    "@inertiajs/svelte",
    "@inertiajs/vue3",
    "@ingestro/importer-angular",
    "@instantdb/svelte",
    "@instantdb/vue",
    "@intlify/eslint-plugin-svelte",
    "@intlify/eslint-plugin-vue-i18n",
    "@intlify/unplugin-vue-i18n",
    "@intlify/vue-devtools",
    "@intlify/vue-i18n-bridge",
    "@intlify/vue-i18n-core",
    "@intlify/vue-i18n-extensions",
    "@intlify/vue-router-bridge",
    "@ionic/angular",
    "@ionic/angular-server",
    "@ionic/angular-toolkit",
    "@ionic/react-router",
    "@ionic/utils-fs",
    "@ionic/vue",
    "@ionic/vue-router",
    "@jalik/benchmark",
    "@jimp/plugin-gaussian",
    "@jimp/plugin-invert",
    "@jimp/plugin-normalize",
    "@jimp/plugin-scale",
    "@jis3r/icons",
    "@jonahsnider/benchmark",
    "@js-sdsl/deque",
    "@js-sdsl/link-list",
    "@js-sdsl/ordered-map",
    "@js-sdsl/ordered-set",
    "@js-sdsl/priority-queue",
    "@js-sdsl/queue",
    "@jsii/check-node",
    "@json-render/react",
    "@json-render/shadcn-svelte",
    "@json-render/svelte",
    "@json-render/vue",
    "@jsonforms/angular",
    "@jsonforms/angular-material",
    "@jsonforms/react",
    "@jsonforms/vue",
    "@jsonforms/vue-vanilla",
    "@jsonjoy.com/fs-core",
    "@jsverse/transloco",
    "@jufab/opentelemetry-angular-interceptor",
    "@k/bench-runner",
    "@katoid/angular-grid-layout",
    "@keycloakify/angular",
    "@keycloakify/svelte",
    "@knapsack/renderer-angular",
    "@knapsack/renderer-vue",
    "@kolkov/angular-editor",
    "@korabench/core",
    "@kronos-integration/svelte-components",
    "@ks89/angular-modal-gallery",
    "@kubb/plugin-svelte-query",
    "@langchain/core",
    "@langchain/svelte",
    "@laravel/echo-vue",
    "@laravel/stream-vue",
    "@launchdarkly/react-native-client-sdk",
    "@leafer/image",
    "@leafer/image-web",
    "@leanup/cli-svelte",
    "@ledgeindex/model",
    "@ledgerhq/hw-transport-node-hid",
    "@ledgerhq/hw-transport-node-hid-noevents",
    "@ledgerhq/hw-transport-node-hid-singleton",
    "@leveluptuts/svelte-fit",
    "@lexical/react",
    "@libsql/isomorphic-fetch",
    "@likashefqet/react-native-image-zoom",
    "@lit-labs/react",
    "@lit/react",
    "@livekit/react-native",
    "@livekit/rtc-node",
    "@livestore/svelte",
    "@localess/angular",
    "@locker/rollup-plugin-best",
    "@loki/integration-vue",
    "@looker/sdk-node",
    "@lottiefiles/dotlottie-react",
    "@lottiefiles/dotlottie-svelte",
    "@lottiefiles/dotlottie-vue",
    "@lottiefiles/svelte-lottie-player",
    "@lucid-softworks/vitest-config",
    "@lucide/angular",
    "@lucide/svelte",
    "@lucide/vue",
    "@lumigo/node-core",
    "@lunora/svelte",
    "@lydell/node-pty",
    "@lydell/node-pty-darwin-arm64",
    "@lydell/node-pty-darwin-x64",
    "@lydell/node-pty-linux-arm64",
    "@lydell/node-pty-linux-x64",
    "@lydell/node-pty-win32-arm64",
    "@lydell/node-pty-win32-x64",
    "@lythos/skill-arena",
    "@m2d/image",
    "@macfja/svelte-persistent-store",
    "@magidoc/plugin-svelte-marked",
    "@magidoc/plugin-svelte-prismjs",
    "@markuplint/svelte-parser",
    "@markuplint/svelte-spec",
    "@markuplint/vue-parser",
    "@marsidev/react-turnstile",
    "@maskito/angular",
    "@maskito/react",
    "@maskito/vue",
    "@mastra/longmemeval",
    "@material/image-list",
    "@mdi/angular-material",
    "@mdit-vue/plugin-component",
    "@mdit-vue/plugin-sfc",
    "@mdit-vue/shared",
    "@mdit-vue/types",
    "@mdx-js/react",
    "@mdx-js/vue",
    "@memofs/benchmark-kit",
    "@mergeapi/merge-node-client",
    "@mescius/activereportsjs-angular",
    "@mescius/spread-sheets-angular",
    "@microsoft/applicationinsights-angularplugin-js",
    "@microsoft/sp-image-helper",
    "@milkdown/vue",
    "@modelcontextprotocol/sdk",
    "@module-federation/node",
    "@moka-fe/benchmark-webpack-plugin",
    "@monaco-editor/react",
    "@morev/vue-transitions",
    "@motionone/svelte",
    "@mui/internal-benchmark",
    "@mui/material",
    "@myop/angular",
    "@myriaddreamin/typst-ts-node-compiler",
    "@myriaddreamin/typst-ts-node-compiler-linux-x64-gnu",
    "@myriaddreamin/typst-ts-node-compiler-linux-x64-musl",
    "@n8n/n8n-benchmark",
    "@nangohq/node",
    "@nanostores/vue",
    "@napi-rs/image",
    "@napi-rs/image-android-arm64",
    "@napi-rs/image-darwin-arm64",
    "@napi-rs/image-darwin-x64",
    "@napi-rs/image-freebsd-x64",
    "@napi-rs/image-linux-arm-gnueabihf",
    "@napi-rs/image-linux-arm64-gnu",
    "@napi-rs/image-linux-arm64-musl",
    "@napi-rs/image-linux-x64-gnu",
    "@napi-rs/image-linux-x64-musl",
    "@napi-rs/image-wasm32-wasi",
    "@napi-rs/image-win32-arm64-msvc",
    "@napi-rs/image-win32-ia32-msvc",
    "@napi-rs/image-win32-x64-msvc",
    "@nativescript/angular",
    "@ncstate/sat-popover",
    "@neocodemirror/svelte",
    "@neoconfetti/react",
    "@neoconfetti/svelte",
    "@neoconfetti/vue",
    "@neodrag/svelte",
    "@neondatabase/serverless",
    "@nestia/benchmark",
    "@nestjs/common",
    "@nestjs/core",
    "@netlify/angular-runtime",
    "@nextcloud/vue",
    "@nextcloud/webpack-vue-config",
    "@nextui-org/use-image",
    "@ng-bootstrap/ng-bootstrap",
    "@ng-matero/extensions",
    "@ng-select/ng-select",
    "@ngneat/spectator",
    "@ngneat/until-destroy",
    "@ngrx/schematics",
    "@ngrx/store",
    "@ngu/carousel",
    "@nguniversal/builders",
    "@nguniversal/common",
    "@ngx-translate/core",
    "@ngxmc/datetime-picker",
    "@nicia-ai/lachesis-generator",
    "@nifrajs/web-svelte",
    "@nng-components/angular-material-color-picker",
    "@node-ipc/js-queue",
    "@node-llama-cpp/linux-arm64",
    "@node-llama-cpp/linux-armv7l",
    "@node-llama-cpp/linux-x64",
    "@node-llama-cpp/linux-x64-cuda",
    "@node-llama-cpp/linux-x64-cuda-ext",
    "@node-llama-cpp/linux-x64-vulkan",
    "@node-minify/benchmark",
    "@node-minify/core",
    "@node-minify/terser",
    "@node-minify/utils",
    "@node-ntlm/core",
    "@node-red/editor-api",
    "@node-red/editor-client",
    "@node-red/nodes",
    "@node-red/registry",
    "@node-red/runtime",
    "@node-red/util",
    "@node-redis/client",
    "@node-rs/helper",
    "@nodro7/angular-mydatepicker",
    "@noy-db/in-svelte",
    "@npmcli/node-gyp",
    "@nrwl/angular",
    "@nrwl/node",
    "@nuxt/image",
    "@nuxt/image-edge",
    "@nx/angular",
    "@nx/angular-rspack",
    "@nx/angular-rspack-compiler",
    "@nx/node",
    "@nx/vue",
    "@nxext/ionic-angular",
    "@nxext/svelte",
    "@octokit/graphql",
    "@octokit/rest",
    "@odx/angular",
    "@oicl/openbridge-webcomponents-svelte",
    "@okta/okta-angular",
    "@okta/okta-vue",
    "@onesignal/node-onesignal",
    "@oneworks/benchmark",
    "@openagentaudit/core",
    "@openfeature/angular-sdk",
    "@openfeature/react-sdk",
    "@opensourcesai/bench",
    "@opentelemetry/auto-instrumentations-node",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-trace-node",
    "@openuidev/svelte-lang",
    "@origin-space/image-cropper",
    "@oxc-angular-testing/jest",
    "@oxc-angular-testing/vitest",
    "@oxc-angular/vite",
    "@oxc-minify/binding-linux-x64-gnu",
    "@oxc-parser/binding-android-arm-eabi",
    "@oxc-parser/binding-android-arm64",
    "@oxc-parser/binding-darwin-arm64",
    "@oxc-parser/binding-darwin-x64",
    "@oxc-parser/binding-freebsd-x64",
    "@oxc-parser/binding-linux-arm-gnueabihf",
    "@oxc-parser/binding-linux-arm-musleabihf",
    "@oxc-parser/binding-linux-arm64-gnu",
    "@oxc-parser/binding-linux-arm64-musl",
    "@oxc-parser/binding-linux-ppc64-gnu",
    "@oxc-parser/binding-linux-riscv64-gnu",
    "@oxc-parser/binding-linux-riscv64-musl",
    "@oxc-parser/binding-linux-s390x-gnu",
    "@oxc-parser/binding-linux-x64-gnu",
    "@oxc-parser/binding-linux-x64-musl",
    "@oxc-parser/binding-openharmony-arm64",
    "@oxc-parser/binding-wasm32-wasi",
    "@oxc-parser/binding-win32-arm64-msvc",
    "@oxc-parser/binding-win32-ia32-msvc",
    "@oxc-parser/binding-win32-x64-msvc",
    "@oxc-resolver/binding-darwin-arm64",
    "@oxc-resolver/binding-darwin-x64",
    "@oxc-resolver/binding-linux-arm64-gnu",
    "@oxc-resolver/binding-linux-arm64-musl",
    "@oxc-resolver/binding-linux-s390x-gnu",
    "@oxc-resolver/binding-linux-x64-gnu",
    "@oxc-resolver/binding-linux-x64-musl",
    "@oxc-resolver/binding-win32-arm64-msvc",
    "@oxc-resolver/binding-win32-x64-msvc",
    "@oxc-transform/binding-linux-x64-gnu",
    "@oxc-transform/binding-linux-x64-musl",
    "@pandacss/plugin-svelte",
    "@panter/vue-i18next",
    "@parca/react-benchmark",
    "@paulmillr/jsbt",
    "@payos/node",
    "@pennyfarthing/benchmark",
    "@pepicons/vue",
    "@permify/permify-node",
    "@phosphor-icons/react",
    "@phosphor-icons/vue",
    "@php-wasm/node-7-4",
    "@php-wasm/node-8-0",
    "@php-wasm/node-8-1",
    "@php-wasm/node-8-2",
    "@php-wasm/node-8-3",
    "@php-wasm/node-8-4",
    "@php-wasm/node-8-5",
    "@pixiv/three-vrm-node-constraint",
    "@plasmohq/parcel-transformer-svelte",
    "@plasmohq/parcel-transformer-vue",
    "@playpilot/svelte-fragment-component",
    "@playpilot/svelte-hyperscript",
    "@playwright/experimental-ct-svelte",
    "@playwright/test",
    "@pmndrs/detect-gpu",
    "@pnpm/env.system-node-version",
    "@pnpm/fetch",
    "@pollyjs/adapter-node-http",
    "@pollyjs/node-server",
    "@poppanator/sveltekit-svg",
    "@portabletext/react",
    "@portabletext/svelte",
    "@portabletext/vue",
    "@pqina/angular-pintura",
    "@primeicons/angular",
    "@primeicons/vue",
    "@prisma/client",
    "@prisma/type-benchmark-tests",
    "@prismicio/svelte",
    "@prismicio/vue",
    "@probe.gl/env",
    "@progress/kendo-angular-barcodes",
    "@progress/kendo-angular-buttons",
    "@progress/kendo-angular-charts",
    "@progress/kendo-angular-common",
    "@progress/kendo-angular-conversational-ui",
    "@progress/kendo-angular-dateinputs",
    "@progress/kendo-angular-diagrams",
    "@progress/kendo-angular-dialog",
    "@progress/kendo-angular-dropdowns",
    "@progress/kendo-angular-editor",
    "@progress/kendo-angular-excel-export",
    "@progress/kendo-angular-filter",
    "@progress/kendo-angular-gantt",
    "@progress/kendo-angular-gauges",
    "@progress/kendo-angular-grid",
    "@progress/kendo-angular-icons",
    "@progress/kendo-angular-indicators",
    "@progress/kendo-angular-inputs",
    "@progress/kendo-angular-intl",
    "@progress/kendo-angular-l10n",
    "@progress/kendo-angular-label",
    "@progress/kendo-angular-layout",
    "@progress/kendo-angular-listbox",
    "@progress/kendo-angular-listview",
    "@progress/kendo-angular-map",
    "@progress/kendo-angular-menu",
    "@progress/kendo-angular-messages",
    "@progress/kendo-angular-navigation",
    "@progress/kendo-angular-notification",
    "@progress/kendo-angular-pager",
    "@progress/kendo-angular-pdf-export",
    "@progress/kendo-angular-pdfviewer",
    "@progress/kendo-angular-pivotgrid",
    "@progress/kendo-angular-popup",
    "@progress/kendo-angular-progressbar",
    "@progress/kendo-angular-ripple",
    "@progress/kendo-angular-scheduler",
    "@progress/kendo-angular-schematics",
    "@progress/kendo-angular-scrollview",
    "@progress/kendo-angular-sortable",
    "@progress/kendo-angular-spreadsheet",
    "@progress/kendo-angular-toolbar",
    "@progress/kendo-angular-tooltip",
    "@progress/kendo-angular-treelist",
    "@progress/kendo-angular-treeview",
    "@progress/kendo-angular-typography",
    "@progress/kendo-angular-upload",
    "@progress/kendo-angular-utils",
    "@progress/kendo-vue-animation",
    "@progress/kendo-vue-common",
    "@progress/kendo-vue-popup",
    "@progress/telerik-angular-report-viewer",
    "@prosekit/svelte",
    "@prosekit/vue",
    "@prosemirror-adapter/svelte",
    "@prosemirror-adapter/vue",
    "@protobufjs/aspromise",
    "@protobufjs/fetch",
    "@quantanow/ollama-bench",
    "@quartz-community/og-image",
    "@radix-ui/react-icons",
    "@rc-component/image",
    "@rc-component/portal",
    "@react-aria/autocomplete",
    "@react-aria/breadcrumbs",
    "@react-aria/button",
    "@react-aria/calendar",
    "@react-aria/checkbox",
    "@react-aria/collections",
    "@react-aria/color",
    "@react-aria/combobox",
    "@react-aria/datepicker",
    "@react-aria/dialog",
    "@react-aria/disclosure",
    "@react-aria/dnd",
    "@react-aria/focus",
    "@react-aria/form",
    "@react-aria/grid",
    "@react-aria/gridlist",
    "@react-aria/i18n",
    "@react-aria/interactions",
    "@react-aria/label",
    "@react-aria/landmark",
    "@react-aria/link",
    "@react-aria/listbox",
    "@react-aria/live-announcer",
    "@react-aria/menu",
    "@react-aria/meter",
    "@react-aria/numberfield",
    "@react-aria/overlays",
    "@react-aria/progress",
    "@react-aria/radio",
    "@react-aria/searchfield",
    "@react-aria/select",
    "@react-aria/selection",
    "@react-aria/separator",
    "@react-aria/spinbutton",
    "@react-aria/ssr",
    "@react-aria/switch",
    "@react-aria/table",
    "@react-aria/tabs",
    "@react-aria/tag",
    "@react-aria/textfield",
    "@react-aria/toast",
    "@react-aria/toggle",
    "@react-aria/toolbar",
    "@react-aria/tooltip",
    "@react-aria/tree",
    "@react-aria/utils",
    "@react-aria/virtualizer",
    "@react-aria/visually-hidden",
    "@react-email/render",
    "@react-leaflet/core",
    "@react-native-community/cli",
    "@react-native-community/datetimepicker",
    "@react-native-community/image-editor",
    "@react-native-community/netinfo",
    "@react-native-masked-view/masked-view",
    "@react-native-menu/menu",
    "@react-native/assets-registry",
    "@react-native/babel-plugin-codegen",
    "@react-native/babel-preset",
    "@react-native/codegen",
    "@react-native/community-cli-plugin",
    "@react-native/debugger-frontend",
    "@react-native/debugger-shell",
    "@react-native/dev-middleware",
    "@react-native/eslint-config",
    "@react-native/eslint-plugin",
    "@react-native/gradle-plugin",
    "@react-native/jest-preset",
    "@react-native/js-polyfills",
    "@react-native/metro-babel-transformer",
    "@react-native/metro-config",
    "@react-native/normalize-colors",
    "@react-native/typescript-config",
    "@react-native/virtualized-lists",
    "@react-navigation/elements",
    "@react-navigation/native",
    "@react-navigation/native-stack",
    "@react-oauth/google",
    "@react-pdf/fns",
    "@react-pdf/font",
    "@react-pdf/svg",
    "@react-pdf/types",
    "@react-router/dev",
    "@react-router/node",
    "@react-sigma/core",
    "@react-spectrum/provider",
    "@react-spring/animated",
    "@react-spring/core",
    "@react-spring/native",
    "@react-spring/rafz",
    "@react-spring/three",
    "@react-spring/web",
    "@react-spring/zdog",
    "@react-stately/autocomplete",
    "@react-stately/calendar",
    "@react-stately/checkbox",
    "@react-stately/collections",
    "@react-stately/color",
    "@react-stately/combobox",
    "@react-stately/data",
    "@react-stately/datepicker",
    "@react-stately/disclosure",
    "@react-stately/dnd",
    "@react-stately/flags",
    "@react-stately/form",
    "@react-stately/grid",
    "@react-stately/layout",
    "@react-stately/list",
    "@react-stately/menu",
    "@react-stately/numberfield",
    "@react-stately/overlays",
    "@react-stately/radio",
    "@react-stately/searchfield",
    "@react-stately/select",
    "@react-stately/selection",
    "@react-stately/slider",
    "@react-stately/table",
    "@react-stately/tabs",
    "@react-stately/toast",
    "@react-stately/toggle",
    "@react-stately/tooltip",
    "@react-stately/tree",
    "@react-stately/utils",
    "@react-stately/virtualizer",
    "@react-three/drei",
    "@react-three/fiber",
    "@react-three/postprocessing",
    "@react-types/autocomplete",
    "@react-types/breadcrumbs",
    "@react-types/button",
    "@react-types/calendar",
    "@react-types/checkbox",
    "@react-types/color",
    "@react-types/combobox",
    "@react-types/datepicker",
    "@react-types/dialog",
    "@react-types/form",
    "@react-types/grid",
    "@react-types/link",
    "@react-types/listbox",
    "@react-types/menu",
    "@react-types/meter",
    "@react-types/numberfield",
    "@react-types/overlays",
    "@react-types/progress",
    "@react-types/radio",
    "@react-types/searchfield",
    "@react-types/select",
    "@react-types/shared",
    "@react-types/slider",
    "@react-types/switch",
    "@react-types/table",
    "@react-types/tabs",
    "@react-types/textfield",
    "@react-types/tooltip",
    "@reactflow/node-toolbar",
    "@real-router/svelte",
    "@realfavicongenerator/image-adapter-node",
    "@redis/client",
    "@reduxjs/toolkit",
    "@reintersect/svelte-check",
    "@reintersect/svelte-language-server",
    "@replit/codemirror-lang-svelte",
    "@revolist/svelte-datagrid",
    "@rexxars/react-json-inspector",
    "@rexxars/react-split-pane",
    "@rgba-image/common",
    "@rgba-image/copy",
    "@rgba-image/create-image",
    "@rodrigodagostino/svelte-sortable-list",
    "@rolldown/plugin-node-polyfills",
    "@rollup/wasm-node",
    "@rsbuild/plugin-image-compress",
    "@rsbuild/plugin-react",
    "@rsbuild/plugin-svelte",
    "@rsbuild/plugin-vue",
    "@rspack/binding",
    "@rspack/binding-darwin-arm64",
    "@rspack/binding-darwin-x64",
    "@rspack/binding-linux-arm64-gnu",
    "@rspack/binding-linux-arm64-musl",
    "@rspack/binding-linux-x64-gnu",
    "@rspack/binding-linux-x64-musl",
    "@rspack/binding-wasm32-wasi",
    "@rspack/binding-win32-arm64-msvc",
    "@rspack/binding-win32-ia32-msvc",
    "@rspack/binding-win32-x64-msvc",
    "@rspack/plugin-node-polyfill",
    "@rspack/plugin-react-refresh",
    "@rsvelte/fmt",
    "@rsvelte/svelte-check",
    "@rsvelte/svelte-check-linux-arm64-gnu",
    "@rsvelte/svelte-check-linux-x64-gnu",
    "@rubeneschauzier/solidbench",
    "@rudderstack/rudder-sdk-node",
    "@rx-angular/cdk",
    "@rx-angular/isr",
    "@rx-angular/state",
    "@rx-angular/template",
    "@ryancavanaugh/benchmark",
    "@samverschueren/stream-to-observable",
    "@sanity/image-url",
    "@sanity/svelte-loader",
    "@scalar/use-codemirror",
    "@scalar/use-toasts",
    "@schematics/angular",
    "@sd-angular/core",
    "@segment/analytics-node",
    "@selemondev/svelte-marquee",
    "@selemondev/svgl-svelte",
    "@sendgrid/mail",
    "@seniorsistemas/angular-components",
    "@sentry-internal/node-cpu-profiler",
    "@sentry/angular",
    "@sentry/angular-ivy",
    "@sentry/node",
    "@sentry/node-core",
    "@sentry/node-cpu-profiler",
    "@sentry/react-native",
    "@sentry/svelte",
    "@seydx/node-av-linux-x64",
    "@shadcn/react",
    "@shimmer-from-structure/angular",
    "@shimmer-from-structure/svelte",
    "@shopgate/pwa-benchmark",
    "@shopify/react-native-skia",
    "@siemens/eslint-config-angular",
    "@siemens/ix-angular",
    "@sila-chain/benchmark",
    "@silvia-odwyer/photon-node",
    "@simonsmith/cypress-image-snapshot",
    "@simple-table/svelte",
    "@sjsf/basic-theme",
    "@sjsf/shadcn4-theme",
    "@skeletonlabs/skeleton-svelte",
    "@slack/logger",
    "@slack/types",
    "@slorber/react-ideal-image",
    "@smithy/eventstream-serde-node",
    "@smithy/hash-node",
    "@smithy/hash-stream-node",
    "@smithy/util-defaults-mode-node",
    "@smui-extra/accordion",
    "@smui-extra/autocomplete",
    "@smui-extra/badge",
    "@smui-extra/chip-input",
    "@smui/banner",
    "@smui/button",
    "@smui/card",
    "@smui/checkbox",
    "@smui/chips",
    "@smui/circular-progress",
    "@smui/common",
    "@smui/data-table",
    "@smui/dialog",
    "@smui/drawer",
    "@smui/fab",
    "@smui/floating-label",
    "@smui/form-field",
    "@smui/icon-button",
    "@smui/image-list",
    "@smui/layout-grid",
    "@smui/line-ripple",
    "@smui/linear-progress",
    "@smui/list",
    "@smui/menu",
    "@smui/menu-surface",
    "@smui/notched-outline",
    "@smui/paper",
    "@smui/radio",
    "@smui/ripple",
    "@smui/segmented-button",
    "@smui/select",
    "@smui/slider",
    "@smui/snackbar",
    "@smui/switch",
    "@smui/tab",
    "@smui/tab-bar",
    "@smui/tab-indicator",
    "@smui/tab-scroller",
    "@smui/textfield",
    "@smui/tooltip",
    "@smui/top-app-bar",
    "@smui/touch-target",
    "@snowpack/plugin-svelte",
    "@snowplow/node-tracker",
    "@solar-icons/svelte",
    "@somesoap/react-native-image-palette",
    "@soniox/node",
    "@spaethtech/svelte-ui",
    "@spine-benchmark/asset-store",
    "@spine-benchmark/constraint-tools",
    "@spine-benchmark/file-tools",
    "@spine-benchmark/mesh-tools",
    "@spine-benchmark/metrics",
    "@spine-benchmark/render-tools",
    "@spine-benchmark/workbench-core",
    "@splidejs/svelte-splide",
    "@splidejs/vue-splide",
    "@splitsoftware/splitio-angular",
    "@spotify/backstage-plugin-insights",
    "@spotify/backstage-plugin-insights-backend",
    "@square/svelte-store",
    "@sreetej510/pi-shipd-checks",
    "@stackoverflow/stacks-svelte",
    "@stacksjs/image",
    "@stdlib/bench",
    "@stdlib/bench-harness",
    "@stencil/angular-output-target",
    "@stencil/vue-output-target",
    "@stigg/node-server-sdk",
    "@storyblok/svelte",
    "@storyblok/vue",
    "@storybook/addon-svelte-csf",
    "@storybook/angular",
    "@storybook/angular-vite",
    "@storybook/bench",
    "@storybook/preset-react-webpack",
    "@storybook/preset-svelte-webpack",
    "@storybook/preset-vue-webpack",
    "@storybook/react",
    "@storybook/react-docgen-typescript-plugin",
    "@storybook/react-vite",
    "@storybook/svelte",
    "@storybook/svelte-vite",
    "@storybook/svelte-webpack5",
    "@streamdown-svelte/plugin-core",
    "@streamdown-svelte/remend",
    "@stripe/react-stripe-js",
    "@stripe/stripe-js",
    "@stripe/stripe-react-native",
    "@supabase/supabase-js",
    "@svar-ui/lib-svelte",
    "@svar-ui/svelte-comments",
    "@svar-ui/svelte-core",
    "@svar-ui/svelte-filter",
    "@svar-ui/svelte-gantt",
    "@svar-ui/svelte-grid",
    "@svar-ui/svelte-menu",
    "@svar-ui/svelte-tasklist",
    "@svar-ui/svelte-toolbar",
    "@svelte-check-rs/linux-arm64",
    "@svelte-check-rs/linux-x64",
    "@svelte-plugins/datepicker",
    "@svelte-plugins/tooltips",
    "@svelte-put/copy",
    "@svelte-put/dragscroll",
    "@svelte-put/inline-svg",
    "@svelte-put/resize",
    "@svelte-ssv/core",
    "@svelte-vitals/core",
    "@sveltejs/adapter-node",
    "@sveltejs/enhanced-img",
    "@sveltejs/eslint-config",
    "@sveltejs/kit",
    "@sveltejs/load-config",
    "@sveltejs/mcp",
    "@sveltejs/package",
    "@sveltejs/svelte-json-tree",
    "@sveltejs/svelte-scroller",
    "@sveltejs/svelte-virtual-list",
    "@sveltejs/vite-plugin-svelte",
    "@sveltejs/vite-plugin-svelte-inspector",
    "@sveltelaunch/svelte-5-email",
    "@sveltestack/svelte-query",
    "@sveltestrap/sveltestrap",
    "@svgr/babel-plugin-transform-react-native-svg",
    "@swc-node/register",
    "@swc/core",
    "@swimlane/ngx-charts",
    "@syncfusion/ej2-angular-base",
    "@syncfusion/ej2-angular-buttons",
    "@syncfusion/ej2-angular-circulargauge",
    "@syncfusion/ej2-angular-dropdowns",
    "@syncfusion/ej2-angular-filemanager",
    "@syncfusion/ej2-angular-gantt",
    "@syncfusion/ej2-angular-grids",
    "@syncfusion/ej2-angular-image-editor",
    "@syncfusion/ej2-angular-pdfviewer",
    "@syncfusion/ej2-angular-progressbar",
    "@syncfusion/ej2-angular-querybuilder",
    "@syncfusion/ej2-angular-richtexteditor",
    "@syncfusion/ej2-angular-treegrid",
    "@syncfusion/ej2-angular-treemap",
    "@syncfusion/ej2-vue-dropdowns",
    "@syncfusion/ej2-vue-richtexteditor",
    "@synthetixio/pyth-erc7412-wrapper",
    "@tadashi/svelte-editor-quill",
    "@tadashi/svelte-notification",
    "@tangle-network/agent-bench",
    "@tanstack/angular-form",
    "@tanstack/angular-hotkeys",
    "@tanstack/angular-query-experimental",
    "@tanstack/angular-table",
    "@tanstack/angular-virtual",
    "@tanstack/react-db",
    "@tanstack/react-form",
    "@tanstack/react-hotkeys",
    "@tanstack/react-query",
    "@tanstack/react-router",
    "@tanstack/react-router-devtools",
    "@tanstack/react-start",
    "@tanstack/react-start-client",
    "@tanstack/react-start-rsc",
    "@tanstack/react-start-server",
    "@tanstack/react-table",
    "@tanstack/react-virtual",
    "@tanstack/svelte-charts",
    "@tanstack/svelte-db",
    "@tanstack/svelte-form",
    "@tanstack/svelte-hotkeys",
    "@tanstack/svelte-query",
    "@tanstack/svelte-query-devtools",
    "@tanstack/svelte-query-persist-client",
    "@tanstack/svelte-table",
    "@tanstack/svelte-virtual",
    "@tanstack/vue-db",
    "@tanstack/vue-form",
    "@tanstack/vue-query",
    "@tanstack/vue-router",
    "@tanstack/vue-table",
    "@tanstack/vue-virtual",
    "@tato30/vue-pdf",
    "@tauri-apps/api",
    "@telorun/benchmark",
    "@temporalio/core-bridge",
    "@teovilla/react-native-web-maps",
    "@testing-library/angular",
    "@testing-library/jest-dom",
    "@testing-library/react",
    "@testing-library/react-native",
    "@testing-library/svelte",
    "@testing-library/svelte-core",
    "@testing-library/vue",
    "@tet/tet-components-angular",
    "@textlint/ast-node-types",
    "@threlte/core",
    "@tieuannguyen/avf",
    "@times-components/image",
    "@tinymce/tinymce-angular",
    "@tinymce/tinymce-react",
    "@tinymce/tinymce-svelte",
    "@tinymce/tinymce-vue",
    "@tippyjs/react",
    "@tiptap/extension-drag-handle-vue-3",
    "@tiptap/extension-image",
    "@tiptap/extension-node-range",
    "@tiptap/react",
    "@tiptap/vue-2",
    "@tiptap/vue-3",
    "@tolgee/svelte",
    "@tolgee/vue",
    "@toruslabs/fetch-node-details",
    "@tosspayments/n8n__n8n-benchmark",
    "@tpsdev-ai/flair-bench",
    "@tracerbench/core",
    "@tracetail/angular",
    "@tracetail/vue",
    "@tradejs/strategy-trend-follow",
    "@trapcode/benchmark",
    "@tree-sitter-grammars/tree-sitter-svelte",
    "@tresjs/core",
    "@trevoreyre/autocomplete-vue",
    "@trpc/client",
    "@trpc/react-query",
    "@trpc/server",
    "@tryghost/image-transform",
    "@tscircuit/autorouting-dataset-01",
    "@tsconfig/node-lts",
    "@tsconfig/node-ts",
    "@tsconfig/node10",
    "@tsconfig/node12",
    "@tsconfig/node14",
    "@tsconfig/node16",
    "@tsconfig/node18",
    "@tsconfig/svelte",
    "@tsparticles/plugin-export-image",
    "@tsparticles/shape-image",
    "@twada/benchmark-commits",
    "@twilio-alpha/mcp-te-benchmark",
    "@types/adal-angular",
    "@types/analytics-node",
    "@types/angular",
    "@types/angular-animate",
    "@types/angular-aria",
    "@types/angular-cookies",
    "@types/angular-gettext",
    "@types/angular-hotkeys",
    "@types/angular-local-storage",
    "@types/angular-material",
    "@types/angular-mocks",
    "@types/angular-permission",
    "@types/angular-resource",
    "@types/angular-route",
    "@types/angular-sanitize",
    "@types/angular-translate",
    "@types/angular-ui-bootstrap",
    "@types/angular-ui-router",
    "@types/benchmark",
    "@types/blueimp-load-image",
    "@types/chartmogul-node",
    "@types/cypress-image-snapshot",
    "@types/detect-node",
    "@types/dom-to-image",
    "@types/express",
    "@types/get-image-colors",
    "@types/gulp-angular-templatecache",
    "@types/hoist-non-react-statics",
    "@types/html-pdf-node",
    "@types/image-blob-reduce",
    "@types/image-to-base64",
    "@types/jest",
    "@types/jest-image-snapshot",
    "@types/lodash",
    "@types/mui-image",
    "@types/node",
    "@types/node-abi",
    "@types/node-cleanup",
    "@types/node-cron",
    "@types/node-dijkstra",
    "@types/node-dir",
    "@types/node-dogstatsd",
    "@types/node-fetch",
    "@types/node-forge",
    "@types/node-geocoder",
    "@types/node-gzip",
    "@types/node-imap",
    "@types/node-int64",
    "@types/node-ipc",
    "@types/node-jose",
    "@types/node-localstorage",
    "@types/node-notifier",
    "@types/node-os-utils",
    "@types/node-persist",
    "@types/node-polyglot",
    "@types/node-rsa",
    "@types/node-sass",
    "@types/node-schedule",
    "@types/node-statsd",
    "@types/node-telegram-bot-api",
    "@types/node-uuid",
    "@types/node-wav",
    "@types/pouchdb-adapter-node-websql",
    "@types/pouchdb-node",
    "@types/probe-image-size",
    "@types/qr-image",
    "@types/react",
    "@types/react-color",
    "@types/react-dom",
    "@types/react-helmet",
    "@types/react-image-fallback",
    "@types/react-image-gallery",
    "@types/react-image-magnify",
    "@types/react-inner-image-zoom",
    "@types/react-is",
    "@types/react-lazy-load-image-component",
    "@types/react-modal",
    "@types/react-modal-image",
    "@types/react-reconciler",
    "@types/react-redux",
    "@types/react-router",
    "@types/react-router-dom",
    "@types/react-slick",
    "@types/react-syntax-highlighter",
    "@types/react-table",
    "@types/react-test-renderer",
    "@types/react-transition-group",
    "@types/react-virtualized",
    "@types/svelte-range-slider-pips",
    "@types/vue-color",
    "@types/vue-cropperjs",
    "@types/vue-select",
    "@types/w3c-image-capture",
    "@types/webpack-node-externals",
    "@udecode/react-hotkeys",
    "@udecode/react-utils",
    "@uirouter/angular",
    "@uirouter/angular-hybrid",
    "@uiw/react-codemirror",
    "@unhead/vue",
    "@unleash/proxy-client-vue",
    "@unocss/extractor-svelte",
    "@unocss/svelte-scoped",
    "@unovis/angular",
    "@unovis/svelte",
    "@unovis/vue",
    "@unpic/react",
    "@unpic/svelte",
    "@unrs/resolver-binding-android-arm-eabi",
    "@unrs/resolver-binding-android-arm64",
    "@unrs/resolver-binding-darwin-arm64",
    "@unrs/resolver-binding-darwin-x64",
    "@unrs/resolver-binding-freebsd-x64",
    "@unrs/resolver-binding-linux-arm-gnueabihf",
    "@unrs/resolver-binding-linux-arm-musleabihf",
    "@unrs/resolver-binding-linux-arm64-gnu",
    "@unrs/resolver-binding-linux-arm64-musl",
    "@unrs/resolver-binding-linux-ppc64-gnu",
    "@unrs/resolver-binding-linux-riscv64-gnu",
    "@unrs/resolver-binding-linux-riscv64-musl",
    "@unrs/resolver-binding-linux-s390x-gnu",
    "@unrs/resolver-binding-linux-x64-gnu",
    "@unrs/resolver-binding-linux-x64-musl",
    "@unrs/resolver-binding-wasm32-wasi",
    "@unrs/resolver-binding-win32-arm64-msvc",
    "@unrs/resolver-binding-win32-ia32-msvc",
    "@unrs/resolver-binding-win32-x64-msvc",
    "@untemps/svelte-palette",
    "@untemps/svelte-use-tooltip",
    "@uploadcare/image-shrink",
    "@uppy/angular",
    "@uppy/image-editor",
    "@uppy/image-generator",
    "@uppy/react",
    "@uppy/svelte",
    "@urql/svelte",
    "@urql/vue",
    "@use-gesture/react",
    "@usewaypoint/block-image",
    "@vessel-co/svelte-htm",
    "@vibe-forge/benchmark",
    "@videojs-player/vue",
    "@vitejs/plugin-react",
    "@vitejs/plugin-vue",
    "@vitejs/plugin-vue-jsx",
    "@vscode/spdlog",
    "@vtmn/svelte",
    "@vtstech/pi-model-test",
    "@vue-dnd-kit/core",
    "@vue-flow/background",
    "@vue-flow/controls",
    "@vue-flow/core",
    "@vue-flow/node-resizer",
    "@vue-leaflet/vue-leaflet",
    "@vue-lynx-example/7guis",
    "@vue-macros/api",
    "@vue-macros/better-define",
    "@vue-macros/boolean-prop",
    "@vue-macros/chain-call",
    "@vue-macros/common",
    "@vue-macros/config",
    "@vue-macros/define-emit",
    "@vue-macros/define-models",
    "@vue-macros/define-prop",
    "@vue-macros/define-props",
    "@vue-macros/define-props-refs",
    "@vue-macros/define-render",
    "@vue-macros/define-slots",
    "@vue-macros/define-stylex",
    "@vue-macros/devtools",
    "@vue-macros/export-expose",
    "@vue-macros/export-props",
    "@vue-macros/export-render",
    "@vue-macros/hoist-static",
    "@vue-macros/jsx-directive",
    "@vue-macros/named-template",
    "@vue-macros/nuxt",
    "@vue-macros/reactivity-transform",
    "@vue-macros/script-lang",
    "@vue-macros/setup-block",
    "@vue-macros/setup-component",
    "@vue-macros/setup-sfc",
    "@vue-macros/short-bind",
    "@vue-macros/short-emits",
    "@vue-macros/short-vmodel",
    "@vue-macros/volar",
    "@vue-pdf-viewer/shared",
    "@vue-pdf-viewer/viewer",
    "@vue-stripe/vue-stripe",
    "@vue/apollo-composable",
    "@vue/apollo-util",
    "@vue/babel-helper-vue-jsx-merge-props",
    "@vue/babel-plugin-jsx",
    "@vue/babel-plugin-resolve-type",
    "@vue/babel-plugin-transform-vue-jsx",
    "@vue/babel-preset-app",
    "@vue/babel-preset-jsx",
    "@vue/babel-sugar-composition-api-inject-h",
    "@vue/babel-sugar-composition-api-render-instance",
    "@vue/babel-sugar-inject-h",
    "@vue/babel-sugar-v-model",
    "@vue/babel-sugar-v-on",
    "@vue/cli-overlay",
    "@vue/cli-plugin-babel",
    "@vue/cli-plugin-e2e-cypress",
    "@vue/cli-plugin-e2e-nightwatch",
    "@vue/cli-plugin-eslint",
    "@vue/cli-plugin-pwa",
    "@vue/cli-plugin-router",
    "@vue/cli-plugin-typescript",
    "@vue/cli-plugin-unit-jest",
    "@vue/cli-plugin-unit-mocha",
    "@vue/cli-plugin-vuex",
    "@vue/cli-service",
    "@vue/cli-shared-utils",
    "@vue/cli-ui-addon-webpack",
    "@vue/compat",
    "@vue/compiler-core",
    "@vue/compiler-dom",
    "@vue/compiler-sfc",
    "@vue/compiler-ssr",
    "@vue/compiler-vapor",
    "@vue/compiler-vue2",
    "@vue/component-compiler",
    "@vue/component-compiler-utils",
    "@vue/composition-api",
    "@vue/devtools-core",
    "@vue/devtools-shared",
    "@vue/eslint-config-prettier",
    "@vue/language-core",
    "@vue/language-service",
    "@vue/reactivity",
    "@vue/reactivity-transform",
    "@vue/repl",
    "@vue/runtime-core",
    "@vue/runtime-dom",
    "@vue/runtime-vapor",
    "@vue/server-renderer",
    "@vue/server-test-utils",
    "@vue/shared",
    "@vue/typescript-plugin",
    "@vue/vue2-jest",
    "@vue/vue3-jest",
    "@vue/web-component-wrapper",
    "@vuedx/template-ast-types",
    "@vuedx/typescript-plugin-vue",
    "@vuepic/vue-datepicker",
    "@vueup/vue-quill",
    "@vueuse/core",
    "@vueuse/motion",
    "@vueuse/router",
    "@vx-foundation/benchmark",
    "@wagmi/vue",
    "@wangeditor-next/upload-image-module",
    "@wangeditor/upload-image-module",
    "@wdio/image-comparison-core",
    "@web-types/vue-router",
    "@wfpena/angular-wysiwyg",
    "@whatwg-node/node-fetch",
    "@whyframe/svelte",
    "@wix/image",
    "@wordpress/image-cropper",
    "@workos-inc/node",
    "@wrongstack/bench",
    "@wuchale/svelte",
    "@wxt-dev/module-svelte",
    "@wxt-dev/module-vue",
    "@xmldom/is-dom-node",
    "@xmtp/node-sdk",
    "@xstate/react",
    "@xstate/svelte",
    "@xstate/vue",
    "@xterm/addon-image",
    "@xyflow/react",
    "@xyflow/svelte",
    "@xyflow/system",
    "@yapyak/svelte",
    "@yoopta/image",
    "@zag-js/image-cropper",
    "@zag-js/svelte",
    "@zag-js/vue",
    "@zhead/schema-vue",
    "@zoom-image/core",
    "@zoom-image/svelte",
    "ab",
    "abp-ng2-module",
    "acc-battle-arena",
    "acorn-node",
    "actioncable-vue",
    "adm-zip",
    "ag-charts-react",
    "ag-charts-types",
    "ag-grid-angular",
    "ag-grid-enterprise",
    "ag-grid-react",
    "ag-grid-vue",
    "ag-grid-vue3",
    "agenda",
    "agent-context-bench",
    "agent-memory-benchmark",
    "agentic-scorecard",
    "agents-svelte",
    "ai",
    "ai-benchmark-solutions-mcp",
    "ajv",
    "angular",
    "angular-2-local-storage",
    "angular-animations",
    "angular-archwizard",
    "angular-aside",
    "angular-auth-oidc-client",
    "angular-auto-focus",
    "angular-benchpress",
    "angular-bootstrap",
    "angular-bootstrap-contextmenu",
    "angular-bootstrap-datetimepicker",
    "angular-bootstrap-multiselect",
    "angular-bootstrap-switch",
    "angular-cache",
    "angular-calendar",
    "angular-captcha",
    "angular-carousel",
    "angular-cc-library",
    "angular-cesium",
    "angular-chosen-localytics",
    "angular-cli-ghpages",
    "angular-code-input",
    "angular-color-picker",
    "angular-confirm",
    "angular-confirmation-popover",
    "angular-cookie",
    "angular-credit-cards",
    "angular-cropperjs",
    "angular-csv-ext",
    "angular-datatables",
    "angular-disable-browser-back-button",
    "angular-drag-and-drop-lists",
    "angular-draggable-droppable",
    "angular-dual-listbox",
    "angular-ellipsis",
    "angular-eslint",
    "angular-estree-parser",
    "angular-expressions",
    "angular-feather",
    "angular-file",
    "angular-file-upload",
    "angular-font-awesome",
    "angular-footable",
    "angular-formio",
    "angular-froala-wysiwyg",
    "angular-fusioncharts",
    "angular-gauge",
    "angular-gettext-cli",
    "angular-gettext-tools",
    "angular-google-charts",
    "angular-google-tag-manager",
    "angular-gridster2",
    "angular-highcharts",
    "angular-hotkeys",
    "angular-html-parser",
    "angular-i18next",
    "angular-iban",
    "angular-ide",
    "angular-ide-loader",
    "angular-imask",
    "angular-in-memory-web-api",
    "angular-ivh-treeview",
    "angular-l10n",
    "angular-ladda",
    "angular-legacy-sortablejs-maintained",
    "angular-line-awesome",
    "angular-load",
    "angular-local-storage",
    "angular-login",
    "angular-material-css-vars",
    "angular-material-expansion-panel",
    "angular-mentions",
    "angular-moment",
    "angular-moment-picker",
    "angular-mydatepicker",
    "angular-ng-autocomplete",
    "angular-ng-stepper",
    "angular-notification-icons",
    "angular-notifier",
    "angular-oauth2-oidc",
    "angular-oauth2-oidc-jwks",
    "angular-odata",
    "angular-ordinal",
    "angular-otp",
    "angular-patternfly",
    "angular-permission",
    "angular-pipes",
    "angular-plotly.js",
    "angular-polyfills",
    "angular-progress-bar",
    "angular-recursion",
    "angular-resizable-element",
    "angular-resize-event",
    "angular-resize-event-package",
    "angular-router-loader",
    "angular-schema-form",
    "angular-server-side-configuration",
    "angular-shepherd",
    "angular-slick-carousel",
    "angular-slickgrid",
    "angular-socket.io-mock",
    "angular-spinner",
    "angular-split",
    "angular-ssr",
    "angular-star-rating",
    "angular-svg-icon",
    "angular-svg-icon-preloader",
    "angular-svg-round-progressbar",
    "angular-tabler-icons",
    "angular-three",
    "angular-three-soba",
    "angular-timer",
    "angular-toastr",
    "angular-translate-loader-pluggable",
    "angular-tree-control",
    "angular-treeview",
    "angular-ui-bootstrap",
    "angular-ui-grid",
    "angular-ui-tinymce",
    "angular-user-idle",
    "angular-web-storage",
    "angular-websocket",
    "angular2-multiselect-dropdown",
    "announcekit-angular",
    "ansi-styles",
    "ansi-to-react",
    "ant-design-vue",
    "antd",
    "api-benchmark",
    "apollo-angular",
    "apollo-server",
    "apparatus",
    "apple-signin-auth",
    "arch",
    "archiver",
    "arg",
    "argon2",
    "assert-node-version",
    "astro",
    "async",
    "async_bench",
    "autoprefixer",
    "ava",
    "avvio",
    "aws-sdk",
    "axios",
    "azure-devops-node-api",
    "ba",
    "babel",
    "babel-helper-vue-jsx-merge-props",
    "babel-plugin-dynamic-import-node",
    "babel-plugin-react-compiler",
    "babel-plugin-react-native-web",
    "babel-plugin-transform-react-remove-prop-types",
    "babel-plugin-transform-vue-jsx",
    "babel-preset-react-app",
    "babel-preset-vue",
    "balena-image-fs",
    "base64-image-loader",
    "bcrypt",
    "bcryptjs",
    "beautify-benchmark",
    "beidou-benchmark",
    "bench-chain",
    "bench-flumelog",
    "bench-it",
    "benchmark",
    "benchmark-cli",
    "benchmark-collector",
    "benchmark-easy",
    "benchmark-es2015",
    "benchmark-fn",
    "benchmark-fn-list",
    "benchmark-javlonbek",
    "benchmark-me",
    "benchmark-octane",
    "benchmark-patterns",
    "benchmarket",
    "benchmarkify",
    "benchmate",
    "benchr",
    "benchrunner",
    "berbix-vue",
    "better-sqlite3",
    "better-svelte-email",
    "betterbenchmarks",
    "bindings",
    "bipbip",
    "bitcoind-latency-benchmark",
    "bitmap-sdf",
    "bits-ui",
    "bluebird",
    "blueimp-load-image",
    "body-parser",
    "bootstrap",
    "bootstrap-icons-vue",
    "bootstrap-vue-next",
    "boxen",
    "broccoli-node-info",
    "browser-benchmark",
    "browser-image-hash",
    "browser-image-size",
    "browser-sync",
    "browserify",
    "browserify-sign",
    "browserstack-node-sdk",
    "buffer-image-size",
    "bull",
    "bullmq",
    "bulma",
    "bun-plugin-svelte",
    "bunyan",
    "calc-image-stats",
    "canvas",
    "capacitor",
    "carbon-components-svelte",
    "carbon-icons-svelte",
    "carbon-pictograms-svelte",
    "carbon-preprocess-svelte",
    "chai",
    "chai-image-assert",
    "chakra-ui",
    "chalk",
    "chart.js",
    "chart.js-image",
    "chartjs-node-canvas",
    "chartjs-to-image",
    "check-error",
    "check-node-version",
    "cheerio",
    "chewbacca",
    "chokidar",
    "ckeditor4-angular",
    "class-transformer",
    "class-validator",
    "classnames",
    "cli-progress-footer",
    "cli-table3",
    "clone-buffer",
    "cls-hooked",
    "clsx",
    "cmelo-angular-sticky",
    "codelyzer",
    "codemirror",
    "color-convert",
    "color-name",
    "colors",
    "commander",
    "commitlint",
    "compress-commons",
    "compression",
    "compressorjs",
    "concurrently",
    "config",
    "connect",
    "consola",
    "controller-benchmark-data",
    "conventional-changelog-angular",
    "convex-angular",
    "convex-vue",
    "convict",
    "cookie-parser",
    "core-js",
    "core-util-is",
    "cors",
    "cpu-benchmark",
    "create-bench",
    "create-hmac",
    "create-react-class",
    "create-react-context",
    "create-svelte-scorm",
    "create-vue",
    "cron",
    "cropperjs",
    "croppie",
    "cross-env",
    "cross-fetch",
    "crud-benchmark",
    "crypto-js",
    "css-to-react-native",
    "csurf",
    "csv-parse",
    "customerio-node",
    "cva",
    "cypress",
    "cypress-benchmark",
    "cypress-image-snapshot",
    "d3",
    "daddy-chill",
    "date-fns",
    "date-picker-svelte",
    "dayjs",
    "debug",
    "decap-cms-editor-component-image",
    "dedent",
    "deep-taxonomy-benchmark",
    "deepl-node",
    "desy",
    "detect-gpu",
    "detective-vue2",
    "dev-null",
    "devextreme-angular",
    "devextreme-vue",
    "dialkit",
    "dir-compare",
    "distill-codes",
    "doc-path",
    "docker-parse-image",
    "docxtemplater-image-module-free",
    "dom-align",
    "dom-node-types",
    "dom-serialize",
    "dom-to-image",
    "dom-to-image-more",
    "dom-walk",
    "dompurify",
    "dotenv",
    "dotenv-expand",
    "dprint-node",
    "dream11-react-native-performance-tracker",
    "drizzle-orm",
    "ebt-vue",
    "echarts",
    "echarts-for-react",
    "edsger",
    "electron",
    "electron-builder",
    "element-plus",
    "elysia",
    "embla-carousel-angular",
    "emnapi",
    "emoji-picker-react",
    "env-var",
    "enzyme-adapter-react-16",
    "error-ex",
    "esbuild",
    "esbuild-plugin-vue",
    "esbuild-register",
    "esbuild-svelte",
    "eslint",
    "eslint-config-angular",
    "eslint-config-react-app",
    "eslint-import-resolver-node",
    "eslint-plugin-prettier-vue",
    "eslint-plugin-react",
    "eslint-plugin-react-hooks",
    "eslint-plugin-react-native",
    "eslint-plugin-react-native-globals",
    "eslint-plugin-rxjs-angular",
    "eslint-plugin-rxjs-angular-updated",
    "eslint-plugin-rxjs-angular-x",
    "eslint-plugin-svelte",
    "eslint-plugin-svelte3",
    "eslint-plugin-vue-composable",
    "eslint-plugin-vue-kuzzle",
    "eslint-plugin-vue-pug",
    "eslint-processor-vue-blocks",
    "eslint-rule-benchmark",
    "esm-resolve",
    "eval",
    "eval-bench",
    "eventemitter3",
    "exceljs",
    "exif-js",
    "exif-reader",
    "expected-node-version",
    "expo",
    "expo-image",
    "expo-image-crop-tool",
    "expo-image-loader",
    "express",
    "express-rate-limit",
    "express-session",
    "extract-zip",
    "falcon-benchmark",
    "fast-glob",
    "fast-image-size",
    "fast-png",
    "fast-react-benchmark",
    "fast-xml-parser",
    "fastbench",
    "fastify",
    "felte",
    "fetch-blob",
    "figlet",
    "filedrop-svelte",
    "filepond-plugin-image-crop",
    "filepond-plugin-image-edit",
    "filepond-plugin-image-exif-orientation",
    "filepond-plugin-image-filter",
    "filepond-plugin-image-preview",
    "filepond-plugin-image-resize",
    "filepond-plugin-image-transform",
    "filepond-plugin-image-validate-size",
    "firebase",
    "firebase-admin",
    "floating-vue",
    "flowbite-svelte",
    "flowbite-svelte-blocks",
    "flowbite-svelte-icons",
    "fm-bench",
    "focus-trap",
    "focus-trap-react",
    "focus-trap-vue",
    "formdata-polyfill",
    "formik",
    "framer-motion",
    "framework7-svelte",
    "fs-constants",
    "fs-extra",
    "fuzzy",
    "fx-runner",
    "gatsby-node-helpers",
    "gatsby-plugin-benchmark-reporting",
    "gemba-benchmark",
    "generate-function",
    "generator-karma-benchmark",
    "geotiff",
    "get-orientation",
    "get-pixels",
    "get-root-node-polyfill",
    "git-node-fs",
    "glob",
    "glob-all",
    "globby",
    "gojs-angular",
    "google-image-chart",
    "got",
    "governancebench",
    "gpt-3-encoder",
    "gpteam",
    "grapesjs-tui-image-editor",
    "graphql",
    "graphql-yoga",
    "grav-svelte",
    "gray-matter",
    "gridjs-svelte",
    "grunt-angular-gettext",
    "grunt-angular-translate",
    "grunt-api-benchmark",
    "grunt-benchmark",
    "guess-image-layout",
    "gulp-analyze-css",
    "gulp-bench",
    "gulp-benchmark",
    "gymrat",
    "hapi",
    "happy-dom",
    "hast-util-is-element",
    "hast-util-to-jsx-runtime",
    "hast-util-whitespace",
    "hcicons-svelte",
    "helmet",
    "help-me",
    "heroicons-svelte",
    "highcharts-angular",
    "highcharts-react-official",
    "highcharts-vue",
    "highlight.js",
    "highlightjs-svelte",
    "hoist-non-react-statics",
    "hono",
    "houdini-svelte",
    "html-react-parser",
    "html-to-image",
    "html-validate-angular",
    "html-validate-vue",
    "htmlparser-benchmark",
    "htmlparser2-benchmark",
    "htmlparser2-svelte",
    "http-parser-js",
    "http-server",
    "hud-sdk",
    "husky",
    "husky-init",
    "i18next-cli-plugin-svelte",
    "i18next-vue",
    "iconsax-svelte",
    "idle-vue",
    "igniteui-angular",
    "igniteui-angular-core",
    "igniteui-angular-i18n",
    "image",
    "image-blob-reduce",
    "image-client-api",
    "image-conversion",
    "image-dimensions",
    "image-downloader",
    "image-extensions",
    "image-hash",
    "image-js",
    "image-map",
    "image-map-resizer",
    "image-meta",
    "image-palette",
    "image-pixels",
    "image-q",
    "image-size",
    "image-ssim",
    "image-thumbnail",
    "image-to-base64",
    "image-to-pdf",
    "image-type",
    "image-webpack-loader",
    "image2uri",
    "imagescript",
    "imapflow",
    "img-loader",
    "immer",
    "inertiax-svelte",
    "ingot-scan",
    "ini",
    "init-package-json",
    "ink",
    "ink-image",
    "inquirer",
    "io-ts",
    "iobroker.benchmark",
    "ion-icon-angular-standalone",
    "ionic-angular",
    "ioredis",
    "ipx",
    "is-arrayish",
    "is-bun-module",
    "is-gif",
    "is-image",
    "is-node",
    "is-png",
    "is-reference",
    "is-type-of",
    "iso-bench",
    "isomorphic-benchmark",
    "isomorphic-dompurify",
    "isomorphic-fetch",
    "isomorphic-unfetch",
    "jasmine",
    "jasmine-node",
    "jbr",
    "jest",
    "jest-bench",
    "jest-image-snapshot",
    "jest-performance",
    "jest-preset-angular",
    "jest-serializer-vue",
    "jest-serializer-vue-tjw",
    "jimp",
    "jodit-vue",
    "joi",
    "jose",
    "jotai",
    "js-beautify",
    "js-data-angular",
    "js-framework-benchmark-utils",
    "js-image-generator",
    "js-sdsl",
    "js-yaml",
    "jsbench",
    "jsdom",
    "json-editor-vue",
    "json-to-pretty-yaml",
    "jsonwebtoken",
    "jw-vue-pagination",
    "karma",
    "karma-angular",
    "karma-benchmark",
    "karma-benchmark-json-reporter",
    "karma-benchmark-reporter",
    "karma-benchmarkjs-reporter",
    "karma-falcon-benchmark",
    "karma-falcon-benchmark-reporter",
    "keycloak-angular",
    "kleur",
    "knex",
    "koa",
    "ky",
    "langchain",
    "laravel-precognition-vue",
    "laravel-vue-i18n",
    "launchdarkly-react-client-sdk",
    "lazy",
    "lazystream",
    "leaflet",
    "leb",
    "lei-benchmark",
    "less",
    "lilibench",
    "linkedom",
    "linkify-react",
    "lint-staged",
    "live-server",
    "llm-benchmark",
    "llm-gateway-benchmark",
    "localtunnel",
    "lodash",
    "log4js",
    "loglevel",
    "loopbench",
    "lottie-react-native",
    "lucide-react",
    "lucide-react-native",
    "luxon",
    "luxon-angular",
    "m3-svelte",
    "makiwara",
    "mapbox-gl",
    "markdown-it",
    "marked",
    "markerjs2",
    "markuplint-angular-parser",
    "maska",
    "matcha",
    "material-ui-image",
    "mcp-image",
    "mcp-svelte-docs",
    "mcpbr-claude-plugin",
    "mcpbr-cli",
    "md5.js",
    "mdast-util-phrasing",
    "mdast-util-to-string",
    "mdsvex",
    "metascraper-image",
    "meteor-node-stubs",
    "methods",
    "metrillm-mcp",
    "micron-runner",
    "minimatch",
    "minimist",
    "mitata",
    "mithril-node-render",
    "mjml-image",
    "mn-angular-lib",
    "mobx",
    "mobx-angular",
    "mobx-react",
    "mobx-react-lite",
    "mocha",
    "modern-screenshot",
    "moment",
    "monaco-editor",
    "mongodb",
    "mongoose",
    "morgan",
    "motion-plus-vue",
    "motion-sv",
    "msgpackr-extract",
    "msw",
    "multer",
    "muta-bench",
    "my-node-fp",
    "mysql",
    "mysql2",
    "n8n-nodes-serpapi",
    "nan",
    "nano-benchmark",
    "nanoid",
    "nanostores",
    "nestjs-benchmark",
    "next",
    "next-sanity-image",
    "ng-apexcharts",
    "ng-block-ui",
    "ng-flex-layout",
    "ng-image-slider",
    "ng-lazyload-image",
    "ng-multiselect-dropdown",
    "ng-openapi-gen",
    "ng-packagr",
    "ng-pick-datetime",
    "ng-recaptcha",
    "ng-table-virtual-scroll",
    "ng2-charts",
    "ng2-ckeditor",
    "ng2-date-picker",
    "ng2-file-upload",
    "ng2-pdf-viewer",
    "ngcomponent",
    "ngrok",
    "ngx-angular-query-builder",
    "ngx-bootstrap",
    "ngx-build-plus",
    "ngx-captcha",
    "ngx-chips",
    "ngx-clipboard",
    "ngx-color-picker",
    "ngx-colors",
    "ngx-cookie",
    "ngx-cookie-service",
    "ngx-doc-viewer",
    "ngx-image-cropper",
    "ngx-image-zoom",
    "ngx-json-viewer",
    "ngx-mat-select-search",
    "ngx-material-timepicker",
    "ngx-moment",
    "ngx-monaco-editor-v2",
    "ngx-owl-carousel-o",
    "ngx-pagination",
    "ngx-permissions",
    "ngx-pipes",
    "ngx-quill",
    "ngx-skeleton-loader",
    "ngx-socket-io",
    "ngx-stripe",
    "ngx-tiptap",
    "ngx-window-token",
    "ngxtension",
    "ngy-cookie",
    "nock",
    "node",
    "node-abi",
    "node-abort-controller",
    "node-addon-api",
    "node-addon-native-custom-loader",
    "node-addon-require-builtin",
    "node-api-dotnet",
    "node-api-headers",
    "node-api-version",
    "node-asm-benchmark",
    "node-bin-darwin-arm64",
    "node-bin-setup",
    "node-bourbon",
    "node-cache",
    "node-cleanup",
    "node-cron",
    "node-darwin-x64",
    "node-datachannel",
    "node-docker-api",
    "node-dogstatsd",
    "node-edge-tts",
    "node-esapi",
    "node-excel-export",
    "node-exec-path",
    "node-exports-info",
    "node-fetch",
    "node-fetch-cache",
    "node-fetch-retry",
    "node-fingerprint",
    "node-forge",
    "node-fs",
    "node-fzf",
    "node-geocoder",
    "node-gyp-build",
    "node-gyp-build-optional-packages",
    "node-hook",
    "node-html-markdown",
    "node-idevice",
    "node-ipinfo",
    "node-jq",
    "node-libs-browser",
    "node-libs-browser-okam",
    "node-libs-react-native",
    "node-linux-arm64",
    "node-linux-ppc64le",
    "node-linux-x64",
    "node-loader",
    "node-opcua",
    "node-opcua-crypto",
    "node-opcua-pki",
    "node-opcua-service-register-node",
    "node-pop3",
    "node-range",
    "node-readable-to-web-readable-stream",
    "node-red-admin",
    "node-red-contrib-chartjs",
    "node-red-contrib-config",
    "node-red-contrib-message-counter",
    "node-red-contrib-opcua",
    "node-red-contrib-play-audio",
    "node-red-contrib-s7",
    "node-red-contrib-s7comm",
    "node-red-contrib-simpletime",
    "node-red-node-email",
    "node-red-node-mysql",
    "node-red-node-rbe",
    "node-red-node-smooth",
    "node-red-node-sqlite",
    "node-red-node-test-helper",
    "node-red-node-ui-table",
    "node-redis-pubsub",
    "node-resque",
    "node-rest-client",
    "node-sass-magic-importer",
    "node-schedule",
    "node-source-walk",
    "node-sql-parser",
    "node-static",
    "node-statsd",
    "node-stdlib-browser",
    "node-stream",
    "node-trilateration",
    "node-version",
    "node-version-call-local",
    "node-version-compare",
    "node-version-utils",
    "node-vibrant",
    "node-win-x64",
    "node-zip",
    "nodejs-package-benchmark",
    "nodemailer",
    "nodemon",
    "normalize-url",
    "npm-benchmark-ts",
    "npm-run-all",
    "ns-elapsed",
    "nuqs-svelte",
    "nuxt",
    "nuxt-og-image",
    "nx",
    "nxt-sortablejs",
    "object-hash",
    "object-inspect",
    "odbc",
    "odiff-bin",
    "ofetch",
    "office-addin-node-debugger",
    "ollama",
    "ollama-bench",
    "openai",
    "openapi-fetch",
    "openrunner",
    "opentelemetry-instrumentation-fetch-node",
    "ora",
    "orbit-db-benchmark-runner",
    "overlayscrollbars-ngx",
    "overlayscrollbars-react",
    "overlayscrollbars-svelte",
    "overlayscrollbars-vue",
    "overtake",
    "oxc-minify",
    "oxc-parser",
    "oxc-resolver",
    "oxc-transform",
    "oxlint-plugin-react-doctor",
    "p-limit",
    "p-queue",
    "p-retry",
    "pagespeed-benchmark",
    "pandadoc-node-client",
    "papaparse",
    "parcel",
    "passport",
    "passport-jwt",
    "passport-local",
    "path-browserify",
    "path-to-regexp",
    "pdf-creator-node",
    "pdf-lib",
    "pdf-viewer-vue",
    "pdfkit",
    "pdfobject-vue",
    "petite-vue-i18n",
    "pg",
    "pg-cursor",
    "pg-pool",
    "pg-types",
    "pg-vector-selector-benchmark",
    "phosphor-svelte",
    "pica",
    "picocolors",
    "picomatch",
    "pinia",
    "pino",
    "pinus-robot",
    "piral-svelte",
    "pixelmatch",
    "playwright",
    "playwright-ng-schematics",
    "please-upgrade-node",
    "plotly.js",
    "pm2",
    "pn",
    "pngjs-image",
    "polka",
    "polyfill",
    "portal-vue",
    "postcss",
    "postcss-angular",
    "postcss-image-set-function",
    "postcss-image-set-polyfill",
    "powerbi-client-angular",
    "preact",
    "prettier",
    "prettier-plugin-svelte",
    "prism-react-renderer",
    "prism-svelte",
    "prisma",
    "prismjs",
    "probe-image-size",
    "promisify-node",
    "prompts",
    "prosemirror-image-plugin",
    "prosemirror-resizable-view",
    "prosemirror-trailing-node",
    "punch-bench",
    "puppeteer",
    "qrcode.react",
    "qrcode.vue",
    "qs",
    "query-string",
    "quill-image-drop-and-paste",
    "quill-resize-image",
    "radix-icons-svelte",
    "radix-vue",
    "raf",
    "ramda",
    "random-benchmark",
    "rastermill",
    "rax-image",
    "razorpay",
    "rc-image",
    "rc-mentions",
    "rc-select",
    "rc-tooltip",
    "react",
    "react-ace",
    "react-alice-carousel",
    "react-aria",
    "react-aria-components",
    "react-async-script",
    "react-autosuggest",
    "react-barcode",
    "react-base16-styling",
    "react-bootstrap",
    "react-boxplot",
    "react-calendar",
    "react-calendar-timeline",
    "react-calendly",
    "react-chartjs-2",
    "react-codemirror2",
    "react-compiler-runtime",
    "react-confetti",
    "react-cookie",
    "react-copy-to-clipboard",
    "react-countdown",
    "react-countup",
    "react-cropper",
    "react-custom-scrollbars",
    "react-custom-scrollbars-2",
    "react-datepicker",
    "react-day-picker",
    "react-debounce-input",
    "react-dev-utils",
    "react-devtools-core",
    "react-devtools-inline",
    "react-dnd",
    "react-dnd-html5-backend",
    "react-docgen-typescript",
    "react-doctor",
    "react-dom",
    "react-draggable",
    "react-easy-crop",
    "react-easy-router",
    "react-error-boundary",
    "react-fast-compare",
    "react-feather",
    "react-filerobot-image-editor",
    "react-firebase-hooks",
    "react-flags-select",
    "react-flatpickr",
    "react-freeze",
    "react-ga",
    "react-ga4",
    "react-google-autocomplete",
    "react-google-button",
    "react-google-charts",
    "react-google-recaptcha",
    "react-grid-layout",
    "react-gtm-module",
    "react-helmet",
    "react-helmet-async",
    "react-hook-form",
    "react-hot-loader",
    "react-hot-toast",
    "react-hotkeys-hook",
    "react-html-parser",
    "react-i18next",
    "react-icons",
    "react-image",
    "react-image-annotation",
    "react-image-crop",
    "react-image-fallback",
    "react-image-gallery",
    "react-image-magnify",
    "react-image-zooom",
    "react-imask",
    "react-immutable-pure-component",
    "react-infinite-scroller",
    "react-inlinesvg",
    "react-inner-image-zoom",
    "react-innertext",
    "react-input-autosize",
    "react-input-mask",
    "react-inspector",
    "react-instantsearch",
    "react-international-phone",
    "react-intl",
    "react-is",
    "react-json-tree",
    "react-json-view",
    "react-jss",
    "react-jsx-parser",
    "react-kapsule",
    "react-konva",
    "react-leaflet",
    "react-leaflet-cluster",
    "react-leaflet-markercluster",
    "react-lifecycles-compat",
    "react-lottie",
    "react-mark-image",
    "react-markdown",
    "react-measure",
    "react-medium-image-zoom",
    "react-merge-refs",
    "react-moment-proptypes",
    "react-monaco-editor",
    "react-native",
    "react-native-appsflyer",
    "react-native-auto-height-image",
    "react-native-calendars",
    "react-native-color-matrix-image-filters",
    "react-native-device-info",
    "react-native-drawer-layout",
    "react-native-fast-image",
    "react-native-fit-image",
    "react-native-fs",
    "react-native-gesture-image-viewer",
    "react-native-image-colors",
    "react-native-image-modal",
    "react-native-image-pan-zoom",
    "react-native-image-zoom-viewer",
    "react-native-is-edge-to-edge",
    "react-native-keychain",
    "react-native-maps",
    "react-native-mmkv",
    "react-native-modal",
    "react-native-nitro-image",
    "react-native-pager-view",
    "react-native-paper",
    "react-native-performance",
    "react-native-qrcode-svg",
    "react-native-react-query-devtools",
    "react-native-reanimated",
    "react-native-screens",
    "react-native-svg",
    "react-native-svg-transformer",
    "react-native-tab-view",
    "react-native-toast-message",
    "react-native-turbo-image",
    "react-native-url-polyfill",
    "react-native-web",
    "react-native-web-image-loader",
    "react-native-webrtc",
    "react-native-worklets",
    "react-node-resolver",
    "react-number-format",
    "react-onclickoutside",
    "react-pdf",
    "react-phone-number-input",
    "react-plaid-link",
    "react-plotly.js",
    "react-popper",
    "react-popper-tooltip",
    "react-portal",
    "react-progressive-image",
    "react-promise-suspense",
    "react-prop-types",
    "react-property",
    "react-qr-code",
    "react-query",
    "react-quill",
    "react-reconciler",
    "react-redux",
    "react-refractor",
    "react-refresh",
    "react-remove-scroll",
    "react-render-image",
    "react-resizable-panels",
    "react-resize-detector",
    "react-responsive",
    "react-responsive-carousel",
    "react-rnd",
    "react-router",
    "react-router-bootstrap",
    "react-router-config",
    "react-router-dom",
    "react-rx",
    "react-scan",
    "react-scripts",
    "react-select-event",
    "react-shallow-renderer",
    "react-share",
    "react-shiki",
    "react-signature-canvas",
    "react-simple-animate",
    "react-simple-image-viewer",
    "react-slick",
    "react-slider",
    "react-slideshow-image",
    "react-smooth",
    "react-spinners",
    "react-stately",
    "react-strict-dom",
    "react-string-replace",
    "react-swipeable",
    "react-switch",
    "react-syntax-highlighter",
    "react-table",
    "react-test-renderer",
    "react-textarea-autosize",
    "react-to-print",
    "react-toastify",
    "react-tooltip",
    "react-tracking",
    "react-transition-group",
    "react-transition-state",
    "react-universal-interface",
    "react-use",
    "react-use-svelte-store",
    "react-use-websocket",
    "react-virtualized",
    "react-virtualized-auto-sizer",
    "react-virtuoso",
    "react-webcam",
    "react-window",
    "react-zdog",
    "read",
    "recharts",
    "rechoir",
    "redis",
    "redux",
    "regenerator-runtime",
    "rehype",
    "rehype-react",
    "reka-ui",
    "relia-prompt",
    "remark",
    "remixicon-svelte",
    "renderkid",
    "reprokit-cli",
    "request",
    "resize-image-data",
    "response-iterator",
    "restify",
    "rimraf",
    "rive-react-native",
    "rollup",
    "rollup-plugin-node-builtins",
    "rollup-plugin-node-polyfills",
    "rollup-plugin-polyfill-node",
    "rollup-plugin-svelte",
    "rollup-plugin-vue",
    "rspack-vue-loader",
    "rxjs",
    "rxjs-compat",
    "saagar-operant-mcp",
    "sanitize-html",
    "sanity-image",
    "sass",
    "sc-benchmark",
    "sc-benchmark-new-job",
    "semaphore",
    "semmet-angular",
    "semver",
    "sendgrid",
    "sequelize",
    "sequelize-benchmark",
    "serve",
    "sharp",
    "shiki",
    "shx",
    "siege",
    "signale",
    "simple-benchmark",
    "simple-lru-cache",
    "simple-svelte-autocomplete",
    "simplebar-angular",
    "simplebar-react",
    "simplebar-vue",
    "single-spa-angular",
    "sinon",
    "slack-node",
    "slate-dev-benchmark",
    "slate-react",
    "slickgrid-vue",
    "smartcrop",
    "smui-theme",
    "soap",
    "socket.io",
    "socket.io-client",
    "solid-js",
    "solidbench",
    "sparql-benchmark-runner",
    "speedy",
    "splaytree",
    "spyd",
    "sqlite3",
    "sqs-consumer",
    "ssh2-sftp-client",
    "sswr",
    "statsig-node-vercel",
    "steal-benchmark",
    "stimulsoft-designer-angular",
    "stimulsoft-viewer-angular",
    "storybook",
    "storybook-addon-vue-mdx",
    "storybook-addon-vue-slots",
    "storybook-react-rsbuild",
    "stream-browserify",
    "streamdown-svelte",
    "string_decoder",
    "strip-ansi",
    "stripe",
    "stripe-angular",
    "styled-components",
    "stylelint",
    "stylelint-config-recommended-vue",
    "stylelint-config-standard-vue",
    "superagent",
    "superstruct",
    "supertest",
    "supplychain-firewall-benchmark-hello",
    "supports-color",
    "supports-preserve-symlinks-flag",
    "suspend-react",
    "sv",
    "sv-typewriter",
    "svelte",
    "svelte-5-french-toast",
    "svelte-accessible-dialog",
    "svelte-ace",
    "svelte-agnostic-draggable",
    "svelte-aos",
    "svelte-ast-print",
    "svelte-autosize",
    "svelte-awesome",
    "svelte-awesome-icons",
    "svelte-body",
    "svelte-bootstrap-icons",
    "svelte-bootstrap-svg-icons",
    "svelte-boxicons",
    "svelte-bricks",
    "svelte-calendar",
    "svelte-canvas",
    "svelte-carousel",
    "svelte-chartjs",
    "svelte-check",
    "svelte-check-native",
    "svelte-check-plugin",
    "svelte-check-rs",
    "svelte-clerk",
    "svelte-codemirror-editor",
    "svelte-codicons",
    "svelte-command",
    "svelte-common",
    "svelte-confetti",
    "svelte-copy",
    "svelte-countdown",
    "svelte-cryptocurrency-icons",
    "svelte-dev-helper",
    "svelte-dnd-action",
    "svelte-dnd-list",
    "svelte-droplet",
    "svelte-dropzone-runes",
    "svelte-easy-crop",
    "svelte-echarts",
    "svelte-email",
    "svelte-embla",
    "svelte-entitlement",
    "svelte-eslint-parser",
    "svelte-exmarkdown",
    "svelte-extras",
    "svelte-fa",
    "svelte-fast-check",
    "svelte-fast-marquee",
    "svelte-feather-icons",
    "svelte-file-dropzone",
    "svelte-filepond",
    "svelte-flatpickr",
    "svelte-floating-attach",
    "svelte-floating-ui",
    "svelte-forms",
    "svelte-forms-lib",
    "svelte-fragment-component",
    "svelte-frappe-charts",
    "svelte-french-toast",
    "svelte-fullcalendar",
    "svelte-gauge",
    "svelte-geolocation",
    "svelte-gestures",
    "svelte-grid",
    "svelte-grid-extended",
    "svelte-guard-history-router",
    "svelte-headless-table",
    "svelte-headlessui",
    "svelte-headroom",
    "svelte-healthicons",
    "svelte-hero-icons",
    "svelte-heros-v2",
    "svelte-highlight",
    "svelte-hmr",
    "svelte-htm",
    "svelte-hyperscript",
    "svelte-i18n",
    "svelte-i18next",
    "svelte-icon",
    "svelte-icons",
    "svelte-icons-pack",
    "svelte-idle",
    "svelte-infinite",
    "svelte-infinite-loading",
    "svelte-infinite-scroll",
    "svelte-input-mask",
    "svelte-inspect-value",
    "svelte-intercom",
    "svelte-inview",
    "svelte-ionicons",
    "svelte-jest",
    "svelte-jester",
    "svelte-json-tree",
    "svelte-json-tree-auto",
    "svelte-keyed",
    "svelte-konva",
    "svelte-language-server",
    "svelte-leafletjs",
    "svelte-legos",
    "svelte-lexical",
    "svelte-lib-helpers",
    "svelte-lightbox",
    "svelte-loadable",
    "svelte-loader",
    "svelte-loading-spinners",
    "svelte-local-storage-store",
    "svelte-log-view",
    "svelte-lucide",
    "svelte-maplibre",
    "svelte-maplibre-gl",
    "svelte-markdoc-preprocess",
    "svelte-markdown",
    "svelte-marked",
    "svelte-material-icons",
    "svelte-material-ui",
    "svelte-media-queries",
    "svelte-meta-tags",
    "svelte-migrate",
    "svelte-mock",
    "svelte-modals",
    "svelte-motion",
    "svelte-multiselect",
    "svelte-navigator",
    "svelte-navigator-no-postinstall",
    "svelte-notifications",
    "svelte-observable",
    "svelte-outside",
    "svelte-overflow-fade",
    "svelte-paginate",
    "svelte-parallax",
    "svelte-parse",
    "svelte-parse-markup",
    "svelte-pdf",
    "svelte-persisted-state",
    "svelte-persisted-store",
    "svelte-popperjs",
    "svelte-portal",
    "svelte-preprocess",
    "svelte-preprocess-cssmodules",
    "svelte-preprocess-esbuild",
    "svelte-preprocess-filter",
    "svelte-preprocess-markdown",
    "svelte-preprocess-react",
    "svelte-preprocess-sass",
    "svelte-prism",
    "svelte-radix",
    "svelte-render",
    "svelte-render-scan",
    "svelte-repository-provider",
    "svelte-resize-observer",
    "svelte-resize-observer-action",
    "svelte-routing",
    "svelte-scrollto",
    "svelte-search",
    "svelte-select",
    "svelte-seo",
    "svelte-sequential-preprocessor",
    "svelte-shaker",
    "svelte-simple-modal",
    "svelte-sitemap",
    "svelte-skeleton",
    "svelte-sonner",
    "svelte-sound",
    "svelte-spa-router",
    "svelte-state-renderer",
    "svelte-steps",
    "svelte-streamdown",
    "svelte-stripe",
    "svelte-subscribe",
    "svelte-switch-case",
    "svelte-tabs",
    "svelte-tags-input",
    "svelte-tel-input",
    "svelte-themes",
    "svelte-time",
    "svelte-time-picker",
    "svelte-tiny-virtual-list",
    "svelte-tiptap",
    "svelte-to-html",
    "svelte-toolbelt",
    "svelte-transition",
    "svelte-turnstile",
    "svelte-tweakpane-ui",
    "svelte-typewriter",
    "svelte-untitled-ui-icons",
    "svelte-use-form",
    "svelte-use-mousetrap",
    "svelte-vega",
    "svelte-virtual",
    "svelte-virtual-scroll-list",
    "svelte-watch-resize",
    "svelte-waypoint",
    "svelte-websocket-store",
    "svelte-widgets",
    "svelte-writable-derived",
    "svelte2tsx",
    "sveltedoc-parser",
    "sveltekit-image-optimize",
    "svelty-email",
    "svg-to-svelte",
    "svg-to-vue",
    "swc",
    "swc-node",
    "swr",
    "tabbable",
    "tachometer",
    "tailwindcss",
    "tanstack-table-8-svelte-5",
    "tap",
    "tar",
    "tauri",
    "tdesign-icons-vue",
    "tdesign-icons-vue-next",
    "tdesign-mobile-vue",
    "tdesign-vue",
    "tdesign-vue-next",
    "testing-library",
    "text-to-image",
    "the-benchmark",
    "thirty-two",
    "three",
    "three-blocks-benchmark",
    "tiktoken",
    "tiktoken-rs-node",
    "tinyexec",
    "tiptap-extension-resizable-image",
    "tiptap-extension-resize-image",
    "toml",
    "topaz-node",
    "touch",
    "toxiproxy-node-client",
    "tree-sitter-svelte",
    "ts-benchmark",
    "ts-images",
    "ts-node",
    "ts-timeframe",
    "ts-tqdm",
    "tsconfig-paths",
    "tslib",
    "tslint-angular",
    "tsup",
    "tsx",
    "tty-table",
    "tunnel",
    "turbo",
    "twilio",
    "twoslash-vue",
    "typeorm",
    "typescript",
    "typescript-svelte-plugin",
    "umzug",
    "unbzip2-stream",
    "underscore",
    "undici",
    "unipile-node-sdk",
    "unist-util-find-after",
    "unist-util-find-all-after",
    "unist-util-generated",
    "unist-util-is",
    "unist-util-position",
    "unist-util-position-from-estree",
    "unist-util-stringify-position",
    "universal-github-app-jwt",
    "unleash-client",
    "unpic",
    "unplugin-vue",
    "unplugin-vue-components",
    "unplugin-vue-define-options",
    "unplugin-vue-macros",
    "unplugin-vue-markdown",
    "unplugin-vue-setup-extend-plus",
    "unrs-resolver",
    "unzipper",
    "ur-agent",
    "url-parse",
    "utb",
    "util-promisify",
    "util.promisify",
    "uuid",
    "uuid4",
    "v-code-diff",
    "v-tooltip",
    "valibot",
    "validate-image-type",
    "valtio",
    "vant",
    "vaul",
    "vaul-vue",
    "vega-canvas",
    "viberuler",
    "viewerjs",
    "viser-vue",
    "vite",
    "vite-plugin-image-optimizer",
    "vite-plugin-node",
    "vite-plugin-svelte-md",
    "vite-plugin-vue-devtools",
    "vite-plugin-vue-inspector",
    "vite-plugin-vue-layouts",
    "vite-plugin-vue-layouts-next",
    "vite-plugin-vue-tracer",
    "vite-svg-loader",
    "vitepress",
    "vitest",
    "vitest-browser-angular",
    "vitest-browser-react",
    "vitest-browser-svelte",
    "vitest-browser-vue",
    "vscode-languageserver",
    "vscode-languageserver-textdocument",
    "vscode-languageserver-types",
    "vue",
    "vue-3-slider-component",
    "vue-amap",
    "vue-async-computed",
    "vue-at",
    "vue-autosuggest",
    "vue-awesome-paginate",
    "vue-awesome-swiper",
    "vue-barcode-reader",
    "vue-bundle-renderer",
    "vue-cal",
    "vue-cesium",
    "vue-chart-3",
    "vue-chartkick",
    "vue-chrts",
    "vue-clamp",
    "vue-class-component",
    "vue-cli-plugin-apollo",
    "vue-cli-plugin-bootstrap-vue",
    "vue-cli-plugin-i18n",
    "vue-cli-plugin-styleguidist",
    "vue-cli-plugin-tailwind",
    "vue-cli-plugin-vuetify",
    "vue-cli-service",
    "vue-click-outside",
    "vue-client-only",
    "vue-clipboard3",
    "vue-codemirror",
    "vue-codemod",
    "vue-color",
    "vue-color-kit",
    "vue-component-meta",
    "vue-component-type-helpers",
    "vue-composable",
    "vue-confetti",
    "vue-confetti-explosion",
    "vue-country-code",
    "vue-country-flag",
    "vue-country-flag-next",
    "vue-cropper",
    "vue-cropperjs",
    "vue-css-donut-chart",
    "vue-date-pick",
    "vue-debounce",
    "vue-demi",
    "vue-diff",
    "vue-dndrop",
    "vue-docgen-api",
    "vue-docgen-loader",
    "vue-drag-resize",
    "vue-draggable-next",
    "vue-draggable-plus",
    "vue-dragscroll",
    "vue-easytable",
    "vue-electron",
    "vue-email",
    "vue-eslint-parser",
    "vue-events",
    "vue-facing-decorator",
    "vue-feather",
    "vue-filepond",
    "vue-final-modal",
    "vue-flag-icon",
    "vue-flexmonster",
    "vue-form-wizard",
    "vue-frag",
    "vue-froala-wysiwyg",
    "vue-full-calendar",
    "vue-github-buttons",
    "vue-global-events",
    "vue-google-autocomplete",
    "vue-grid-layout",
    "vue-gtag",
    "vue-gtag-next",
    "vue-highcharts",
    "vue-hot-reload-api",
    "vue-hotjar",
    "vue-hotjar-next",
    "vue-html-loader",
    "vue-html2canvas",
    "vue-html2pdf",
    "vue-i18n-bridge",
    "vue-i18n-composable",
    "vue-i18n-extract",
    "vue-image-crop-upload",
    "vue-imask",
    "vue-inbrowser-compiler-independent-utils",
    "vue-inbrowser-compiler-utils",
    "vue-input-otp",
    "vue-instantsearch",
    "vue-intl",
    "vue-jest",
    "vue-jscodeshift-adapter",
    "vue-json-editor",
    "vue-konva",
    "vue-lazyload",
    "vue-letter",
    "vue-loader",
    "vue-lottie",
    "vue-ls",
    "vue-macros",
    "vue-markdown",
    "vue-markdown-render",
    "vue-material-design-icons",
    "vue-metamorph",
    "vue-monthly-picker",
    "vue-mq",
    "vue-multianalytics",
    "vue-multiselect",
    "vue-native-websocket",
    "vue-no-ssr",
    "vue-papa-parse",
    "vue-parser",
    "vue-pdf-app",
    "vue-pdf-embed",
    "vue-perfect-scrollbar",
    "vue-phone-number-input",
    "vue-plugin-load-script",
    "vue-pluralize",
    "vue-plyr",
    "vue-prism-component",
    "vue-progressbar",
    "vue-property-decorator",
    "vue-qr",
    "vue-qrcode",
    "vue-query",
    "vue-quill",
    "vue-quill-editor",
    "vue-quilly",
    "vue-recaptcha",
    "vue-recaptcha-v3",
    "vue-router",
    "vue-runtime-helpers",
    "vue-rx",
    "vue-safe-html",
    "vue-screen-utils",
    "vue-select",
    "vue-server-renderer",
    "vue-sfc-transformer",
    "vue-shadow-dom",
    "vue-shepherd",
    "vue-showdown",
    "vue-simple-calendar",
    "vue-skeletor",
    "vue-slick",
    "vue-slick-carousel",
    "vue-slide-up-down",
    "vue-smooth-dnd",
    "vue-smooth-reflow",
    "vue-spinner",
    "vue-splitpane",
    "vue-star-rating",
    "vue-stripe-js",
    "vue-styleguidist",
    "vue-svg-loader",
    "vue-svgicon",
    "vue-sweetalert2",
    "vue-tel-input",
    "vue-template-babel-compiler",
    "vue-template-compiler",
    "vue-template-es2015-compiler",
    "vue-test-utils-compat",
    "vue-text-mask",
    "vue-timeago",
    "vue-tippy",
    "vue-toastification",
    "vue-ts-morph",
    "vue-ts-types",
    "vue-tsc",
    "vue-turbolinks",
    "vue-turnstile",
    "vue-types",
    "vue-uuid",
    "vue-video-player",
    "vue-virtual-scroll-list",
    "vue-wait",
    "vue3-carousel",
    "vue3-click-away",
    "vuedraggable",
    "vuetify",
    "vuex",
    "w-component-vue",
    "wait-on",
    "walk",
    "web-tooling-benchmark",
    "web-tooling-benchmark-generator",
    "web-worker",
    "webgl-benchmark",
    "webpack",
    "webpack-notifier",
    "webpacker-svelte",
    "why-is-node-running",
    "winston",
    "winston-transport-sentry-node",
    "wonder-benchmark",
    "wrap-ansi",
    "ws",
    "xendit-node",
    "xero-node",
    "xlsx",
    "xml-encryption",
    "xml2js",
    "xmlhttprequest",
    "xmlhttprequest-ssl",
    "xterm-benchmark",
    "yaml",
    "yargs",
    "yauzl",
    "yazl",
    "ybm",
    "yet-another-react-lightbox",
    "yup",
    "zod",
    "zustand"
  ]
};

// src/threat/store.js
var import_semver = __toESM(require_semver2(), 1);
import path5 from "node:path";
import fs4 from "node:fs";

// src/threat/paths.js
import fs3 from "node:fs";
import os from "node:os";
import path3 from "node:path";
import { fileURLToPath } from "node:url";
var DAY = 864e5;
var REPOSITORY = "https://github.com/subhashdasyam/guardrails-js.git";
function dataRoot() {
  return path3.join(process.env.CLAUDE_PLUGIN_DATA || path3.join(os.homedir(), ".claude/plugins/data/guardrails-js"), "threat");
}
function pluginRoot() {
  let dir = path3.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (fs3.existsSync(path3.join(dir, "hooks/hooks.json"))) return dir;
    dir = path3.dirname(dir);
  }
  throw new Error("Cannot locate guardrails-js plugin files");
}
function readJson2(file, fallback = null) {
  try {
    return JSON.parse(fs3.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs3.mkdirSync(path3.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs3.writeFileSync(temp, JSON.stringify(data, null, 2) + "\n");
  fs3.renameSync(temp, file);
}
function snapshot() {
  if (process.env.GUARDRAILS_THREAT_SNAPSHOT) {
    const dir2 = path3.resolve(process.env.GUARDRAILS_THREAT_SNAPSHOT);
    return { file: path3.join(dir2, "threat-data.db"), metadata: readJson2(path3.join(dir2, "manifest.json")) };
  }
  const root = dataRoot();
  const active = readJson2(path3.join(root, "active.json"));
  if (active && /^[a-f0-9]{64}$/.test(active.sha256)) {
    const file = path3.join(root, "snapshots", active.sha256, "threat-data.db");
    if (fs3.existsSync(file)) return { file, metadata: active };
  }
  const dir = path3.join(pluginRoot(), "data");
  return { file: path3.join(dir, "threat-data.db"), metadata: readJson2(path3.join(dir, "manifest.json")) };
}
function lock(file, leaseMs = 20 * 6e4) {
  fs3.mkdirSync(path3.dirname(file), { recursive: true });
  try {
    if (Date.now() - fs3.statSync(file).mtimeMs > leaseMs) fs3.unlinkSync(file);
  } catch {
  }
  try {
    const fd = fs3.openSync(file, "wx");
    fs3.writeFileSync(fd, String(process.pid));
    fs3.closeSync(fd);
    return () => {
      try {
        fs3.unlinkSync(file);
      } catch {
      }
    };
  } catch {
    return null;
  }
}

// src/threat/sqlite.js
import path4 from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var exec = promisify(execFile);
var SQLITE3_VERSION = "6.0.1";
function driverDirectory() {
  if (process.env.GUARDRAILS_SQLITE_RUNTIME) return path4.resolve(process.env.GUARDRAILS_SQLITE_RUNTIME);
  return path4.join(dataRoot(), "runtime", `${process.platform}-${process.arch}`, SQLITE3_VERSION);
}
function nativeDriver() {
  return createRequire(path4.join(driverDirectory(), "package.json"))("sqlite3");
}
var builtin;
async function builtinDriver() {
  if (process.env.GUARDRAILS_SQLITE_DRIVER === "sqlite3") return null;
  if (builtin !== void 0) return builtin;
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || major === 22 && minor < 13) return builtin = null;
  try {
    const moduleName = "node:sqlite";
    const mod = await import(moduleName);
    builtin = typeof mod.DatabaseSync === "function" ? mod : null;
  } catch {
    builtin = null;
  }
  return builtin;
}
async function openDatabase(file, { readOnly = true } = {}) {
  const mod = await builtinDriver();
  if (mod) {
    const db2 = new mod.DatabaseSync(file, { readOnly, allowExtension: false });
    return {
      backend: "node:sqlite",
      exec: async (sql) => {
        db2.exec(sql);
      },
      all: async (sql, params = []) => db2.prepare(sql).all(...params),
      run: async (sql, params = []) => db2.prepare(sql).run(...params),
      close: async () => db2.close()
    };
  }
  let driver;
  try {
    driver = nativeDriver();
  } catch {
    throw new Error("SQLite3 driver unavailable; automatic setup runs in the background. Node 22.13+ includes SQLite.");
  }
  const db = await new Promise((resolve, reject) => {
    const instance = new driver.Database(
      file,
      readOnly ? driver.OPEN_READONLY : driver.OPEN_READWRITE | driver.OPEN_CREATE,
      (error) => error ? reject(error) : resolve(instance)
    );
  });
  const call = (method) => (sql, params = []) => new Promise((resolve, reject) => {
    db[method](sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
  return {
    backend: "sqlite3",
    all: call("all"),
    run: call("run"),
    exec: (sql) => new Promise((resolve, reject) => db.exec(sql, (e) => e ? reject(e) : resolve())),
    close: () => new Promise((resolve, reject) => db.close((e) => e ? reject(e) : resolve()))
  };
}

// src/threat/store.js
function affectedBy(record, version) {
  if (!version || version === "latest" || version === "*") return true;
  if (record.versions.includes(version)) return true;
  const exact = import_semver.default.valid(version);
  if (!exact) return false;
  return record.ranges.some((range) => {
    if (range.type !== "SEMVER") return false;
    let introduced = null;
    for (const event of range.events) {
      if (event.introduced !== void 0) introduced = event.introduced;
      const upper = event.fixed ?? event.last_affected ?? event.limit;
      if (upper !== void 0) {
        const afterStart = introduced === "0" || import_semver.default.valid(introduced) && import_semver.default.gte(exact, introduced);
        const beforeEnd = import_semver.default.valid(upper) && (event.last_affected !== void 0 ? import_semver.default.lte(exact, upper) : import_semver.default.lt(exact, upper));
        if (afterStart && beforeEnd) return true;
        introduced = null;
      }
    }
    return Boolean(introduced === "0" || import_semver.default.valid(introduced) && import_semver.default.gte(exact, introduced));
  });
}
async function lookupThreats(names, file = snapshot().file) {
  const result = /* @__PURE__ */ new Map();
  const unique = [...new Set(names.filter(Boolean))];
  if (!unique.length) return result;
  let db;
  try {
    db = await openDatabase(file);
    await db.exec("PRAGMA trusted_schema=OFF;");
    for (let i = 0; i < unique.length; i += 200) {
      const batch = unique.slice(i, i + 200);
      const rows = await db.all(`SELECT name, record FROM threats WHERE name IN (${batch.map(() => "?").join(",")})`, batch);
      for (const row of rows) {
        const records = result.get(row.name) || [];
        records.push(JSON.parse(row.record));
        result.set(row.name, records);
      }
    }
    try {
      fs4.unlinkSync(path5.join(dataRoot(), "store-error.json"));
    } catch {
    }
  } catch (error) {
    try {
      writeJson(path5.join(dataRoot(), "store-error.json"), { at: Date.now(), error: error.message });
    } catch {
    }
    result.unavailable = error.message;
  } finally {
    if (db) await db.close();
  }
  return result;
}
async function popularNames() {
  let db;
  try {
    db = await openDatabase(snapshot().file);
    return (await db.all("SELECT name FROM popular ORDER BY name")).map((row) => row.name);
  } catch {
    return null;
  } finally {
    if (db) await db.close();
  }
}

// src/supply-chain/signals.js
var TOP_NAMES = new Set(top_packages_default.names);
var SUSPICIOUS = /* @__PURE__ */ new Set(["crossenv", "cross-env.js", "d3.js", "fabric-js", "ffmepg", "gruntcli", "http-proxy.js", "jquery.js", "mariadb", "mongose", "mssql.js", "mssql-node", "mysqljs", "node-fabric", "node-opencv", "node-opensl", "node-openssl", "node-sqlite", "node-tkinter", "nodecaffe", "nodefabric", "nodeffmpeg", "nodemailer-js", "nodemailer.js", "nodemssql", "noderequest", "nodesass", "nodesqlite", "opencv.js", "openssl.js", "proxy.js", "shadowsock", "smb", "sqlite.js", "sqliter", "sqlserver", "tkinter"]);
var popularLoaded = false;
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
    const pkg = JSON.parse(fs5.readFileSync(path6.join(projectRoot, "package.json"), "utf8"));
    addAll(pkg.dependencies);
    addAll(pkg.devDependencies);
    addAll(pkg.peerDependencies);
    addAll(pkg.optionalDependencies);
  } catch {
  }
  const lockfiles = ["package-lock.json", "npm-shrinkwrap.json"];
  for (const file of lockfiles) {
    try {
      const lock2 = JSON.parse(fs5.readFileSync(path6.join(projectRoot, file), "utf8"));
      addAll(lock2.dependencies);
      for (const key of Object.keys(lock2.packages ?? {})) {
        const cleaned = key.replace(/^node_modules\//, "").replace(/.*\/node_modules\//, "");
        if (cleaned) names.add(cleaned);
      }
    } catch {
    }
  }
  for (const file of ["yarn.lock", "pnpm-lock.yaml"]) {
    try {
      const text = fs5.readFileSync(path6.join(projectRoot, file), "utf8");
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
    (file) => fs5.existsSync(path6.join(projectRoot, file))
  );
}
function versionIsPinned(version) {
  if (!version) return false;
  if (version === "latest" || version === "*" || version === "next") return false;
  return /^\d+\.\d+\.\d+/.test(version);
}
async function evaluateInstall(install, context) {
  const { projectRoot } = context;
  const known = context.known ?? knownPackageNames(projectRoot);
  const reasons = [];
  const packages = [];
  let weightHigh = 0;
  let weightLow = 0;
  let block = false;
  const threats = await lookupThreats(install.packages.map((spec) => parseSpecifier(spec).name));
  if (!popularLoaded) {
    const names = await popularNames();
    if (names) for (const name of names) TOP_NAMES.add(name);
    popularLoaded = true;
  }
  if (threats.unavailable) reasons.push(`Threat database checks unavailable: ${threats.unavailable}`);
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
    const entry = threats.get(lower)?.find((record) => affectedBy(record, parsed.version));
    if (entry) {
      {
        reasons.push(
          `${lower} has known compromised releases (${entry.versions.join(", ") || "see advisory ranges"}): ${entry.description ?? "known bad release"} (${entry.id})`
        );
        weightHigh += 1;
        if (!allows(context.allowPackages, lower, parsed.version)) block = true;
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
    block,
    reasons,
    packages,
    ignoresScripts,
    isGlobal
  };
}

// src/hooks/pre-bash.js
init_osv();

// src/threat/maintenance.js
import fs7 from "node:fs";
import path8 from "node:path";
import { spawn } from "node:child_process";
function manualSteps() {
  const command = JSON.stringify(path8.join(pluginRoot(), "dist/threat-data.mjs"));
  return `Clone a fresh copy into a new directory:
git clone --depth 1 --single-branch --branch threat-data ${REPOSITORY} guardrails-threat-data
Then validate and install it:
node ${command} import ./guardrails-threat-data
To retry all automatic routes: node ${command} refresh --force`;
}
function maintainThreatData(config, { now = Date.now(), launch = spawn } = {}) {
  if (process.env.GUARDRAILS_THREAT_MAINTENANCE === "off") return "";
  try {
    const root = dataRoot();
    const state = readJson2(path8.join(root, "update-state.json"), {});
    const interval = Math.max(1, Number(config.threatDataRefreshHours) || 24) * 36e5;
    if (config.network !== false && config.threatDataAutoRefresh !== false && now >= (state.nextCheck || 0)) {
      const release2 = lock(path8.join(root, "launch.lock"), 6e4);
      if (release2) {
        try {
          const last = readJson2(path8.join(root, "launch.json"), {});
          if (now - (last.at || 0) >= 6e4) {
            writeJson(path8.join(root, "launch.json"), { at: now });
            const worker = launch(process.execPath, [path8.join(pluginRoot(), "dist/threat-data.mjs"), "refresh", "--interval", String(interval)], {
              detached: true,
              stdio: "ignore",
              windowsHide: true,
              env: { ...process.env, CLAUDE_PLUGIN_DATA: path8.dirname(root) }
            });
            worker.on("error", () => {
            });
            worker.unref();
          }
        } finally {
          release2();
        }
      }
    }
    const current = snapshot();
    const age = now - Date.parse(current.metadata?.sourceUpdated);
    const error = readJson2(path8.join(root, "store-error.json"));
    const problem = error && now - error.at < DAY ? `Threat database checks are unavailable: ${error.error}.` : !fs7.existsSync(current.file) || !Number.isFinite(age) ? "No usable threat database is installed." : age > 7 * DAY ? `Threat database is ${Math.floor(age / DAY)} days old (source snapshot ${current.metadata.sourceUpdated}).` : "";
    if (!problem) return "";
    const release = lock(path8.join(root, "notice.lock"), 6e4);
    if (!release) return "";
    try {
      const previous = readJson2(path8.join(root, "notice.json"), {});
      if (now - (previous.at || 0) < DAY) return "";
      writeJson(path8.join(root, "notice.json"), { at: now });
    } finally {
      release();
    }
    const failures = [state.error, ...Object.entries(state.routes || {}).filter(([, value]) => value.error).map(([name, value]) => `${name}: ${value.error}`)].filter(Boolean).join("; ");
    return `guardrails-js: ${problem} ${failures ? `Last update failures: ${failures}. ` : ""}Tell the user this warning and the following manual refresh steps once today.
${manualSteps()}`;
  } catch {
    return "";
  }
}

// src/hooks/pre-bash.js
function blocks(note, config) {
  return BLOCKING_SEVERITIES.has(note.severity) && !allows(config.allowPackages, note.name, note.version);
}
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
  const threatNotice = maintainThreatData(loadConfig(input.cwd || process.cwd()));
  queueHookNotice("PreToolUse", threatNotice);
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
  const bare = installs.some(
    (install) => install.subcommand !== "ci" && install.packages.length === 0
  );
  if (bare && config.network) {
    try {
      const { manifestAdvisories: manifestAdvisories2 } = await Promise.resolve().then(() => (init_manifest_advisories(), manifest_advisories_exports));
      const { pkg } = readPackageJson(projectRoot);
      const { notes, skipped } = await manifestAdvisories2(pkg, config);
      if (notes.length > 0) {
        const worst = notes.slice(0, 3).map((note) => note.text);
        const more = notes.length > 3 ? ` ${notes.length - 3} other pinned versions too.` : "";
        const capped = skipped > 0 ? ` ${skipped} more were not checked.` : "";
        emitAdditionalContext(
          "PreToolUse",
          `guardrails-js checked what this installs: ${worst.join(" ")}${more}${capped} Tell the user guardrails-js found these, so they know it looked.`
        );
        return;
      }
    } catch {
    }
  }
  const known = knownPackageNames(projectRoot);
  const allReasons = [...shellNotes];
  const allPackages = [];
  let shouldPrompt = false;
  let mustBlock = false;
  for (const install of installs) {
    if (install.subcommand === "ci") continue;
    const verdict = await evaluateInstall(install, {
      projectRoot,
      known,
      allowPackages: config.allowPackages
    });
    if (verdict.prompt) shouldPrompt = true;
    if (verdict.block) mustBlock = true;
    allReasons.push(...verdict.reasons);
    allPackages.push(...verdict.packages.filter((pkg) => pkg.kind === "registry"));
  }
  const pinned = allPackages.filter((pkg) => /^\d+\.\d+\.\d+/.test(pkg.version ?? ""));
  const worthLookingUp = pinned.length > 0 || shouldPrompt;
  if (config.network && allPackages.length > 0 && worthLookingUp) {
    try {
      const { advisoryNotes: advisoryNotes2 } = await Promise.resolve().then(() => (init_osv(), osv_exports));
      const notes = await advisoryNotes2(allPackages, 2e3);
      if (notes.length > 0) {
        shouldPrompt = true;
        if (notes.some((note) => blocks(note, config))) mustBlock = true;
        allReasons.push(...notes.map((note) => note.text));
      }
    } catch {
    }
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
      allReasons.push(...await enrich2(allPackages, 2e3));
    } catch {
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const reasons = allReasons.filter((reason) => {
    const key = reason.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  allReasons.length = 0;
  allReasons.push(...reasons);
  const bullets = allReasons.map((reason) => `  - ${reason}`).join("\n");
  const names = allPackages.map((pkg) => pkg.name).join(", ") || "this command";
  if (mustBlock) {
    emitLoud(
      `guardrails-js blocked this install (${names}):
${bullets}

Install the fixed version named above instead. If this exact version is genuinely needed, add it to allowPackages in .guardrails-js.json.`
    );
  }
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
