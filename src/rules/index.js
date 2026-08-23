import injection from './node-core/injection.js';
import ssrf from './node-core/ssrf.js';
import deserialization from './node-core/deserialization.js';
import secretsConfig from './node-core/secrets-config.js';
import prototypePollution from './node-core/prototype-pollution.js';
import auth from './node-auth/auth.js';
import access from './node-auth/access.js';
import limits from './node-dos/limits.js';
import xss from './react/xss.js';
import nextRules from './react/next.js';
import vueRules from './vue/vue.js';
import perfNode from './perf-node/perf.js';
import perfFrontend from './perf-react/perf.js';
import supply from './supply/manifest.js';
import nestTrpc from './backend/nest-trpc.js';
import angularSvelte from './frontend/angular-svelte.js';

export const PACKS = {
  'node-core': [...injection, ...ssrf, ...deserialization, ...secretsConfig, ...prototypePollution],
  'node-auth': [...auth, ...access],
  'node-dos': [...limits],
  react: [...xss, ...nextRules],
  vue: [...vueRules],
  'perf-node': [...perfNode],
  'perf-frontend': [...perfFrontend],
  supply: [...supply],
  backend: [...nestTrpc],
  frontend: [...angularSvelte],
};

export const RULES = Object.values(PACKS).flat();

export const RULES_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));
