---
name: threat-data
description: Inspect, refresh, or manually import the guardrails-js SQLite threat database.
tools: Bash, Read
---

Run `node "${CLAUDE_PLUGIN_ROOT}/dist/threat-data.mjs" status` and explain the active backend, source snapshot date, and last failed update routes.

If the user requested an update, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/threat-data.mjs" refresh --force
```

This retries direct GitHub download, a shallow clone of the data branch, then a local build from the OSV/npm sources. Node 20.17+ automatically installs the pinned sqlite3 driver if needed. It can take several minutes. Respect `network:false`; never change that setting implicitly.

When network access is blocked, explain how to obtain the data on an accessible machine:

```bash
git clone --depth 1 --single-branch --branch threat-data https://github.com/subhashdasyam/guardrails-js.git guardrails-threat-data
node "${CLAUDE_PLUGIN_ROOT}/dist/threat-data.mjs" import ./guardrails-threat-data
```

Use a new clone directory. The import needs both `threat-data.db` and `manifest.json`; transfer both when downloading on another machine. The import verifies freshness, integrity, and schema before activation. If Node 20's native driver cannot be installed behind the firewall, recommend Node 22.13+ with built-in SQLite or preparing the driver on a machine with the same operating system and architecture. Do not claim an old database has become fresh just because it was copied.
