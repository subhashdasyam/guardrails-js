---
name: report
description: Show what guardrails-js has flagged so far in this session.
tools: Bash, Read
---

Show the running report for this session.

1. Read `.claude/guardrails-js-report.md` from the project root. If it is not there, say that nothing has been flagged yet and stop.

2. Summarise it:

- Total count, broken down by severity.
- Which files came up most.
- Anything marked `(repeat, downgraded)`, which means a fix was attempted twice and the finding is still there. Those deserve a second look, because either the fix did not work or the rule is wrong about this code.

3. Offer two next steps and nothing more: fix the critical and high findings now, or add a suppression with a reason for anything that is a false positive.

Suppression format, for reference:

```js
// guardrails-js-ignore SQL-01 -- id is an integer validated by the route schema
```

The reason after `--` is required. An ignore without one gets reported itself.
