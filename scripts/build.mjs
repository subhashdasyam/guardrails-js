// Bundle each hook into a single file with no runtime dependencies.
//
// The output lives in dist/ and is committed. Claude Code installs plugins by
// cloning, and its npm install step is best effort: it is skipped when a yarn
// or pnpm lockfile is present and a failure does not stop the plugin loading.
// A security tool cannot depend on that. Shipping zero runtime dependencies
// also means this plugin has no supply chain of its own.

import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const ENTRIES = [
  ['src/hooks/session-start.js', 'dist/session-start.mjs'],
  ['src/hooks/post-write.js', 'dist/post-write.mjs'],
  ['src/hooks/pre-bash.js', 'dist/pre-bash.mjs'],
  ['src/hooks/audit.js', 'dist/audit.mjs'],
];

const banner = `// Built by scripts/build.mjs. Do not edit. Source lives in src/.\n`;

async function run() {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });

  for (const [entry, output] of ENTRIES) {
    await build({
      entryPoints: [path.join(root, entry)],
      outfile: path.join(root, output),
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      minify: false,
      legalComments: 'none',
      banner: { js: banner },
      loader: { '.json': 'json' },
      logLevel: 'warning',
    });

    const size = fs.statSync(path.join(root, output)).size;
    process.stdout.write(`${output.padEnd(28)} ${(size / 1024).toFixed(0)} KB\n`);
  }

  // The audit entry doubles as the CLI, so give it a shebang and make it
  // executable. bin/ is added to the Bash tool PATH by Claude Code.
  const auditFile = path.join(root, 'dist/audit.mjs');
  const contents = fs.readFileSync(auditFile, 'utf8');
  if (!contents.startsWith('#!')) {
    fs.writeFileSync(auditFile, `#!/usr/bin/env node\n${contents}`, 'utf8');
  }
  fs.chmodSync(auditFile, 0o755);

  // bin/ is added to the Bash tool PATH by Claude Code, so this is how the
  // audit runs headless. It calls main directly: the bundle only self starts
  // when argv[1] is the bundle itself, which it is not when invoked through
  // this shim.
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  const shim = [
    '#!/usr/bin/env node',
    "// Built by scripts/build.mjs. Do not edit.",
    "import { main } from '../dist/audit.mjs';",
    '',
    'main(process.argv.slice(2));',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, 'bin/guardrails-js'), shim, 'utf8');
  fs.chmodSync(path.join(root, 'bin/guardrails-js'), 0o755);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
