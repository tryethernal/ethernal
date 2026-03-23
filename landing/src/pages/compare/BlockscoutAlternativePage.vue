<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Hero -->
            <div class="chain-hero">
                <nav class="breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <span>Compare</span>
                    <span class="sep">/</span>
                    <span class="current">Blockscout Alternative</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">OPEN-SOURCE BLOCK EXPLORER</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Looking for a Blockscout Alternative?</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Ethernal is an open-source, MIT-licensed block explorer that deploys in under 5 minutes from a single RPC URL. No Elixir runtime, no complex infrastructure. Full white-label branding from $500/month.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 61, 149, 206;">
                    <div class="chain-stat"><span class="chain-stat-label">Setup</span> <span class="chain-stat-value">&lt; 5 min</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">License</span> <span class="chain-stat-value">MIT</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Self-host</span> <span class="chain-stat-value">Docker</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Pricing</span> <span class="chain-stat-value">From $0</span></div>
                </div>
            </div>

            <!-- Why teams look for alternatives -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Why Teams Look for Blockscout Alternatives
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Blockscout is battle-tested and has the largest open-source block explorer ecosystem, powering over 1,000 chains. It is the default choice for many rollup teams. That said, some teams run into friction: the Elixir/Erlang runtime is unfamiliar to most Node.js shops, self-hosted deployments can take hours or days to configure, L2-specific features like bridge monitoring require separate plugins, and ongoing DevOps overhead adds up. These are legitimate tradeoffs, not shortcomings. Different teams have different constraints.
                </p>
            </section>

            <!-- Comparison table -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Ethernal vs Blockscout
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    A side-by-side comparison to help you decide which explorer fits your team.
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Blockscout</span>
                    </div>
                    <div class="comp-row">
                        <span>Open source</span>
                        <span class="comp-yes">Yes (MIT)</span>
                        <span class="comp-yes">Yes (Elixir)</span>
                    </div>
                    <div class="comp-row">
                        <span>Setup time</span>
                        <span class="comp-yes">&lt; 5 minutes</span>
                        <span class="comp-partial">Hours-days (self-host) or minutes (Autoscout)</span>
                    </div>
                    <div class="comp-row">
                        <span>Runtime</span>
                        <span class="comp-yes">Node.js + Docker</span>
                        <span class="comp-partial">Elixir + Erlang + PostgreSQL</span>
                    </div>
                    <div class="comp-row">
                        <span>White-label</span>
                        <span class="comp-yes">Full (from $500/mo)</span>
                        <span class="comp-yes">Full (self-host or EaaS)</span>
                    </div>
                    <div class="comp-row">
                        <span>L2 bridge support</span>
                        <span class="comp-yes">Built-in (OP Stack, Orbit)</span>
                        <span class="comp-partial">Requires plugins</span>
                    </div>
                    <div class="comp-row">
                        <span>Transaction tracing</span>
                        <span class="comp-yes">Full call traces</span>
                        <span class="comp-yes">Full traces</span>
                    </div>
                    <div class="comp-row">
                        <span>Contract verification</span>
                        <span class="comp-yes">Solidity, Vyper (UI/API/CLI)</span>
                        <span class="comp-yes">Solidity, Vyper</span>
                    </div>
                    <div class="comp-row">
                        <span>Etherscan-compatible API</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Self-hostable</span>
                        <span class="comp-yes">Yes (Docker)</span>
                        <span class="comp-yes">Yes (complex)</span>
                    </div>
                    <div class="comp-row">
                        <span>Hosted option</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes (Autoscout, EaaS)</span>
                    </div>
                    <div class="comp-row">
                        <span>Chain ecosystem</span>
                        <span class="comp-partial">370+ chains</span>
                        <span class="comp-yes">1000+ chains</span>
                    </div>
                </div>
            </section>

            <!-- When Blockscout is better -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    When Blockscout Is the Better Choice
                </h2>
                <div class="choice-list">
                    <div class="choice-item">
                        <v-icon size="18" style="color: #5DAAE0; flex-shrink: 0; margin-top: 2px;">mdi-check-circle-outline</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Largest open-source ecosystem</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">If you need the broadest community of contributors, plugins, and integrations, Blockscout has the largest open-source block explorer ecosystem available.</p>
                        </div>
                    </div>
                    <div class="choice-item">
                        <v-icon size="18" style="color: #5DAAE0; flex-shrink: 0; margin-top: 2px;">mdi-check-circle-outline</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Elixir/Erlang expertise on your team</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">If your team already runs Elixir in production, Blockscout fits naturally into your stack without introducing a new runtime.</p>
                        </div>
                    </div>
                    <div class="choice-item">
                        <v-icon size="18" style="color: #5DAAE0; flex-shrink: 0; margin-top: 2px;">mdi-check-circle-outline</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Autoscout for quick hosted testing</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">Blockscout's Autoscout offers one-click hosted deployment for testing and evaluation, which can be convenient for quick prototyping.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- When Ethernal is better -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    When Ethernal Is the Better Choice
                </h2>
                <div class="choice-list">
                    <div class="choice-item">
                        <v-icon size="18" style="color: #22C55E; flex-shrink: 0; margin-top: 2px;">mdi-check-circle</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Production explorer in minutes, not days</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">Paste your RPC URL, configure your branding, and you have a live explorer. No multi-service deployment, no Erlang VM tuning, no DevOps sprint.</p>
                        </div>
                    </div>
                    <div class="choice-item">
                        <v-icon size="18" style="color: #22C55E; flex-shrink: 0; margin-top: 2px;">mdi-check-circle</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Node.js/Docker stack (no Elixir required)</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">Ethernal runs on Node.js and Docker. If your team already works with JavaScript/TypeScript, you can self-host, extend, and debug without learning a new language.</p>
                        </div>
                    </div>
                    <div class="choice-item">
                        <v-icon size="18" style="color: #22C55E; flex-shrink: 0; margin-top: 2px;">mdi-check-circle</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Native L2 bridge support without plugins</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">OP Stack withdrawal tracking, Arbitrum Orbit bridge monitoring, and deposit/finalization lifecycle views are built into the core product. No plugins to install or maintain.</p>
                        </div>
                    </div>
                    <div class="choice-item">
                        <v-icon size="18" style="color: #22C55E; flex-shrink: 0; margin-top: 2px;">mdi-check-circle</v-icon>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Transparent, published pricing</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">$0 self-hosted (MIT license), $0 Starter (hosted), $150/mo Team, $500/mo App Chain. No "contact sales" guesswork for standard plans.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Ethernal is free to self-host under the MIT license. The hosted Starter plan is also free (ad-supported, with contract verification, token tracking, and unlimited transactions).
                    For custom domains and L1 explorer integration, the Team plan starts at $150/month.
                    Full whitelabel with custom branding, status page, and 5M transactions included is available on the App Chain plan at $500/month.
                    Enterprise plans with custom requirements are available on request.
                </p>
                <v-btn
                    class="btn-outline mt-6"
                    href="/pricing"
                    rounded="lg"
                    size="large"
                >
                    View Full Pricing
                    <v-icon end size="16">mdi-arrow-right</v-icon>
                </v-btn>
            </section>

            <!-- FAQ -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Frequently Asked Questions
                </h2>
                <div class="faq-list">
                    <div class="faq-item">
                        <h3 class="faq-q">Is Ethernal open source like Blockscout?</h3>
                        <p class="faq-a">Yes. Ethernal is MIT licensed. You can fork it, extend it, and self-host it without restrictions. The full source code is available on GitHub.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I migrate from Blockscout to Ethernal?</h3>
                        <p class="faq-a">Yes. Point Ethernal at the same RPC endpoint your Blockscout instance uses. Historical data re-indexes automatically. There is no manual data migration required.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support as many chains as Blockscout?</h3>
                        <p class="faq-a">Blockscout supports 1,000+ chains. Ethernal supports 370+ unique EVM chains. Both work with any EVM-compatible chain, so if your chain speaks JSON-RPC, both explorers can index it.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Is Blockscout free?</h3>
                        <p class="faq-a">Self-hosted Blockscout is free and open source. Autoscout and EaaS (Explorer-as-a-Service) have paid tiers. Ethernal is also free to self-host (MIT license) and has a free hosted Starter tier.</p>
                    </div>
                </div>
            </section>

            <!-- Related links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/features" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-view-grid-outline</v-icon>
                        <div>
                            <span class="related-title">All Features</span>
                            <span class="related-desc">Transaction decoding, contract verification, token tracking, and more</span>
                        </div>
                    </router-link>
                    <router-link to="/pricing" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-tag-outline</v-icon>
                        <div>
                            <span class="related-title">Pricing</span>
                            <span class="related-desc">Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise</span>
                        </div>
                    </router-link>
                    <a href="/blog/best-block-explorers-evm-chains-2026" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-post-outline</v-icon>
                        <div>
                            <span class="related-title">Best Block Explorers for EVM Chains (2026)</span>
                            <span class="related-desc">In-depth comparison of Etherscan, Blockscout, Ethernal, and other EVM explorers</span>
                        </div>
                    </a>
                </div>
            </section>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Blockscout Alternative  - Ethernal',
    meta: [
        { name: 'description', content: 'Looking for a Blockscout alternative? Ethernal is an open-source block explorer that deploys in under 5 minutes. MIT licensed, self-hostable, full white-label.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Blockscout Alternative  - Ethernal' },
        { property: 'og:description', content: 'Looking for a Blockscout alternative? Ethernal is an open-source block explorer that deploys in under 5 minutes. MIT licensed, self-hostable, full white-label.' },
        { property: 'og:url', content: 'https://tryethernal.com/blockscout-alternative' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/blockscout-alternative' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal  - Blockscout Alternative",
                "description": "Open-source, MIT-licensed block explorer that deploys in under 5 minutes. Node.js + Docker runtime, built-in L2 bridge support, full white-label branding.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/blockscout-alternative",
                "offers": [
                    { "@type": "Offer", "name": "Self-hosted (MIT)", "price": "0", "priceCurrency": "USD", "description": "Free, self-hosted, MIT-licensed block explorer" },
                    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Ad-supported hosted explorer with contract verification, token tracking, unlimited transactions" },
                    { "@type": "Offer", "name": "Team", "price": "150", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Custom domain, native token, L1 explorer, 100k tx included" },
                    { "@type": "Offer", "name": "App Chain", "price": "500", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Full whitelabel, custom branding, status page, 5M tx included" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://tryethernal.com/blockscout-alternative" },
                    { "@type": "ListItem", "position": 3, "name": "Blockscout Alternative", "item": "https://tryethernal.com/blockscout-alternative" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "Is Ethernal open source like Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal is MIT licensed. You can fork it, extend it, and self-host it without restrictions. The full source code is available on GitHub." } },
                    { "@type": "Question", "name": "Can I migrate from Blockscout to Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Point Ethernal at the same RPC endpoint your Blockscout instance uses. Historical data re-indexes automatically. There is no manual data migration required." } },
                    { "@type": "Question", "name": "Does Ethernal support as many chains as Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Blockscout supports 1,000+ chains. Ethernal supports 370+ unique EVM chains. Both work with any EVM-compatible chain." } },
                    { "@type": "Question", "name": "Is Blockscout free?", "acceptedAnswer": { "@type": "Answer", "text": "Self-hosted Blockscout is free and open source. Autoscout and EaaS have paid tiers. Ethernal is also free to self-host (MIT license) and has a free hosted Starter tier." } }
                ]
            })
        }
    ]
});
</script>

