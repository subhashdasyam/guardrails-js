// Authentication, sessions, and cryptography. OWASP A04:2025 and A07:2025.

import {
  calleeEndsWith,
  memberName,
  lastSegment,
  staticString,
  objectValue,
  isFalse,
  isLiteral,
  fileLooksLikeTest,
} from '../helpers.js';

const JWT_OWNERS = /(^|\.)(jwt|jsonwebtoken|jose|JWT)$/i;

function isJwtCall(node, method) {
  const full = memberName(node.callee);
  if (!full) return false;
  if (lastSegment(full) !== method) return false;
  const owner = full.slice(0, full.length - method.length - 1);
  if (!owner) return false;
  return JWT_OWNERS.test(owner) || /jwt/i.test(owner);
}

export const JWT_01 = {
  id: 'JWT-01',
  title: 'JWT verified without pinning the algorithm',
  severity: 'high',
  owasp2025: 'A07',
  cwe: ['CWE-347'],
  api: 'API2',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\bjwt\b|jsonwebtoken/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!isJwtCall(node, 'verify')) return null;

    const options = node.arguments[2];
    const algorithms = options?.type === 'ObjectExpression' ? objectValue(options, 'algorithms') : null;

    if (!algorithms) {
      return { node, kind: 'no algorithms option is set' };
    }

    if (algorithms.type !== 'ArrayExpression') {
      return { node: algorithms, kind: 'the algorithms list is not a fixed array' };
    }

    const values = algorithms.elements.map((el) => staticString(el)).filter(Boolean);
    if (values.length !== algorithms.elements.length) {
      return { node: algorithms, kind: 'the algorithms list is built at runtime' };
    }

    return null;
  },
  message: (f) =>
    `JWT is verified but ${f.kind}. The library then trusts the alg header in the token, which is chosen by whoever sent it.`,
  fix: "jwt.verify(token, key, { algorithms: ['RS256'], issuer, audience })",
};

export const JWT_02 = {
  id: 'JWT-02',
  title: 'JWT decoded but never verified',
  severity: 'high',
  owasp2025: 'A07',
  cwe: ['CWE-347', 'CWE-287'],
  api: 'API2',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  fileWide: true,
  prefilter: /\.decode\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!isJwtCall(node, 'decode')) return null;
    // Decoding to read a claim for logging is fine as long as something in the
    // file also verifies. No verify call anywhere is the tell.
    if (/\.verify\s*\(/.test(ctx.source)) return null;
    return { node };
  },
  message: () =>
    'jwt.decode reads the token without checking the signature. Anyone can edit the payload and re-encode it, so any decision made on these claims can be forged.',
  fix: "const claims = jwt.verify(token, key, { algorithms: ['RS256'] });",
};

