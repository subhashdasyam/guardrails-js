// Shell command parsing.
//
// A substring search for "npm install" is wrong in both directions: it misses
// `cd app && npm i lodash` inside a subshell and it fires on an echo. This does
// a small tokenizer instead: split on separators, respect quotes, then read the
// argv of each segment.

const SEPARATORS = new Set(['&&', '||', ';', '|', '&']);

export function tokenize(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  let i = 0;

  const push = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  while (i < command.length) {
    const ch = command[i];

    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < command.length) {
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

    if (ch === '\\' && i + 1 < command.length) {
      current += command[i + 1];
      i += 2;
      continue;
    }

    if (/\s/.test(ch)) {
      push();
      i += 1;
      continue;
    }

    // Separators become their own tokens so segments split cleanly.
    const two = command.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      push();
      tokens.push(two);
      i += 2;
      continue;
    }
    if (ch === ';' || ch === '|' || ch === '&' || ch === '\n') {
      push();
      tokens.push(ch === '\n' ? ';' : ch);
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  push();
  return tokens;
}

/** Split a command line into separate commands, each one an argv array. */
export function segments(command) {
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

const MANAGERS = new Set(['npm', 'yarn', 'pnpm', 'bun', 'npx']);
const INSTALL_SUBCOMMANDS = new Set(['install', 'i', 'add', 'in', 'ins', 'isnt', 'isntall']);

/**
 * Find install commands. Returns one entry per install segment with the flags
 * and the package specifiers it names.
 */
export function findInstallCommands(command) {
  const found = [];

  for (const argv of segments(command)) {
    // Strip leading environment assignments: FOO=bar npm i x
    let start = 0;
    while (start < argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[start])) start += 1;
    if (start >= argv.length) continue;

    let manager = argv[start];
    if (manager === 'sudo') {
      start += 1;
      manager = argv[start];
    }
    if (!manager || !MANAGERS.has(manager)) continue;

    const rest = argv.slice(start + 1);

    // `npm ci` is the safe one and never takes package names.
    if (manager === 'npm' && rest[0] === 'ci') {
      found.push({ manager, subcommand: 'ci', flags: rest.filter((a) => a.startsWith('-')), packages: [], argv });
      continue;
    }

    let subcommand = rest[0];
    let args = rest.slice(1);

    // `npx pkg` runs a package straight from the registry, which downloads and
    // executes it. Treat it as an install.
    if (manager === 'npx') {
      subcommand = 'exec';
      args = rest;
    } else if (!subcommand || !INSTALL_SUBCOMMANDS.has(subcommand)) {
      continue;
    }

    const flags = args.filter((arg) => arg.startsWith('-'));
    const packages = args.filter((arg) => !arg.startsWith('-'));

    found.push({ manager, subcommand, flags, packages, argv });
  }

  return found;
}

/** Split `@scope/name@1.2.3` into its parts. */
export function parseSpecifier(spec) {
  const raw = String(spec);

  if (/^(https?|git|git\+https?|git\+ssh|file|github|gitlab|bitbucket):/i.test(raw)) {
    return { name: raw, version: null, kind: 'remote' };
  }
  if (raw.startsWith('.') || raw.startsWith('/') || raw.startsWith('~')) {
    return { name: raw, version: null, kind: 'path' };
  }
  if (raw.includes('/') && !raw.startsWith('@')) {
    return { name: raw, version: null, kind: 'remote' };
  }

  if (raw.startsWith('@')) {
    const at = raw.indexOf('@', 1);
    if (at === -1) return { name: raw, version: null, kind: 'registry' };
    return { name: raw.slice(0, at), version: raw.slice(at + 1), kind: 'registry' };
  }

  const at = raw.indexOf('@');
  if (at === -1) return { name: raw, version: null, kind: 'registry' };
  return { name: raw.slice(0, at), version: raw.slice(at + 1), kind: 'registry' };
}

/** Other things on a command line that are worth a word. */
export function riskyShellPatterns(command) {
  const notes = [];

  if (/curl[^|]*\|\s*(sudo\s+)?(ba)?sh/i.test(command) || /wget[^|]*\|\s*(sudo\s+)?(ba)?sh/i.test(command)) {
    notes.push('a script is downloaded and piped straight into a shell, so nobody reads it first');
  }
  if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0/.test(command)) {
    notes.push('NODE_TLS_REJECT_UNAUTHORIZED=0 turns off certificate checking for this command');
  }
  if (/npm\s+config\s+set\s+ignore-scripts\s+false/.test(command)) {
    notes.push('this turns install scripts back on');
  }
  if (/--unsafe-perm/.test(command)) {
    notes.push('--unsafe-perm runs install scripts as root');
  }
  if (/npm\s+config\s+set\s+registry|--registry[= ]/.test(command)) {
    notes.push('the registry is being changed, which decides where the code comes from');
  }

  return notes;
}