<style scoped>
/* Hero */
.chain-hero { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
.chain-stats-strip { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.chain-stat { padding: 6px 12px; border-radius: 6px; background: rgba(var(--chain-color), 0.08); border: 1px solid rgba(var(--chain-color), 0.2); font-size: 11px; color: var(--text-secondary); }
.chain-stat-label { color: var(--text-muted); margin-right: 4px; }
.chain-stat-value { color: var(--text-primary); font-weight: 600; }

/* Breadcrumb */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.breadcrumb a { color: #5DAAE0; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { color: var(--text-muted); }
.breadcrumb .current { color: var(--text-secondary); }

/* Comparison table */
.comparison-table { border: 1px solid var(--drawer-divider); border-radius: 12px; overflow: hidden; }
.comp-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--drawer-divider); }
.comp-row:last-child { border-bottom: none; }
.comp-header { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.comp-row:not(.comp-header) span:first-child { color: var(--text-secondary); }
.comp-yes { color: #22C55E; }
.comp-no { color: var(--text-muted); }
.comp-partial { color: #F59E0B; }

/* Choice lists */
.choice-list { display: flex; flex-direction: column; gap: 16px; }
.choice-item { display: flex; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 16px; }
.faq-item { padding: 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; }
.faq-q { color: var(--text-primary); font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; }
.faq-a { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.7; margin: 0; }

/* Related links */
.related-links { display: flex; flex-direction: column; gap: 8px; }
.related-link { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; text-decoration: none; transition: border-color 0.2s; }
.related-link:hover { border-color: var(--border-glow); }
.related-link div { display: flex; flex-direction: column; gap: 2px; }
.related-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.related-desc { color: var(--text-muted); font-size: 0.8rem; }

/* Pricing context */
.pricing-context .btn-outline { border: 1px solid var(--btn-outline-border); color: var(--text-secondary); text-transform: none; letter-spacing: 0; font-weight: 500; }

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
}
</style>
