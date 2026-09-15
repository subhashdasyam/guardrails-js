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
import fs9 from "node:fs";
import os3 from "node:os";
import path10 from "node:path";
import { createHash } from "node:crypto";
function cacheDir() {
  const base = process.env.CLAUDE_PLUGIN_DATA || path10.join(os3.homedir(), ".claude", "plugins", "data", "guardrails-js");
  return path10.join(base, "cache");
}
function cacheFile(key) {
  const safe = String(key).replace(/[^A-Za-z0-9_.@-]/g, "-");
  return path10.join(cacheDir(), `${safe}.json`);
}
function readCache(key, now, maxAge = CACHE_TTL_MS) {
  try {
    const raw = JSON.parse(fs9.readFileSync(cacheFile(key), "utf8"));
    if (now - raw.at > maxAge) return null;
    return raw.value;
  } catch {
    return null;
  }
}
function writeCache(key, value, now) {
  try {
    fs9.mkdirSync(cacheDir(), { recursive: true });
    const file = cacheFile(key);
    const temp = `${file}.${process.pid}.tmp`;
    fs9.writeFileSync(temp, JSON.stringify({ at: now, value }), "utf8");
    fs9.renameSync(temp, file);
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
var CACHE_TTL_MS, SEVERITY_RANK, BLOCKING_SEVERITIES;
var init_osv = __esm({
  "src/supply-chain/osv.js"() {
    CACHE_TTL_MS = 6 * 60 * 60 * 1e3;
    SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };
    BLOCKING_SEVERITIES = /* @__PURE__ */ new Set(["CRITICAL", "HIGH"]);
  }
});

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
function performanceMode(config) {
  const value = config.performance;
  if (value === false || value === "off" || value === "none") return "off";
  if (value === "all" || value === "low") return "all";
  return "high";
}
function shouldReport(severity, config, impact = "high") {
  if (severity !== "perf") return meetsMinSeverity(severity, config.minSeverity);
  const mode = performanceMode(config);
  if (mode === "off") return false;
  if (mode === "all") return true;
  return impact !== "low";
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

// src/threat/maintenance.js
import fs5 from "node:fs";
import path5 from "node:path";
import { spawn } from "node:child_process";

// src/threat/paths.js
import fs4 from "node:fs";
import os2 from "node:os";
import path4 from "node:path";
import { fileURLToPath } from "node:url";
var DAY = 864e5;
var REPOSITORY = "https://github.com/subhashdasyam/guardrails-js.git";
function dataRoot() {
  return path4.join(process.env.CLAUDE_PLUGIN_DATA || path4.join(os2.homedir(), ".claude/plugins/data/guardrails-js"), "threat");
}
function pluginRoot() {
  let dir = path4.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    if (fs4.existsSync(path4.join(dir, "hooks/hooks.json"))) return dir;
    dir = path4.dirname(dir);
  }
  throw new Error("Cannot locate guardrails-js plugin files");
}
function readJson2(file, fallback = null) {
  try {
    return JSON.parse(fs4.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs4.mkdirSync(path4.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs4.writeFileSync(temp, JSON.stringify(data, null, 2) + "\n");
  fs4.renameSync(temp, file);
}
function snapshot() {
  if (process.env.GUARDRAILS_THREAT_SNAPSHOT) {
    const dir2 = path4.resolve(process.env.GUARDRAILS_THREAT_SNAPSHOT);
    return { file: path4.join(dir2, "threat-data.db"), metadata: readJson2(path4.join(dir2, "manifest.json")) };
  }
  const root = dataRoot();
  const active = readJson2(path4.join(root, "active.json"));
  if (active && /^[a-f0-9]{64}$/.test(active.sha256)) {
    const file = path4.join(root, "snapshots", active.sha256, "threat-data.db");
    if (fs4.existsSync(file)) return { file, metadata: active };
  }
  const dir = path4.join(pluginRoot(), "data");
  return { file: path4.join(dir, "threat-data.db"), metadata: readJson2(path4.join(dir, "manifest.json")) };
}
function lock(file, leaseMs = 20 * 6e4) {
  fs4.mkdirSync(path4.dirname(file), { recursive: true });
  try {
    if (Date.now() - fs4.statSync(file).mtimeMs > leaseMs) fs4.unlinkSync(file);
  } catch {
  }
  try {
    const fd = fs4.openSync(file, "wx");
    fs4.writeFileSync(fd, String(process.pid));
    fs4.closeSync(fd);
    return () => {
      try {
        fs4.unlinkSync(file);
      } catch {
      }
    };
  } catch {
    return null;
  }
}

// src/threat/maintenance.js
function manualSteps() {
  const command = JSON.stringify(path5.join(pluginRoot(), "dist/threat-data.mjs"));
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
    const state = readJson2(path5.join(root, "update-state.json"), {});
    const interval = Math.max(1, Number(config.threatDataRefreshHours) || 24) * 36e5;
    if (config.network !== false && config.threatDataAutoRefresh !== false && now >= (state.nextCheck || 0)) {
      const release2 = lock(path5.join(root, "launch.lock"), 6e4);
      if (release2) {
        try {
          const last = readJson2(path5.join(root, "launch.json"), {});
          if (now - (last.at || 0) >= 6e4) {
            writeJson(path5.join(root, "launch.json"), { at: now });
            const worker = launch(process.execPath, [path5.join(pluginRoot(), "dist/threat-data.mjs"), "refresh", "--interval", String(interval)], {
              detached: true,
              stdio: "ignore",
              windowsHide: true,
              env: { ...process.env, CLAUDE_PLUGIN_DATA: path5.dirname(root) }
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
    const error = readJson2(path5.join(root, "store-error.json"));
    const problem = error && now - error.at < DAY ? `Threat database checks are unavailable: ${error.error}.` : !fs5.existsSync(current.file) || !Number.isFinite(age) ? "No usable threat database is installed." : age > 7 * DAY ? `Threat database is ${Math.floor(age / DAY)} days old (source snapshot ${current.metadata.sourceUpdated}).` : "";
    if (!problem) return "";
    const release = lock(path5.join(root, "notice.lock"), 6e4);
    if (!release) return "";
    try {
      const previous = readJson2(path5.join(root, "notice.json"), {});
      if (now - (previous.at || 0) < DAY) return "";
      writeJson(path5.join(root, "notice.json"), { at: now });
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

// src/engine/manifest.js
import fs8 from "node:fs";
import path9 from "node:path";

// src/threat/store.js
var import_semver = __toESM(require_semver2(), 1);
import path7 from "node:path";
import fs6 from "node:fs";

// src/threat/sqlite.js
import path6 from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var exec = promisify(execFile);
var SQLITE3_VERSION = "6.0.1";
function driverDirectory() {
  if (process.env.GUARDRAILS_SQLITE_RUNTIME) return path6.resolve(process.env.GUARDRAILS_SQLITE_RUNTIME);
  return path6.join(dataRoot(), "runtime", `${process.platform}-${process.arch}`, SQLITE3_VERSION);
}
function nativeDriver() {
  return createRequire(path6.join(driverDirectory(), "package.json"))("sqlite3");
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
      fs6.unlinkSync(path7.join(dataRoot(), "store-error.json"));
    } catch {
    }
  } catch (error) {
    try {
      writeJson(path7.join(dataRoot(), "store-error.json"), { at: Date.now(), error: error.message });
    } catch {
    }
    result.unavailable = error.message;
  } finally {
    if (db) await db.close();
  }
  return result;
}

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
      const entry = ctx.threats?.get(name)?.find((record) => affectedBy(record, version));
      if (!entry) continue;
      hits.push({ name, version, incident: entry });
    }
    for (const [name, range] of Object.entries({
      ...ctx.pkg?.dependencies ?? {},
      ...ctx.pkg?.devDependencies ?? {}
    })) {
      if (ctx.locked.has(name)) continue;
      const exact = /^\d+\.\d+\.\d+$/.test(String(range).trim()) ? String(range).trim() : null;
      if (!exact) continue;
      const entry = ctx.threats?.get(name)?.find((record) => affectedBy(record, exact));
      if (!entry) continue;
      hits.push({ name, version: exact, incident: entry });
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
import fs7 from "node:fs";
import path8 from "node:path";

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
    let lock2;
    try {
      lock2 = JSON.parse(fs7.readFileSync(path8.join(projectRoot, file), "utf8"));
    } catch {
      continue;
    }
    for (const [key, value] of Object.entries(lock2.packages ?? {})) {
      const name = key.replace(/^node_modules\//, "").replace(/.*\/node_modules\//, "");
      if (name && value?.version && !found.has(name)) found.set(name, value.version);
    }
    for (const [name, value] of Object.entries(lock2.dependencies ?? {})) {
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
    return fs8.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function makeReader(projectRoot) {
  return (relative) => {
    const target = path9.join(projectRoot, relative);
    let stats;
    try {
      stats = fs8.statSync(target);
    } catch {
      return "";
    }
    if (stats.isFile()) return readText(target);
    if (!stats.isDirectory()) return "";
    try {
      return fs8.readdirSync(target).filter((name) => /\.(ya?ml|json|sh|toml)$/i.test(name)).map((name) => readText(path9.join(target, name))).join("\n");
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
      manifest = JSON.parse(readText(path9.join(projectRoot, "package.json")));
    } catch {
      manifest = null;
    }
  }
  const lockfileName = LOCKFILES.find((name) => fs8.existsSync(path9.join(projectRoot, name))) ?? null;
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
async function runManifestRules(projectRoot, config, pkg = null, rules = manifest_default) {
  const ctx = manifestContext(projectRoot, pkg);
  if (!ctx.pkg) return [];
  if (!config.isRuleDisabled("SUPPLY-DENY")) {
    ctx.threats = await lookupThreats([...ctx.locked.keys(), ...Object.keys(ctx.pkg.dependencies || {}), ...Object.keys(ctx.pkg.devDependencies || {})]);
  }
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
    if (!shouldReport(severity, config, rule.impact)) continue;
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
async function baselineNotes(projectRoot, pkg, config) {
  const notes = [];
  for (const finding of await runManifestRules(projectRoot, config, pkg)) {
    notes.push(`${finding.ruleId} ${finding.message} Fix: ${finding.fix.split("\n")[0]}`);
  }
  for (const finding of checkDependencies(pkg, readLockedVersions(projectRoot))) {
    notes.push(describeDependencyFinding(finding));
  }
  if (config.network) {
    try {
      const { manifestAdvisories: manifestAdvisories2 } = await Promise.resolve().then(() => (init_manifest_advisories(), manifest_advisories_exports));
      const { notes: advisories, skipped } = await manifestAdvisories2(pkg, config, 2e3, 4e3);
      for (const advisory of advisories) notes.push(advisory.text);
      if (skipped > 0) {
        notes.push(`${skipped} more pinned dependencies were not checked for advisories.`);
      }
    } catch {
    }
  }
  return notes;
}
async function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.cwd();
  resetSession(input.session_id);
  const config = loadConfig(cwd);
  const threatNotice = maintainThreatData(config);
  if (threatNotice) process.stdout.write(`${threatNotice}

`);
  if (!config.priming) return;
  const { pkg, root } = readPackageJson(cwd);
  const projectRoot = config.configFile ? config.projectRoot : root || cwd;
  if (!pkg) return;
  const dependencies = allDependencies(pkg);
  const packs = packsFor(dependencies);
  const notes = await baselineNotes(projectRoot, pkg, config);
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
await main();
export {
  main
};
