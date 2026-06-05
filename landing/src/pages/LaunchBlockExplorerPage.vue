<!--
  @fileoverview Landing page targeting EVM block-explorer hosting intent.
  @component LaunchBlockExplorerPage
  Targets GSC quick-win queries (pos 5-15, ~0% CTR): "evm explorer", "evm scan",
  "block explorer hosting", "launch custom block explorer". Follows the
  HardhatPage.vue wedge-landing pattern (hero + FeatureSection blocks + HowTo/
  BreadcrumbList JSON-LD).
-->
<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">BLOCK EXPLORER HOSTING</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Launch a Custom EVM Block Explorer</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Point Ethernal at any EVM RPC URL and get a hosted block explorer in under five minutes. Transaction decoding, contract verification, and full white-label branding, hosted for you or self-hosted under an MIT license.
                </p>
                <div class="mt-4 d-flex ga-3 flex-wrap">
                    <a :href="`${appUrl}/auth?flow=public`" class="btn-primary">Launch your explorer</a>
                    <a href="/build-vs-buy-block-explorer" class="btn-secondary">Compare hosting vs building</a>
                </div>
            </div>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-rocket-launch"
                title="From RPC URL to live explorer in 5 minutes"
                description="Launching a custom block explorer normally means standing up an indexer, a database, and a frontend. With Ethernal you paste your EVM RPC URL and the explorer is live. No indexer to operate, no DevOps team required."
            >
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">
                                <v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>
                                app.tryethernal.com/onboarding
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-comment"># Add your chain</span></div>
                            <div><span class="t-prompt">RPC URL  </span><span class="t-str">https://rpc.yourchain.com</span></div>
                            <div><span class="t-prompt">Chain ID </span><span class="t-cmd">84532</span></div>
                            <div class="mt-3"><span class="t-success">&#10003; Connected to chain</span></div>
                            <div><span class="t-success">&#10003; Indexing blocks...</span></div>
                            <div><span class="t-success">&#10003; Explorer live at explorer.yourchain.com</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-palette-outline"
                title="Your brand, your domain, your EVM scan"
                description="Full white-label branding means your users see your logo, colors, and custom domain, not a provider's chrome. The result is an Etherscan-style EVM scan for your chain that looks like it was built in-house."
                :reverse="true"
            >
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">
                                <v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>
                                explorer.yourchain.com
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-contract-sync">
                                <div class="mock-verified-banner">
                                    <span class="mock-check">&#10003;</span>
                                    White-label explorer live
                                </div>
                                <div class="mock-meta-grid">
                                    <div class="mock-meta-item"><span class="mock-meta-label">Domain</span><span class="mock-meta-val">explorer.yourchain.com</span></div>
                                    <div class="mock-meta-item"><span class="mock-meta-label">Branding</span><span class="mock-meta-val badge">Custom logo + theme</span></div>
                                    <div class="mock-meta-item"><span class="mock-meta-label">Native token</span><span class="mock-meta-val">YOUR</span></div>
                                    <div class="mock-meta-item"><span class="mock-meta-label">Ads</span><span class="mock-meta-val">None</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-server"
                title="Hosted for you, or self-host it yourself"
                description="Choose managed block explorer hosting and Ethernal runs the infrastructure, scaling, and updates. Need data sovereignty? The same explorer is MIT-licensed and self-hostable via Docker, so you can run it on your own infrastructure with one command."
            >
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">
                                <v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>
                                terminal
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">git clone https://github.com/tryethernal/ethernal</span></div>
                            <div><span class="t-prompt">$ </span><span class="t-cmd">cd ethernal && make start</span></div>
                            <div class="mt-3"><span class="t-comment"># MIT-licensed, runs on your infrastructure</span></div>
                            <div><span class="t-success">&#10003; Explorer running at localhost:8080</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-magnify"
                title="A full EVM explorer, not just a block feed"
                description="Decoded transactions, full call traces, verified contracts you can read and write to, token and NFT tracking, and an Etherscan-compatible API so your existing tooling keeps working. Everything users and developers expect from an EVM block explorer."
                :reverse="true"
            >
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">
                                <v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>
                                explorer.yourchain.com/tx/0x1b14…
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-trace">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                    <span class="status-chip ok">Success</span>
                                </div>
                                <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x7a25…f832</span><span class="trace-method">swap(uint256)</span></div>
                                <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x1f98…4e23</span><span class="trace-method">getReserves()</span></div>
                                <div class="trace-node indent"><span class="trace-op call">CALL</span><span class="trace-addr">0xdac1…1ec7</span><span class="trace-method">transfer(address,uint256)</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- FAQ (visible content mirrors the FAQPage JSON-LD below) -->
            <div class="my-16" style="max-width: 760px; margin-left: auto; margin-right: auto;">
                <h2 class="font-heading mb-6" style="font-size: 1.6rem; color: var(--text-primary);">
                    Frequently asked questions
                </h2>
                <div class="lbe-faq-list">
                    <div v-for="(faq, i) in faqs" :key="i" class="lbe-faq-item">
                        <h3 class="lbe-faq-q">{{ faq.q }}</h3>
                        <p class="lbe-faq-a">{{ faq.a }}</p>
                    </div>
                </div>
            </div>
        </v-container>

        <LandingCTA flow="public" />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';

