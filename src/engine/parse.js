// Parsing. Babel is imported lazily by the caller so a clean file never pays
// for loading it.

import { parse as babelParse } from '@babel/parser';

const BASE_PLUGINS = [
  'jsx',
  'decorators-legacy',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'dynamicImport',
  'exportDefaultFrom',
  'importAttributes',
  'explicitResourceManagement',
];

export const SUPPORTED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.vue',
  '.svelte',
]);

export function languageOf(filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith('.vue')) return 'vue';
  if (lower.endsWith('.svelte')) return 'svelte';
  if (lower.endsWith('.tsx')) return 'tsx';
  if (lower.endsWith('.jsx')) return 'jsx';
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return 'ts';
  return 'js';
}

/**
 * Blank out everything in a .vue or .svelte file except the contents of its
 * <script> blocks, replacing each removed character with a space and keeping
 * newlines. Offsets and line numbers in the result match the original file
 * exactly, so findings point at the right line with no mapping table.
 *
 * Markup is handled separately by the template rules. Both formats put their
 * code in <script>, so one function covers them.
 */
export function blankOutsideScript(source) {
  const buffer = Array.from(source, (ch) => (ch === '\n' ? '\n' : ' '));
  const blockPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  let found = false;
  let lang = 'js';
  let match;

  while ((match = blockPattern.exec(source)) !== null) {
    found = true;
    if (/lang\s*=\s*["'](ts|typescript)["']/i.test(match[1])) lang = 'ts';

    const openTagEnd = match.index + match[0].indexOf('>') + 1;
    const body = match[2];
    for (let i = 0; i < body.length; i += 1) buffer[openTagEnd + i] = body[i];
  }

  return { code: found ? buffer.join('') : '', lang, found };
}

function pluginsFor(language) {
  switch (language) {
    case 'ts':
      return [...BASE_PLUGINS, 'typescript'];
    case 'tsx':
      return [...BASE_PLUGINS, 'typescript'];
    default:
      return [...BASE_PLUGINS, 'flow'];
  }
}

/**
 * Parse a file. Returns { ast, code, language } or { error } when the source
 * cannot be parsed at all. A parse failure is never reported to the user: half
 * written code is normal while Claude is editing, and shouting about it would
 * be noise.
 */
export function parseSource(source, filePath) {
  let language = languageOf(filePath);
  let code = source;

  if (language === 'vue' || language === 'svelte') {
    const extracted = blankOutsideScript(source);
    if (!extracted.found) return { error: 'no script block' };
    code = extracted.code;
    language = extracted.lang;
  }

  const attempts = [
    { sourceType: 'module', plugins: pluginsFor(language) },
    { sourceType: 'script', plugins: pluginsFor(language) },
  ];

  // A .js file with TypeScript syntax happens often enough in mixed repos.
  if (language === 'js' || language === 'jsx') {
    attempts.push({ sourceType: 'module', plugins: [...BASE_PLUGINS, 'typescript'] });
  }

  let lastError = null;
  for (const options of attempts) {
    try {
      const ast = babelParse(code, {
        ...options,
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        allowSuperOutsideMethod: true,
        allowUndeclaredExports: true,
        errorRecovery: true,
        ranges: true,
        attachComment: true,
      });
      return { ast, code, language };
    } catch (err) {
      lastError = err;
    }
  }

  return { error: lastError ? lastError.message : 'parse failed' };
}
