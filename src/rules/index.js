import injection from './node-core/injection.js';
import ssrf from './node-core/ssrf.js';
import deserialization from './node-core/deserialization.js';
import secretsConfig from './node-core/secrets-config.js';
import prototypePollution from './node-core/prototype-pollution.js';
import auth from './node-auth/auth.js';
import access from './node-auth/access.js';
import limits from './node-dos/limits.js';
import xss from './react/xss.js';
import next from './react/next.js';

export const PACKS = {
  'node-core': [...injection, ...ssrf, ...deserialization, ...secretsConfig, ...prototypePollution],
  'node-auth': [...auth, ...access],
  'node-dos': [...limits],
  react: [...xss, ...next],
};

export const RULES = Object.values(PACKS).flat();

export const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));