export const JWT_03 = {
  id: 'JWT-03',
  title: 'JWT accepts the none algorithm',
  severity: 'critical',
  owasp2025: 'A07',
  cwe: ['CWE-347'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /['"]none['"]/,
  nodeTypes: ['ArrayExpression', 'ObjectProperty', 'Property'],
  match(node, ctx) {
    if (node.type === 'ArrayExpression') {
      const values = node.elements.map((el) => staticString(el));
      if (!values.some((value) => value && value.toLowerCase() === 'none')) return null;
      if (!/algorithm/i.test(ctx.source)) return null;
      return { node };
    }

    const key = node.key?.name ?? node.key?.value;
    if (key !== 'algorithm') return null;
    const value = staticString(node.value);
    if (!value || value.toLowerCase() !== 'none') return null;
    return { node };
  },
  message: () =>
    'The none algorithm is allowed. A token with alg set to none has no signature at all, so anybody can mint one.',
  fix: "algorithms: ['RS256']  // one family, and never none",
};

const HMAC_CALLS = ['createHmac', 'sign', 'createSignature'];

export const AUTH_01 = {
  id: 'AUTH-01',
  title: 'Signing key written into source',
  severity: 'high',
  owasp2025: 'A04',
  cwe: ['CWE-798', 'CWE-321'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /createHmac|jwt\.sign|\.sign\s*\(/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);
    if (!HMAC_CALLS.includes(method)) return null;

    // jwt.sign(payload, secret) and crypto.createHmac(alg, secret)
    const secret = method === 'createHmac' ? node.arguments[1] : node.arguments[1];
    if (!secret) return null;

    const literal = staticString(secret);
    if (literal === null) return null;
    if (literal.length === 0) return null;

    return {
      node: secret,
      severityHint: fileLooksLikeTest(ctx.filePath) ? 'low' : 'high',
      length: literal.length,
    };
  },
  message: (f) =>
    `The signing key is a literal string in the source (${f.length} characters). Anyone who can read the repository can mint valid tokens.`,
  fix: "const secret = process.env.JWT_SECRET;\nif (!secret) throw new Error('JWT_SECRET is not set');",
};

const SECURITY_VALUE_NAMES =
  /(token|secret|key|nonce|otp|salt|session|password|passcode|verifier|challenge|csrf|state|uuid|id)$/i;

function securityContextName(parent) {
  if (parent?.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') return parent.id.name;
  if (parent?.type === 'ObjectProperty' || parent?.type === 'Property') {
    return parent.key?.name ?? parent.key?.value ?? null;
  }
  if (parent?.type === 'AssignmentExpression') return memberName(parent.left);
  return null;
}

export const AUTH_02 = {
  id: 'AUTH-02',
  title: 'Security value from Math.random',
  severity: 'high',
  owasp2025: 'A04',
  cwe: ['CWE-338', 'CWE-330'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /Math\.random/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx, parent) {
    if (memberName(node.callee) !== 'Math.random') return null;

    let name = securityContextName(parent);

    // Math.random() is usually wrapped: .toString(36).slice(2). The immediate
    // parent is then a member expression, so read the name off the statement
    // this sits in instead.
    if (!name) {
      const lineStart = ctx.source.lastIndexOf('\n', node.start) + 1;
      const before = ctx.source.slice(lineStart, node.start);
      name =
        /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/.exec(before)?.[1] ??
        /([A-Za-z0-9_$.]+)\s*[:=]\s*$/.exec(before)?.[1] ??
        null;
    }

    if (!name) return null;

    const tail = lastSegment(name) ?? name;
    if (!SECURITY_VALUE_NAMES.test(tail)) return null;

    return { node, name: tail };
  },
  message: (f) =>
    `${f.name} comes from Math.random, which is predictable. Given a few outputs an attacker can work out the rest.`,
  fix: "crypto.randomBytes(32).toString('hex')  // or crypto.randomUUID()",
};

export const CRYPTO_01 = {
  id: 'CRYPTO-01',
  title: 'Deprecated or unauthenticated cipher',
  severity: 'high',
  owasp2025: 'A04',
  cwe: ['CWE-327'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /createCipher|createDecipher/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);

    if (method === 'createCipher' || method === 'createDecipher') {
      return { node, kind: `${method} is deprecated and derives a key with no salt` };
    }

    if (method === 'createCipheriv' || method === 'createDecipheriv') {
      const iv = node.arguments[2];
      if (!iv) return null;
      if (iv.type === 'NullLiteral') return { node: iv, kind: 'the initialisation vector is null' };
      if (isLiteral(iv)) return { node: iv, kind: 'the initialisation vector is a fixed literal' };
      return null;
    }

    return null;
  },
  message: (f) => `${f.kind}. Encrypting two messages the same way lets an attacker compare them.`,
  fix: "const iv = crypto.randomBytes(12);\nconst cipher = crypto.createCipheriv('aes-256-gcm', key, iv);",
};

export const CRYPTO_02 = {
  id: 'CRYPTO-02',
  title: 'Broken cipher mode or algorithm',
  severity: 'high',
  owasp2025: 'A04',
  cwe: ['CWE-327'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /ecb|\bdes\b|rc4|blowfish/i,
  nodeTypes: ['StringLiteral'],
  match(node, ctx, parent) {
    const value = node.value;
    if (typeof value !== 'string') return null;
    if (!/^[a-z0-9-]+$/i.test(value)) return null;

    const broken = /(^|-)(ecb)(-|$)|^des(-|$)|^des-ede|^rc4|^bf-|^blowfish/i.test(value);
    if (!broken) return null;

    // Only when it is being handed to a crypto call.
    if (parent?.type !== 'CallExpression' && parent?.type !== 'OptionalCallExpression') return null;
    const full = memberName(parent.callee);
    if (!full || !/cipher|decipher|createHash|crypto/i.test(full)) return null;

    return { node, algorithm: value };
  },
  message: (f) =>
    `${f.algorithm} is broken. ECB leaks the shape of the plaintext, and DES, RC4, and Blowfish are all too weak to use now.`,
  fix: "crypto.createCipheriv('aes-256-gcm', key, crypto.randomBytes(12))",
};

const FAST_HASHES = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
const PASSWORD_NAMES = /(password|passwd|pwd|passphrase)/i;

export const PASS_01 = {
  id: 'PASS-01',
  title: 'Password stored with a fast hash',
  severity: 'high',
  owasp2025: 'A04',
  cwe: ['CWE-916', 'CWE-328'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /createHash|\bmd5\b|\bsha1\b/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    const method = lastSegment(full);

    // md5(password) style helpers
    if (FAST_HASHES.includes(method.toLowerCase())) {
      const arg = node.arguments[0];
      if (arg && PASSWORD_NAMES.test(ctx.source.slice(arg.start, arg.end))) {
        return { node: arg, algorithm: method };
      }
      return null;
    }

    if (method !== 'update') return null;

    // createHash('sha256').update(password)
    const arg = node.arguments[0];
    if (!arg) return null;
    if (!PASSWORD_NAMES.test(ctx.source.slice(arg.start, arg.end))) return null;

    const chainSource = ctx.source.slice(node.start, node.end);
    const algorithm = /createHash\(\s*['"]([a-z0-9-]+)['"]/i.exec(chainSource)?.[1];
    if (!algorithm || !FAST_HASHES.includes(algorithm.toLowerCase())) return null;

    return { node: arg, algorithm };
  },
  message: (f) =>
    `Password is hashed with ${f.algorithm}, which is built to be fast. A consumer graphics card tries billions of guesses a second against it.`,
  fix: "const hash = await argon2.hash(password);  // or bcrypt with cost 12 and above",
};

export const PASS_02 = {
  id: 'PASS-02',
  title: 'Password hashing cost too low',
  severity: 'medium',
  owasp2025: 'A04',
  cwe: ['CWE-916'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /bcrypt|scrypt|pbkdf2/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!/bcrypt/i.test(full)) return null;
    if (!['hash', 'hashSync', 'genSalt', 'genSaltSync'].includes(lastSegment(full))) return null;

    const costArg = lastSegment(full).startsWith('genSalt') ? node.arguments[0] : node.arguments[1];
    if (!costArg) return null;
    if (costArg.type !== 'NumericLiteral') return null;
    if (costArg.value >= 10) return null;

    return { node: costArg, cost: costArg.value };
  },
  message: (f) =>
    `bcrypt cost is ${f.cost}. Each step down halves the work an attacker has to do. Ten is the floor and twelve is the usual choice now.`,
  fix: 'await bcrypt.hash(password, 12)',
};

const SECRET_COMPARE_NAMES =
  /(token|secret|signature|hmac|digest|password|passwd|apikey|api_key|hash|otp|code|nonce)/i;

export const TIMING_01 = {
  id: 'TIMING-01',
  title: 'Secret compared with a normal equality check',
  severity: 'medium',
  owasp2025: 'A07',
  cwe: ['CWE-208'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /(token|secret|signature|hmac|digest|apikey|api_key)/i,
  nodeTypes: ['BinaryExpression'],
  match(node, ctx) {
    if (!['===', '==', '!==', '!='].includes(node.operator)) return null;

    const left = ctx.source.slice(node.left.start, node.left.end);
    const right = ctx.source.slice(node.right.start, node.right.end);

    // Both sides must look like secrets, otherwise every `if (kind === 'token')`
    // in the codebase fires.
    const leftIsSecret = SECRET_COMPARE_NAMES.test(left) && !isLiteral(node.left);
    const rightIsSecret = SECRET_COMPARE_NAMES.test(right) && !isLiteral(node.right);
    if (!leftIsSecret || !rightIsSecret) return null;

    return { node };
  },
  message: () =>
    'Comparing a secret with === stops at the first byte that differs, so the time it takes leaks how much of the guess was right.',
  fix: 'crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))  // check lengths first',
};

export const COOKIE_01 = {
  id: 'COOKIE-01',
  title: 'Cookie missing its security flags',
  severity: 'medium',
  owasp2025: 'A07',
  cwe: ['CWE-1004', 'CWE-614', 'CWE-1275'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.cookie\s*\(|httpOnly|sameSite/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (lastSegment(full) !== 'cookie') return null;
    if (!/^(res|reply|response)\b/.test(full)) return null;

    const options = node.arguments[2];
    const name = staticString(node.arguments[0]) ?? 'this cookie';

    // A cookie that is meant to be read by scripts is a real thing, but a
    // session cookie is not one of them.
    const looksLikeSession = /sid|session|auth|token|jwt|login/i.test(name);

    if (!options || options.type !== 'ObjectExpression') {
      return looksLikeSession ? { node, name, missing: ['httpOnly', 'secure', 'sameSite'] } : null;
    }

    const missing = ['httpOnly', 'secure', 'sameSite'].filter((flag) => {
      const value = objectValue(options, flag);
      if (value === null) return true;
      return isFalse(value);
    });

    if (missing.length === 0) return null;
    if (!looksLikeSession && missing.length < 3) return null;

    return { node: options, name, missing };
  },
  message: (f) =>
    `${f.name} is set without ${f.missing.join(', ')}. Without httpOnly any script on the page can read it, and without secure it travels in the clear.`,
  fix: "res.cookie('sid', value, { httpOnly: true, secure: true, sameSite: 'lax' })",
};

const SESSION_IDENTITY = /^(req|request|ctx)\.session\.(user|userId|userID|uid|accountId|isAdmin|role)$/;

export const SESSION_01 = {
  id: 'SESSION-01',
  title: 'Session id not rotated at login',
  severity: 'medium',
  owasp2025: 'A07',
  cwe: ['CWE-384'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /session\.(user|uid|accountId|isAdmin|role)/i,
  nodeTypes: ['AssignmentExpression'],
  match(node, ctx) {
    const target = memberName(node.left);
    if (!target || !SESSION_IDENTITY.test(target)) return null;
    if (/\bregenerate\s*\(|\brotateSession\b|\bcycleSession\b/.test(ctx.source)) return null;
    if (ctx.state.get('SESSION-01')) return null;
    ctx.state.set('SESSION-01', true);
    return { node };
  },
  message: () =>
    'Identity is written into the existing session and the session id is never regenerated. An id planted before login still works after it, which is session fixation.',
  fix: "req.session.regenerate((err) => {\n  if (err) return next(err);\n  req.session.userId = user.id;\n});",
};

const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];
const CSRF_MIDDLEWARE = /csurf|csrf|doubleCsrf|csrfProtection|@fastify\/csrf/i;

export const CSRF_01 = {
  id: 'CSRF-01',
  title: 'Cookie authenticated route with no CSRF protection',
  severity: 'medium',
  owasp2025: 'A01',
  cwe: ['CWE-352'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.(post|put|patch|delete)\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!MUTATING_METHODS.includes(lastSegment(full))) return null;
    if (!/^(app|router|server|api)\b/.test(full)) return null;
    if (staticString(node.arguments[0]) === null) return null;

    // Only relevant when the browser sends credentials on its own. A bearer
    // token API is not vulnerable to this.
    if (!/req\.session|req\.cookies|reply\.setCookie|res\.cookie/.test(ctx.source)) return null;
    if (CSRF_MIDDLEWARE.test(ctx.source)) return null;

    // One finding per file. A file with thirty routes has one problem, not
    // thirty.
    if (ctx.state.get('CSRF-01')) return null;
    ctx.state.set('CSRF-01', true);

    return { node, route: staticString(node.arguments[0]) };
  },
  message: (f) =>
    `${f.route} changes state and this file authenticates with cookies, but no CSRF protection is set up. Another site can make this request in your users' browsers.`,
  fix: "app.use(csrf({ cookie: true }));  // then send the token with each form, and check Origin as well",
};

export default [
  JWT_01,
  JWT_02,
  JWT_03,
  AUTH_01,
  AUTH_02,
  CRYPTO_01,
  CRYPTO_02,
  PASS_01,
  PASS_02,
  TIMING_01,
  COOKIE_01,
  SESSION_01,
  CSRF_01,
];
