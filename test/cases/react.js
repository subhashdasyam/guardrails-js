// Paired cases for the React and Next.js pack.
//
// Some of these need a particular filename or extension, so cases can set
// `file`.

export default [
  {
    rule: 'XSS-01',
    file: 'src/Comment.tsx',
    fire: `export function Comment({ comment }) {
      return <div dangerouslySetInnerHTML={{ __html: comment.body }} />;
    }`,
    safe: [
      `export function Comment({ comment }) {
        return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body) }} />;
      }`,
      `export function Comment({ comment }) {
        return <div>{comment.body}</div>;
      }`,
    ],
  },

  {
    rule: 'XSS-02',
    file: 'src/render.js',
    fire: `container.innerHTML = comment.body;`,
    safe: [`container.textContent = comment.body;`, `container.innerHTML = DOMPurify.sanitize(html);`],
  },

  {
    rule: 'XSS-05',
    file: 'src/run.js',
    fire: `const result = eval(userSuppliedExpression);`,
    safe: [`const result = JSON.parse(text);`, `setTimeout(() => refresh(), 1000);`],
  },

  {
    rule: 'XSS-06',
    file: 'src/Link.tsx',
    fire: `export function Item({ item }) {
      return <a href={item.url}>open</a>;
    }`,
    safe: [
      `export function Item({ item }) {
        const safe = /^https?:\\/\\//.test(item.url) ? item.url : '#';
        return <a href={safe}>open</a>;
      }`,
      `export function Item() {
        return <a href={'/dashboard'}>open</a>;
      }`,
    ],
  },

  {
    rule: 'MSG-01',
    file: 'src/bridge.js',
    fire: `window.addEventListener('message', (event) => {
      applyConfig(event.data);
    });`,
    safe: [
      `window.addEventListener('message', (event) => {
        if (event.origin !== TRUSTED_ORIGIN) return;
        applyConfig(event.data);
      });`,
      `window.addEventListener('click', (event) => track(event.target));`,
    ],
  },

  {
    rule: 'LINK-01',
    file: 'src/Out.tsx',
    fire: `export const Out = ({ url }) => <a href={url} target="_blank">open</a>;`,
    safe: [
      `export const Out = ({ url }) => <a href={url} target="_blank" rel="noopener noreferrer">open</a>;`,
      `export const Out = ({ url }) => <a href={url}>open</a>;`,
    ],
  },

  {
    rule: 'NEXT-MW',
    file: 'middleware.ts',
    fire: `import { NextResponse } from 'next/server';

    export function middleware(request) {
      const session = request.cookies.get('session');
      if (!session) return NextResponse.redirect(new URL('/login', request.url));
      return NextResponse.next();
    }`,
    safe: [
      `import { NextResponse } from 'next/server';

       export function middleware() {
         return NextResponse.next();
       }`,
      `import { NextResponse } from 'next/server';
       export function handler() {
         return NextResponse.redirect('/login');
       }`,
    ],
    safeFiles: [null, 'src/api/handler.ts'],
  },

  {
    rule: 'SERVER-ACTION',
    file: 'app/actions.ts',
    fire: `'use server';

    export async function deleteProject(id) {
      await db.project.delete({ where: { id } });
    }`,
    safe: [
      `'use server';

       export async function deleteProject(id) {
         const session = await auth();
         if (!session) throw new Error('unauthorized');
         await db.project.delete({ where: { id, orgId: session.orgId } });
       }`,
      `'use server';

       async function helper(id) {
         return db.project.findMany({ where: { id } });
       }`,
    ],
  },

  {
    rule: 'NEXT-IMG',
    file: 'next.config.js',
    fire: `module.exports = {
      images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
    };`,
    safe: [
      `module.exports = {
        images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
      };`,
      `module.exports = {
        images: { domains: ['cdn.example.com'] },
      };`,
    ],
  },
];
