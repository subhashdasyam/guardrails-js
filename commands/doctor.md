---
name: doctor
description: Check that guardrails-js can actually run, and fix it if not.
tools: Bash, Read
---

Work out whether the plugin's hooks can run on this machine. If they cannot, fix it.

The hooks are Node scripts. Claude Code spawns `node` directly with the script path as its argument, with no shell in between, so nothing here depends on PowerShell being allowed or on Git Bash being installed. What it does depend on is `node` resolving on the PATH Claude Code inherited. If it does not, every hook fails to start and the plugin silently does nothing, which is exactly the symptom that brings people here.

## Step 1: diagnose

```bash
node --version 2>&1 || echo "NODE NOT FOUND"
command -v node 2>/dev/null || where node 2>/dev/null || echo "not on PATH"
node "${CLAUDE_PLUGIN_ROOT}/dist/audit.mjs" --help >/dev/null 2>&1 && echo "hooks can run" || echo "hooks cannot run"
```

If `node --version` printed a version and the hooks can run, say so with the version and path, and stop. Nothing is wrong.

If node was not found, continue.

## Step 2: find the node that is already installed

Almost always there is a working node, just not on the PATH this process inherited. Find it:

```bash
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
V=$(ls -1 "$NVM_DIR/versions/node" 2>/dev/null | sort -V | tail -1)
[ -n "$V" ] && echo "nvm: $NVM_DIR/versions/node/$V/bin/node"
for p in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node "$HOME/.local/share/fnm/aliases/default/bin/node" "$HOME/.volta/bin/node"; do
  [ -x "$p" ] && echo "found: $p"
done
```

Run whichever path it prints with `--version` to confirm it works before using it.

**You do not need to source `nvm.sh`.** That script exists to define the `nvm` shell function and to rewrite PATH. The node binary needs none of it and runs from its own path with an empty environment. Sourcing it would not help here anyway, because there is no shell in the middle to source it into.

## Step 3: apply the fix

Show the user the command first and let them approve it. `/usr/local/bin` is on the default PATH on both macOS and Linux, including for apps launched from the Dock or a desktop launcher, which is the case that breaks:

```bash
sudo ln -sf "<the node path from step 2>" /usr/local/bin/node
```

Then verify, and tell them to restart Claude Code, since a running process keeps the PATH it started with:

```bash
/usr/local/bin/node --version
```

This fixes node for every tool on the machine, not only this plugin.

If they would rather not use `sudo`, the alternatives, in the order worth trying:

1. Start Claude Code from a terminal where `node --version` already works. Nothing to install, fixes it immediately, but only for sessions started that way.
2. Switch to a version manager that installs a real shim instead of a shell function, so node resolves everywhere: `fnm`, `volta`, or `asdf`.

## Windows

`where node` should print a path. If it does not, reinstall from nodejs.org with the PATH option ticked, or use `fnm` or `volta`. Restart Claude Code afterwards, since PATH changes do not reach a running process. nvm for Windows is a different program from the Unix one and keeps node on PATH through a symlink, so the nvm case above does not apply.

## Do not

Do not set `PATH` in `settings.json` under `env`. Claude Code writes those values in **replacing** what the shell provided, and it does not expand `${PATH}`, so the session and everything it spawns would be left with only the literal string you wrote.

Report what you found and what you changed.
