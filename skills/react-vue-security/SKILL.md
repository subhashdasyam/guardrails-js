---
name: react-vue-security
description: Fix recipes for React, Next.js, Vue, and Nuxt security and rendering problems. Use when writing components, server actions, middleware, or templates, when handling HTML from users, or when a guardrails-js finding points at a frontend file.
---

# Fixing React, Next.js, Vue, and Nuxt code

## Rendering HTML you did not write

Framework escaping protects you until you deliberately switch it off. `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, and Angular's `bypassSecurityTrust*` are all the same escape hatch wearing different names.

```jsx
// wrong
<div dangerouslySetInnerHTML={{ __html: comment.body }} />

// right
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body) }} />

// better, when you do not actually need HTML
<div>{comment.body}</div>
```

Vue is the same shape:

```vue
<!-- wrong -->
<div v-html="comment" />

<!-- right -->
<div>{{ comment }}</div>
```

Never build a template from a string a user supplied. Template compilers reach the runtime, so that is code execution and not just markup.

## Links and messages

```jsx
// a URL from anywhere untrusted can be javascript: or data:text/html
const safe = /^https?:\/\//.test(url) ? url : '#';
<a href={safe} target="_blank" rel="noopener noreferrer">open</a>
```

Every `postMessage` handler needs an exact origin check as its first line:

```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://widgets.example.com') return;
  if (typeof event.data?.text !== 'string') return;
  handle(event.data.text);
});
```

## Next.js

Three things that have bitten real applications:

1. Middleware is not an authorization boundary on its own. CVE-2025-29927 let a request header skip it entirely. Check auth again inside the route handler or server action. Fixed in 12.3.5, 13.5.9, 14.2.25, and 15.2.3, so upgrade as well.
2. Every function marked `'use server'` is a public HTTP endpoint. It does not inherit protection from the page that calls it. Give each one its own auth check, its own input validation, and its own rate limit.
3. React Server Components had an unauthenticated remote code execution bug, CVE-2025-55182, in `react-server-dom` 19.0 through 19.2.0. Keep those packages patched.

```js
// wrong: assumes the page checked
'use server';
export async function deleteProject(id) {
  await db.project.delete({ where: { id } });
}

// right
'use server';
export async function deleteProject(id) {
  const session = await auth();
  if (!session) throw new Error('unauthorized');
  const parsed = z.string().uuid().parse(id);
  await db.project.delete({ where: { id: parsed, orgId: session.orgId } });
}
```

## Nuxt and Vite

Never expose a dev server or devtools to a network. Vite CVE-2025-30208 and CVE-2025-31125 served arbitrary files that way, and Nuxt CVE-2025-24360 leaked source through permissive dev CORS. Bind to localhost and keep `--host` out of shared environments.

Route rules are routing, not authorization. Check auth in the handler.

## Rendering performance, and when not to bother

Do not add `useMemo` everywhere. React's own documentation says it helps for a noticeably slow calculation with stable dependencies and does nothing otherwise. Wrapping cheap expressions makes the code harder to read and slightly slower.

Worth fixing:

- Keys. Use a stable database id. An array index makes React reuse the wrong row, which loses input state and shows the wrong data.
- New objects, arrays, or functions passed as props to a memoized child. They defeat the memo on every render.
- Derived state computed inside `useEffect`. Work it out during render instead. The effect version renders twice and can loop.
- Long lists with no virtualization.
- Sequential awaits for requests that do not depend on each other.

Vue equivalents: key every `v-for`, do not put `v-if` on the same element as `v-for`, use `shallowRef` for large objects you never mutate deeply, and avoid `deep: true` watchers on big trees.

## When a finding is wrong

```jsx
{/* guardrails-js-ignore XSS-01 -- body is sanitised in the loader, see api/posts.ts */}
```

The reason is required.
