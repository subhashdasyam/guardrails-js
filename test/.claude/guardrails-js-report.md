# guardrails-js report

Written by the guardrails-js plugin as Claude edits files.

## engine.test.mjs

### SECRET-01 line 352
- severity: medium | OWASP A04:2025 | CWE-798 CWE-321
- Source contains a Stripe live secret key (const ...";). Once it is committed it is in the git history forever, and rotating it is the only fix.
- found: `'const key = "sk_live_51H8xKzABCDEFGHIJKLMNOP";'`
- fix:

```js
const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
```