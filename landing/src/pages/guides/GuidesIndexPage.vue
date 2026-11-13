<!--
  @fileoverview Hub page listing the block explorer setup guides.
  @component GuidesIndexPage
  Lists the four guides under /guides. Emits BreadcrumbList and ItemList JSON-LD generated from the
  same data that is rendered.
-->
<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="gi-hero">
                <nav class="gi-breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <span class="current">Guides</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">GUIDES</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer Guides</h1>
                <p style="color: var(--text-secondary); max-width: 600px; line-height: 1.6; font-size: 0.95rem;">
                    Step-by-step guides to create, self-host and configure an EVM block explorer with Ethernal, including OP Stack and Arbitrum Orbit chains.
                </p>
            </div>

            <div class="gi-list my-12">
                <router-link v-for="guide in guides" :key="guide.to" :to="guide.to" class="gi-card">
                    <v-icon size="24" style="color: #5DAAE0;">{{ guide.icon }}</v-icon>
                    <div>
                        <h2 class="gi-title">{{ guide.title }}</h2>
                        <p class="gi-desc">{{ guide.desc }}</p>
                    </div>
                </router-link>
            </div>

            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.7;">
                Looking for a comparison first? See
                <router-link to="/build-vs-buy-block-explorer" class="gi-link">build vs buy</router-link>
                or <router-link to="/etherscan-alternative" class="gi-link">Etherscan alternatives</router-link>.
            </p>
        </v-container>
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';

const guides = [
    { to: '/guides/create-block-explorer', icon: 'mdi-compass-outline', title: 'How to Create a Block Explorer for an EVM Chain', desc: 'Build, self-host or use hosted Ethernal, then set up a hosted explorer from an RPC URL.' },
    { to: '/guides/self-host-block-explorer', icon: 'mdi-docker', title: 'How to Self-Host a Block Explorer with Docker', desc: 'Run Ethernal on your own server with Docker Compose. The self-hosted version is in beta.' },
    { to: '/guides/op-stack-block-explorer', icon: 'mdi-layers-outline', title: 'How to Set Up a Block Explorer for an OP Stack Chain', desc: 'Connect the OptimismPortal and Batch Inbox contracts to track deposits, withdrawals and batches.' },
    { to: '/guides/arbitrum-orbit-block-explorer', icon: 'mdi-orbit-variant', title: 'How to Set Up a Block Explorer for an Arbitrum Orbit Chain', desc: 'Connect the rollup, bridge and gateway contracts to track Orbit batches and withdrawals.' }
];

const title = 'Block Explorer Guides: Create, Host, Configure';
const description = 'Step-by-step guides to create, self-host and configure an EVM block explorer with Ethernal, including OP Stack and Arbitrum Orbit chains.';

useHead({
    title,
    meta: [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: 'https://tryethernal.com/guides' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description }
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/guides' }
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryethernal.com/' },
                    { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryethernal.com/guides' }
                ]
            })
        },
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: 'Block Explorer Guides',
                url: 'https://tryethernal.com/guides',
                description,
                mainEntity: {
                    '@type': 'ItemList',
                    itemListElement: guides.map((g, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: g.title,
                        url: `https://tryethernal.com${g.to}`
                    }))
                }
            })
        }
    ]
});
</script>

<style scoped>
.gi-hero { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
.gi-breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.gi-breadcrumb a { color: #5DAAE0; text-decoration: none; }
.gi-breadcrumb a:hover { text-decoration: underline; }
.gi-breadcrumb .sep { color: var(--text-muted); }
.gi-breadcrumb .current { color: var(--text-secondary); }

.gi-list { display: flex; flex-direction: column; gap: 12px; max-width: 800px; }
.gi-card { display: flex; align-items: flex-start; gap: 16px; padding: 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; text-decoration: none; transition: border-color 0.2s; }
.gi-card:hover { border-color: var(--border-glow); }
.gi-title { color: var(--text-primary); font-size: 1.05rem; font-weight: 600; margin: 0 0 4px; }
.gi-desc { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0; }
.gi-link { color: #5DAAE0; text-decoration: underline; text-underline-offset: 3px; }
</style>