const appUrl = __APP_URL__;

// Single source of truth: rendered in the visible FAQ section above AND in the
// FAQPage JSON-LD below, so the structured data always matches on-page content
// (a Google FAQPage eligibility requirement).
const faqs = [
    {
        q: 'What is block explorer hosting?',
        a: 'Block explorer hosting is a managed service where a provider runs the indexer, database, and frontend that power a block explorer for your chain. With Ethernal you provide an EVM RPC URL and the hosted explorer is live in minutes, with no infrastructure for you to operate.'
    },
    {
        q: 'How do I launch a custom block explorer for my EVM chain?',
        a: 'Paste your EVM RPC URL and chain ID into Ethernal, set your branding and custom domain, and the explorer indexes your chain and goes live in under five minutes. You can use the hosted version or self-host the MIT-licensed explorer via Docker.'
    },
    {
        q: 'Is there a self-hosted EVM scan alternative to Etherscan?',
        a: 'Yes. Ethernal is an open-source, MIT-licensed EVM block explorer (an EVM scan) that you can self-host on your own infrastructure, or run as a hosted service. It supports transaction decoding, contract verification, and an Etherscan-compatible API.'
    }
];

useHead({
    title: 'Launch a Custom EVM Block Explorer | Explorer Hosting',
    meta: [
        { name: 'description', content: 'Launch a custom EVM block explorer in 5 minutes. Point Ethernal at any RPC URL for hosted block explorer hosting, or self-host the MIT-licensed EVM scan yourself.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Launch a Custom EVM Block Explorer | Explorer Hosting' },
        { property: 'og:description', content: 'Launch a custom EVM block explorer in 5 minutes. Point Ethernal at any RPC URL for hosted block explorer hosting, or self-host the MIT-licensed EVM scan yourself.' },
        { property: 'og:url', content: 'https://tryethernal.com/launch-block-explorer' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/launch-block-explorer' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": "Launch a custom EVM block explorer with Ethernal",
                "description": "Stand up a hosted or self-hosted EVM block explorer for your chain in under five minutes.",
                "step": [
                    { "@type": "HowToStep", "name": "Add your chain", "text": "Paste your EVM RPC URL and chain ID into Ethernal onboarding." },
                    { "@type": "HowToStep", "name": "Brand it", "text": "Set your custom domain, logo, colors, and native token for a white-label explorer." },
                    { "@type": "HowToStep", "name": "Go live", "text": "Ethernal indexes your chain and serves the explorer, hosted for you or self-hosted via Docker under an MIT license." }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqs.map(f => ({
                    "@type": "Question",
                    "name": f.q,
                    "acceptedAnswer": { "@type": "Answer", "text": f.a }
                }))
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Launch a Custom EVM Block Explorer", "item": "https://tryethernal.com/launch-block-explorer" }
                ]
            })
        }
    ]
});
</script>

<style scoped>
.page-title-bar {
    padding-bottom: 24px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--drawer-divider);
}
.btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
    background: #3D95CE; color: #fff;
}
.btn-primary:hover { background: #357fb0; }
.btn-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
    background: transparent; color: var(--text-secondary); border: 1px solid var(--border-subtle);
}
.btn-secondary:hover { color: var(--text-primary); border-color: rgba(61,149,206,0.4); }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Terminal mock */
.terminal-mock { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; }
.t-prompt { color: #58A6FF; }
.t-cmd { color: #E6EDF3; }
.t-comment { color: #484F58; }
.t-str { color: #A5D6FF; }
.t-success { color: #22C55E; font-size: 11px; }

/* Contract sync / meta grid */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mock-meta-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.mock-meta-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-meta-val { color: #CBD5E1; font-size: 12px; }
.mock-meta-val.badge { color: #5DAAE0; }

/* Trace */
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.trace-node.indent { padding-left: 20px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; }
.trace-method { color: #CBD5E1; font-size: 11px; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.ok { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }

/* FAQ */
.lbe-faq-list { display: flex; flex-direction: column; gap: 12px; }
.lbe-faq-item { background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(30, 41, 59, 0.5); border-radius: 10px; padding: 18px 20px; }
.lbe-faq-q { color: var(--text-primary); font-size: 15px; font-weight: 600; margin: 0 0 8px; }
.lbe-faq-a { color: var(--text-secondary); font-size: 14px; line-height: 1.7; margin: 0; }
</style>
