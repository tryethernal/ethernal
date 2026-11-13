import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// Posts marked `noindex: true` in frontmatter stay out of the sitemap.
const contentDir = new URL('./src/content/blog/', import.meta.url);
const noindexSlugs = new Set(
  readdirSync(contentDir)
    .filter((f) => /\.mdx?$/.test(f))
    .filter((f) => /^noindex:\s*true\s*$/m.test(readFileSync(new URL(f, contentDir), 'utf8').split(/^---\s*$/m)[1] || ''))
    .map((f) => f.replace(/\.mdx?$/, ''))
);

export default defineConfig({
  site: 'https://tryethernal.com',
  base: '/blog',
  output: 'static',
  integrations: [vue(), tailwind(), sitemap({ filter: (page) => !noindexSlugs.has(new URL(page).pathname.replace(/^\/blog\//, '').replace(/\/$/, '')) })],
  server: {
    allowedHosts: true,
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  trailingSlash: 'never',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
