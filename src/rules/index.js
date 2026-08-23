import injection from './node-core/injection.js';
import ssrf from './node-core/ssrf.js';
import deserialization from './node-core/deserialization.js';
import secretsConfig from './node-core/secrets-config.js';

export const RULES = [...injection, ...ssrf, ...deserialization, ...secretsConfig];

export const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

export const PACKS = {
  'node-core': [...injection, ...ssrf, ...deserialization, ...secretsConfig].map((r) => r.id),
};
