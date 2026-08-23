// Paired cases for the Vue and Nuxt pack.
//
// The template rules only run for .vue files, so these all set `file`.

export default [
  {
    rule: 'XSS-03',
    file: 'src/Comment.vue',
    fire: `<template>
  <div v-html="comment.body" />
</template>

<script setup>
const props = defineProps({ comment: Object });
</script>`,
    safe: [
      `<template>
  <div>{{ comment.body }}</div>
</template>

<script setup>
const props = defineProps({ comment: Object });
</script>`,
      `<template>
  <div v-html="sanitize(comment.body)" />
</template>

<script setup>
import { sanitize } from './sanitize.js';
</script>`,
    ],
  },

  {
    rule: 'VUE-URL',
    file: 'src/Item.vue',
    fire: `<template>
  <a :href="item.url">open</a>
</template>

<script setup>
const props = defineProps({ item: Object });
</script>`,
    safe: [
      `<template>
  <a :href="safeUrl">open</a>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ item: Object });
const safeUrl = computed(() => (/^https?:\\/\\//.test(props.item.url) ? props.item.url : '#'));
</script>`,
      `<template>
  <a href="/dashboard">open</a>
</template>

<script setup>
const nothing = 1;
</script>`,
    ],
  },

  {
    rule: 'VUE-SSR',
    file: 'src/render.js',
    fire: `const app = createSSRApp(req.body.template);`,
    safe: [
      `const app = createSSRApp(RootComponent);`,
      `const app = createSSRApp({ template: '<p>hello</p>' });`,
    ],
  },

  {
    rule: 'VITE-HOST',
    file: 'vite.config.js',
    fire: `export default defineConfig({
      server: { host: true, port: 5173 },
    });`,
    safe: [
      `export default defineConfig({
        server: { host: 'localhost', port: 5173 },
      });`,
      `export default defineConfig({
        server: { port: 5173 },
      });`,
    ],
  },

  {
    rule: 'NUXT-ROUTE-RULES',
    file: 'nuxt.config.ts',
    fire: `export default defineNuxtConfig({
      routeRules: {
        '/admin/**': { ssr: false },
      },
    });`,
    safe: [
      `export default defineNuxtConfig({
        routeRules: {
          '/blog/**': { prerender: true },
        },
      });`,
      `export default defineNuxtConfig({
        ssr: true,
      });`,
    ],
  },
];
