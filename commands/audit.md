---
name: audit
description: Scan this repository for insecure and slow JavaScript, and write a report.
argument-hint: "[path]"
tools: Bash, Read
---

Scan the repository with guardrails-js and report what it finds.

1. Run the scan. Use the path in `$ARGUMENTS` if one was given, otherwise the current directory.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/audit.mjs" ${ARGUMENTS:-.} --format json
```

2. Read the JSON output and group the findings by severity.

3. Report back in this shape:

- A one line count first, for example: `14 findings: 2 critical, 5 high, 7 medium.`
- Then critical and high findings, one block each, with the file, the line, what is wrong, and the fix.
- Then a single line for medium and low counts by rule, without listing every one.

4. Do not fix anything yet. Ask which findings to work on first, and suggest starting with critical.

Notes:

- The hooks only look at code as it is written. This command looks at everything already in the repo, so a large codebase can return a long list on the first run.
- Findings map to OWASP Top 10:2025 categories and CWE ids. Include those labels when you report.
- If the scan returns nothing, say so plainly rather than inventing concerns.
