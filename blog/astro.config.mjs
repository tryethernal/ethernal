import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';

// Posts marked `noindex: true` in frontmatter stay out of the sitemap. Parsed
// with js-yaml, the same parser Astro uses for frontmatter, so the sitemap and
// the robots meta tag always agree.
const contentDir = new URL('./src/content/blog/', import.meta.url);
const frontmatter = (file) => {
  const match = readFileSync(new URL(file, contentDir), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? yaml.load(match[1]) || {} : {};
};
const noindexSlugs = new Set(
  readdirSync(contentDir)
    .filter((f) => /\.mdx?$/.test(f))
    .filter((f) => frontmatter(f).noindex === true)
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
