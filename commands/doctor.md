---
name: doctor
description: Check that guardrails-js can actually run, and say how to fix it if not.
tools: Bash, Read
---

Work out whether the plugin's hooks can run on this machine, then report.

The hooks are Node scripts launched by the shell as `node "<plugin>/dist/<hook>.mjs"`. If `node` is not on the PATH that Claude Code inherited, every hook fails with exit 127 and the plugin does nothing.

Run these and read the results:

```bash
node --version
command -v node || where node
echo "$PATH"
ls "${CLAUDE_PLUGIN_ROOT}/dist" 2>/dev/null || echo "plugin dist not found"
node "${CLAUDE_PLUGIN_ROOT}/dist/audit.mjs" --help >/dev/null 2>&1 && echo "hook scripts run" || echo "hook scripts do not run"
```

Then report in this shape:

- One line: working, or not working and why.
- If `node --version` failed, that is the whole problem. Give the fix for their operating system from the list below and stop.
- If node works and the dist listing worked, say the plugin is fine and print the node version and path.

## Fixes when node is not found

**macOS or Linux with nvm.** This is the usual cause. nvm is a shell function sourced from `~/.nvm/nvm.sh` by `.bashrc` or `.zshrc`. A non-interactive shell does not read those, so a Claude Code launched from the Dock or a desktop launcher has no node on PATH, while one launched from a terminal does.

Pick one:

1. Start Claude Code from a terminal where `node --version` already works. Simplest, fixes it immediately.
2. Move to a version manager that installs real shims rather than a shell function, so node resolves everywhere: `fnm`, `volta`, or `asdf`.
3. Symlink the node you use into a directory that is always on PATH:

```bash
sudo ln -sf "$(which node)" /usr/local/bin/node
```

**macOS with Homebrew.** Node is at `/opt/homebrew/bin/node` on Apple silicon and `/usr/local/bin/node` on Intel. Both are normally on PATH. If not, `brew link node`.

**Windows.** The official installer adds node to PATH. Check with `where node` in a new terminal. If it is missing, reinstall from nodejs.org and tick the PATH option, or use `fnm` or `volta`. Restart Claude Code afterwards, since PATH changes do not reach a running process.

**Any platform, as a last resort.** Point the hooks at an absolute node path yourself. Copy the three entries from `<plugin>/hooks/hooks.json` into your own `.claude/settings.json` and replace `node` with the full path, for example `/Users/you/.nvm/versions/node/v22.14.0/bin/node`. Then disable the plugin's own hooks so they do not run twice.

Do not offer to edit any of these files. Report what you found and what the user should do.
