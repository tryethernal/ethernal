<!--
  @fileoverview 404 page for the landing site.
  @component NotFoundPage
  Prerendered at /404 by vite-ssg and served by Caddy with an HTTP 404 status for unknown
  paths on tryethernal.com. Carries a noindex meta tag and is excluded from the sitemap.
-->
<template>
    <LandingLayout>
        <v-container style="max-width: 760px; padding-top: 140px; padding-bottom: 100px;">
            <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">ERROR 404</div>
            <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.6rem); letter-spacing: -0.02em;">Page not found</h1>
            <p style="color: var(--text-secondary); line-height: 1.7; font-size: 1rem; max-width: 560px;">
                The page you are looking for does not exist or has moved. These pages might help.
            </p>

            <div class="nf-links mt-8">
                <router-link v-for="link in links" :key="link.to" :to="link.to" class="nf-link">
                    <v-icon size="18" style="color: #5DAAE0;">{{ link.icon }}</v-icon>
                    <div>
                        <span class="nf-title">{{ link.title }}</span>
                        <span class="nf-desc">{{ link.desc }}</span>
                    </div>
                </router-link>
            </div>
        </v-container>
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';

const links = [
    { to: '/', icon: 'mdi-home-outline', title: 'Home', desc: 'Open-source block explorer for any EVM chain' },
    { to: '/pricing', icon: 'mdi-tag-outline', title: 'Pricing', desc: 'Starter (free), Team, App Chain and Enterprise plans' },
    { to: '/launch-block-explorer', icon: 'mdi-rocket-launch-outline', title: 'Launch an explorer', desc: 'Hosted block explorer for your EVM chain' },
    { to: '/guides', icon: 'mdi-book-open-variant', title: 'Guides', desc: 'Step-by-step block explorer setup guides' }
];

useHead({
    title: 'Page not found | Ethernal',
    meta: [
        { name: 'robots', content: 'noindex, follow' }
    ]
});
</script>

<style scoped>
.nf-links { display: flex; flex-direction: column; gap: 8px; }
.nf-link { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; text-decoration: none; transition: border-color 0.2s; }
.nf-link:hover { border-color: var(--border-glow); }
.nf-link div { display: flex; flex-direction: column; gap: 2px; }
.nf-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.nf-desc { color: var(--text-muted); font-size: 0.8rem; }
</style>
