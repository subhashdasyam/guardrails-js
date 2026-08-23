// Secrets and server configuration. OWASP A02:2025 and A04:2025.

import {
  calleeEndsWith,
  memberName,
  lastSegment,
  staticString,
  objectValue,
  objectProperty,
  isTrue,
  isFalse,
  fileLooksLikeTest,
} from '../helpers.js';

const PROVIDER_KEYS = [
  { name: 'an AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'a Stripe live secret key', pattern: /\b(sk|rk)_live_[0-9a-zA-Z]{16,}/ },
  { name: 'a GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: 'a Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'a Google API key', pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { name: 'an Anthropic API key', pattern: /\bsk-ant-[A-Za-z0-9\-_]{20,}/ },
  { name: 'an OpenAI API key', pattern: /\bsk-(proj-)?[A-Za-z0-9]{32,}/ },
  { name: 'an npm token', pattern: /\bnpm_[A-Za-z0-9]{30,}/ },
  { name: 'a GitLab token', pattern: /\bglpat-[A-Za-z0-9\-_]{20,}/ },
  { name: 'a SendGrid key', pattern: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{30,}/ },
  { name: 'a private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'a Twilio key', pattern: /\bSK[0-9a-fA-F]{32}\b/ },
];

const SECRET_NAMES =
  /^(.*_)?(secret|password|passwd|passphrase|token|api_?key|access_?key|private_?key|credential|auth)(_.*)?$/i;

const PLACEHOLDER =
  /(example|placeholder|your[-_]?|xxx|yyy|dummy|sample|redacted|changeme|todo|fixme|<.*>|\.\.\.|\*\*\*|foo|bar)/i;

function nameOfTarget(node, parent) {
  if (parent?.type === 'VariableDeclarator' && parent.id?.type === 'Identifier') {
    return parent.id.name;
  }
  if (parent?.type === 'ObjectProperty' || parent?.type === 'Property') {
    return parent.key?.name ?? parent.key?.value ?? null;
  }
  if (parent?.type === 'AssignmentExpression') {
    return memberName(parent.left);
  }
  return null;
}

export const SECRET_01 = {
  id: 'SECRET-01',
  title: 'Secret written into source',
  severity: 'critical',
  owasp2025: 'A04',
  cwe: ['CWE-798', 'CWE-321'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  fileWide: true,
  prefilter:
    /AKIA|sk_live_|rk_live_|sk-ant-|sk-proj-|gh[pousr]_|xox[baprs]-|AIza|npm_[A-Za-z0-9]{10}|glpat-|SG\.|BEGIN [A-Z ]*PRIVATE KEY|password|secret|token|api_?key|credential/i,
  nodeTypes: ['StringLiteral'],
  match(node, ctx, parent) {
    const value = node.value;
    if (typeof value !== 'string' || value.length < 8) return null;

    for (const provider of PROVIDER_KEYS) {
      if (provider.pattern.test(value)) {
        return {
          node,
          kind: provider.name,
          severityHint: fileLooksLikeTest(ctx.filePath) ? 'medium' : 'critical',
          redacted: `${value.slice(0, 6)}...${value.slice(-2)}`,
        };
      }
    }

    // Nothing matched a known provider. Fall back to "a long string parked in a
    // variable that is obviously a credential".
    const targetName = nameOfTarget(node, parent);
    if (!targetName) return null;
    if (!SECRET_NAMES.test(lastSegment(targetName) ?? targetName)) return null;
    if (value.length < 12) return null;
    if (PLACEHOLDER.test(value)) return null;
    if (!/[0-9]/.test(value) || !/[A-Za-z]/.test(value)) return null;

    return {
      node,
      kind: `a value assigned to ${targetName}`,
      severityHint: fileLooksLikeTest(ctx.filePath) ? 'low' : 'high',
      redacted: `${value.slice(0, 3)}...${value.slice(-2)}`,
    };
  },
  message: (f) =>
    `Source contains ${f.kind} (${f.redacted}). Once it is committed it is in the git history forever, and rotating it is the only fix.`,
  fix: "const key = process.env.STRIPE_SECRET_KEY;\nif (!key) throw new Error('STRIPE_SECRET_KEY is not set');",
};

export const TLS_01 = {
  id: 'TLS-01',
  title: 'TLS certificate checking turned off',
  severity: 'critical',
  owasp2025: 'A02',
  cwe: ['CWE-295'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  fileWide: true,
  prefilter: /rejectUnauthorized|NODE_TLS_REJECT_UNAUTHORIZED|strictSSL|insecure/i,
  nodeTypes: ['ObjectProperty', 'Property', 'AssignmentExpression'],
  match(node, ctx) {
    if (node.type === 'AssignmentExpression') {
      const target = memberName(node.left);
      if (target !== 'process.env.NODE_TLS_REJECT_UNAUTHORIZED') return null;
      const value = staticString(node.right);
      if (value !== '0') return null;
      return { node, kind: 'NODE_TLS_REJECT_UNAUTHORIZED is set to 0' };
    }

    const key = node.key?.name ?? node.key?.value;
    if (key === 'rejectUnauthorized' && isFalse(node.value)) {
      return { node, kind: 'rejectUnauthorized is false' };
    }
    if (key === 'strictSSL' && isFalse(node.value)) {
      return { node, kind: 'strictSSL is false' };
    }
    if (key === 'insecure' && isTrue(node.value)) {
      return { node, kind: 'insecure is true' };
    }
    return null;
  },
  message: (f) =>
    `${f.kind}, so every certificate is accepted. Anyone on the network path can read and change this traffic, and it usually ships to production by accident.`,
  fix: 'Install the right CA certificate instead. For a private CA use the ca option or NODE_EXTRA_CA_CERTS.',
};

export const CORS_01 = {
  id: 'CORS-01',
  title: 'CORS allows any origin',
  severity: 'high',
  owasp2025: 'A02',
  cwe: ['CWE-942', 'CWE-346'],
  api: 'API8',
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /cors|Access-Control-Allow-Origin/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);

    // cors({ origin: true, credentials: true })
    if (full && lastSegment(full) === 'cors') {
      const options = node.arguments[0];
      if (!options || options.type !== 'ObjectExpression') return null;

      const origin = objectValue(options, 'origin');
      const credentials = objectValue(options, 'credentials');
      if (!isTrue(credentials)) return null;

      const originIsWide =
        isTrue(origin) || staticString(origin) === '*' || (origin && ctx.isTainted(origin));
      if (!originIsWide) return null;

      return { node: options, kind: 'cors() reflects any origin and also sends credentials' };
    }

    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    if (full && ['setHeader', 'set', 'header'].includes(lastSegment(full))) {
      const headerName = staticString(node.arguments[0]);
      if (!headerName || headerName.toLowerCase() !== 'access-control-allow-origin') return null;

      const value = node.arguments[1];
      if (value && ctx.isTainted(value)) {
        return { node: value, kind: 'the Allow-Origin header is copied from the request Origin' };
      }
      if (staticString(value) === '*') {
        return {
          node: value,
          kind: 'the Allow-Origin header is a wildcard',
          severityHint: 'medium',
        };
      }
    }

    return null;
  },
  message: (f) =>
    `${f.kind}. Any website a logged in user visits can then read your responses as that user.`,
  fix: "const ALLOWED = new Set(['https://app.example.com']);\napp.use(cors({ origin: (o, cb) => cb(null, ALLOWED.has(o)), credentials: true }));",
};

export const ERR_01 = {
  id: 'ERR-01',
  title: 'Error details sent to the client',
  severity: 'medium',
  owasp2025: 'A10',
  cwe: ['CWE-209'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /\.stack\b|\.send\s*\(|\.json\s*\(/,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    const full = memberName(node.callee);
    if (!full) return null;
    if (!['send', 'json', 'end', 'write'].includes(lastSegment(full))) return null;
    if (!/^(res|reply|response)\b/.test(full)) return null;

    let hit = null;

    const scan = (value) => {
      if (!value || hit) return;
      if (value.type === 'MemberExpression' || value.type === 'OptionalMemberExpression') {
        const name = memberName(value);
        if (name && /\.stack$/.test(name)) hit = { node: value, kind: 'a stack trace' };
        return;
      }
      if (value.type === 'ObjectExpression') {
        for (const prop of value.properties) {
          if (prop.type === 'SpreadElement') continue;
          scan(prop.value);
        }
        return;
      }
      if (value.type === 'Identifier' && /^(err|error|e|exception)$/i.test(value.name)) {
        hit = { node: value, kind: 'the raw error object' };
      }
    };

    for (const arg of node.arguments) scan(arg);
    return hit;
  },
  message: (f) =>
    `Response includes ${f.kind}. That leaks file paths, library versions, and often SQL, which is free reconnaissance for an attacker.`,
  fix: "logger.error({ err, requestId });\nres.status(500).json({ error: 'Internal error', requestId });",
};

export const PROXY_01 = {
  id: 'PROXY-01',
  title: 'Express trusts every proxy',
  severity: 'medium',
  owasp2025: 'A02',
  cwe: ['CWE-16', 'CWE-348'],
  languages: ['js', 'jsx', 'ts', 'tsx', 'vue'],
  prefilter: /trust\s*proxy/i,
  nodeTypes: ['CallExpression', 'OptionalCallExpression'],
  match(node, ctx) {
    if (!calleeEndsWith(node, ['set', 'enable'])) return null;
    const setting = staticString(node.arguments[0]);
    if (setting !== 'trust proxy') return null;

    const value = node.arguments[1];
    if (calleeEndsWith(node, ['enable']) || isTrue(value)) {
      return { node };
    }
    return null;
  },
  message: () =>
    'trust proxy is set to true, so req.ip and req.protocol come from whatever X-Forwarded-For the client sent. Rate limits keyed on req.ip stop working.',
  fix: "app.set('trust proxy', 1)  // the number of proxies you actually run, or a CIDR list",
};

export default [SECRET_01, TLS_01, CORS_01, ERR_01, PROXY_01];
