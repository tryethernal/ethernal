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
                    <span class="current">Ethernal vs Blockscout</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">BLOCK EXPLORER COMPARISON</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethernal vs Blockscout</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Two open-source block explorers, different trade-offs. Ethernal optimizes for setup speed and simplicity. Blockscout optimizes for ecosystem breadth and customization depth. Here is how they compare for teams shipping EVM chains.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 61, 149, 206;">
                    <div class="chain-stat"><span class="chain-stat-label">Ethernal</span> <span class="chain-stat-value">MIT License</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Blockscout</span> <span class="chain-stat-value">Open Source</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Both</span> <span class="chain-stat-value">Self-Hostable</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Both</span> <span class="chain-stat-value">EVM Only</span></div>
                </div>
            </div>

            <!-- TL;DR -->
            <section class="tldr-box my-12">
                <h2 class="tldr-label">TL;DR</h2>
                <p class="tldr-text">
                    Ethernal deploys in under 5 minutes from an RPC URL, runs on Node.js and Docker, and includes native OP Stack and Arbitrum Orbit bridge support. Blockscout has the largest open-source explorer ecosystem (1000+ chains), is built on Elixir/Erlang, and offers deep customization through its plugin architecture. Both are open source and self-hostable.
                </p>
            </section>

            <!-- Detailed Comparisons -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Setup and Deployment
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> is designed to get you from zero to a working explorer as fast as possible. Clone the repo, run <code class="code-inline">make start</code>, paste your RPC URL. The entire stack is Node.js and Docker. No exotic runtimes, no multi-service orchestration. Under 5 minutes for a self-hosted instance, or instant for the hosted version.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout</strong> self-hosted requires an Elixir/Erlang runtime, PostgreSQL, and multiple coordinated services. Budget hours to days depending on your team's familiarity with the Elixir ecosystem. Blockscout's Autoscout product offers a faster hosted deployment path that reduces this overhead significantly.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Ethernal is faster for teams without Elixir expertise. Blockscout's Autoscout closes the gap for hosted deployments.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    L2 and Rollup Support
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> has native OP Stack support built in: withdrawal lifecycle tracking (initiation through finalization), deposit monitoring, and batch/blob tracking. Arbitrum Orbit support is also built in with bridge monitoring and cross-chain message tracking. No plugins or extra configuration needed.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout</strong> supports L1, L2, L3, and ZK rollups. It covers a wider range of chain types overall. Some L2-specific features (like detailed bridge lifecycle tracking) require plugins or additional configuration depending on the rollup framework.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Ethernal has deeper built-in L2 bridge support. Blockscout has broader chain type coverage.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Branding and Customization
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> offers full white-label from $500/mo on the App Chain plan: custom domain, logo, colors, and theme. Self-hosted gives you unlimited customization since the codebase is Node.js/Vue, a stack most web developers already know.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout</strong> provides full customization in its self-hosted version. Its Explorer-as-a-Service (EaaS) offering includes managed white-label options. Because Blockscout is built on Elixir, customizing the source code requires familiarity with that ecosystem.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Similar capabilities, different skill requirements for customization.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> publishes transparent pricing on its website. Self-hosted is free and open source. Hosted plans start at $0 (Starter, ad-supported), $150/mo (Team, custom domain), and $500/mo (App Chain, full white-label with 5M transactions included). Enterprise pricing is available for custom requirements.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout</strong> is free to self-host. Autoscout uses a pay-as-you-go model. Explorer-as-a-Service has custom pricing that typically requires contacting their sales team.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Both free to self-host. Ethernal has more transparent hosted pricing.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Ecosystem
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout</strong> powers over 1000 chains and has the largest open-source block explorer community. It is used by Ethereum, Optimism, Base, and Gnosis, among others. If ecosystem size and community support are your top priority, Blockscout is the established leader.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> supports 370+ chains and serves over 13,000 users. The ecosystem is growing fast, especially among teams launching OP Stack and Arbitrum Orbit chains that want a turnkey solution.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Blockscout has the larger ecosystem. Ethernal is growing fast.
                    </p>
                </div>
            </section>

            <!-- At-a-Glance Comparison Table -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    At-a-Glance Comparison
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    A condensed feature comparison between Ethernal and Blockscout.
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Blockscout</span>
                    </div>
                    <div class="comp-row">
                        <span>Setup time (self-hosted)</span>
                        <span class="comp-yes">&lt; 5 minutes</span>
                        <span class="comp-no">Hours to days</span>
                    </div>
                    <div class="comp-row">
                        <span>Runtime</span>
                        <span class="comp-yes">Node.js + Docker</span>
                        <span class="comp-partial">Elixir/Erlang</span>
                    </div>
                    <div class="comp-row">
                        <span>Open source</span>
                        <span class="comp-yes">MIT License</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Self-hostable</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Hosted option</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Autoscout / EaaS</span>
                    </div>
                    <div class="comp-row">
                        <span>Chains supported</span>
                        <span class="comp-partial">370+</span>
                        <span class="comp-yes">1000+</span>
                    </div>
                    <div class="comp-row">
                        <span>OP Stack bridge (built-in)</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-partial">Plugin</span>
                    </div>
                    <div class="comp-row">
                        <span>Arbitrum Orbit bridge</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Plugin</span>
                    </div>
                    <div class="comp-row">
                        <span>ZK rollup support</span>
                        <span class="comp-no">Planned</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Full white-label</span>
                        <span class="comp-yes">From $500/mo</span>
                        <span class="comp-yes">Self-host / EaaS</span>
                    </div>
                    <div class="comp-row">
                        <span>Custom domain</span>
                        <span class="comp-yes">From $150/mo</span>
                        <span class="comp-yes">Self-host</span>
                    </div>
                    <div class="comp-row">
                        <span>Contract verification</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Transaction decoding</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Call traces</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Token tracking</span>
                        <span class="comp-yes">ERC-20/721/1155</span>
                        <span class="comp-yes">ERC-20/721/1155</span>
                    </div>
                    <div class="comp-row">
                        <span>Transparent pricing</span>
                        <span class="comp-yes">Published</span>
                        <span class="comp-partial">Custom / contact</span>
                    </div>
                </div>
            </section>

            <!-- Who Should Use -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Ethernal
                </h2>
                <ul class="who-list">
                    <li>Teams shipping L2s or app chains who need a working explorer fast</li>
                    <li>Teams running Node.js/Docker without Elixir expertise</li>
                    <li>Startups that need transparent pricing without enterprise sales calls</li>
                    <li>Solo developers on Hardhat/Anvil who need a local chain explorer</li>
                </ul>
            </section>

            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Blockscout
                </h2>
                <ul class="who-list">
                    <li>Teams that need the largest open-source explorer ecosystem</li>
                    <li>Teams with Elixir/Erlang expertise who want deep source customization</li>
                    <li>Major L1 ecosystems that want battle-tested infrastructure</li>
                </ul>
            </section>

            <!-- FAQ -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Frequently Asked Questions
                </h2>
                <div class="faq-list">
                    <div class="faq-item">
                        <h3 class="faq-q">Which is easier to set up?</h3>
                        <p class="faq-a">Ethernal. Clone the repo, run <code class="code-inline">make start</code>, paste your RPC URL. The whole process takes under 5 minutes. Blockscout self-hosted requires an Elixir runtime and more infrastructure. Autoscout simplifies Blockscout's hosted option.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Which supports more chains?</h3>
                        <p class="faq-a">Blockscout, with over 1000 chains compared to Ethernal's 370+. Both work with any EVM-compatible chain.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Are both truly open source?</h3>
                        <p class="faq-a">Yes. Ethernal is MIT licensed. Blockscout uses an open-source license. Both can be forked and self-hosted.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I switch between them?</h3>
                        <p class="faq-a">Yes. Both connect via RPC URL. Point the new explorer at the same endpoint and it re-indexes the chain data independently.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Which has better L2 support?</h3>
                        <p class="faq-a">Ethernal has deeper built-in OP Stack and Arbitrum Orbit bridge support (withdrawal lifecycle, deposit monitoring, batch tracking). Blockscout supports more L2 types overall, including ZK rollups.</p>
                    </div>
                </div>
            </section>

            <!-- Related Links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/blockscout-alternative" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-swap-horizontal</v-icon>
                        <div>
                            <span class="related-title">Blockscout Alternative</span>
                            <span class="related-desc">Why teams choose Ethernal as a Blockscout alternative for their EVM chain</span>
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
                            <span class="related-desc">In-depth comparison of Ethernal, Blockscout, Etherscan, and more</span>
                        </div>
                    </a>
                    <router-link to="/features" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-view-grid-outline</v-icon>
                        <div>
                            <span class="related-title">All Features</span>
                            <span class="related-desc">Transaction decoding, contract verification, token tracking, and more</span>
                        </div>
                    </router-link>
                </div>
            </section>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
/**
 * @fileoverview Ethernal vs Blockscout comparison landing page.
 * @component EthernalVsBlockscoutPage
 * Targets the search query "ethernal vs blockscout" with a fair,
 * detailed comparison of both open-source EVM block explorers.
 */
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Ethernal vs Blockscout  - Block Explorer Comparison',
    meta: [
        { name: 'description', content: 'Compare Ethernal and Blockscout: setup speed, L2 support, pricing, and customization. Two open-source EVM block explorers, different trade-offs.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Ethernal vs Blockscout  - Block Explorer Comparison' },
        { property: 'og:description', content: 'Compare Ethernal and Blockscout: setup speed, L2 support, pricing, and customization. Two open-source EVM block explorers, different trade-offs.' },
        { property: 'og:url', content: 'https://tryethernal.com/compare/ethernal-vs-blockscout' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Ethernal vs Blockscout  - Block Explorer Comparison' },
        { name: 'twitter:description', content: 'Compare Ethernal and Blockscout: setup speed, L2 support, pricing, and customization. Two open-source EVM block explorers, different trade-offs.' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/compare/ethernal-vs-blockscout' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://tryethernal.com/compare" },
                    { "@type": "ListItem", "position": 3, "name": "Ethernal vs Blockscout", "item": "https://tryethernal.com/compare/ethernal-vs-blockscout" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "Which is easier to set up, Ethernal or Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Ethernal. Clone the repo, run make start, paste your RPC URL. The whole process takes under 5 minutes. Blockscout self-hosted requires an Elixir runtime and more infrastructure. Autoscout simplifies Blockscout's hosted option." } },
                    { "@type": "Question", "name": "Which supports more chains, Ethernal or Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Blockscout, with over 1000 chains compared to Ethernal's 370+. Both work with any EVM-compatible chain." } },
                    { "@type": "Question", "name": "Are both Ethernal and Blockscout truly open source?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal is MIT licensed. Blockscout uses an open-source license. Both can be forked and self-hosted." } },
                    { "@type": "Question", "name": "Can I switch between Ethernal and Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Both connect via RPC URL. Point the new explorer at the same endpoint and it re-indexes the chain data independently." } },
                    { "@type": "Question", "name": "Which has better L2 support, Ethernal or Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Ethernal has deeper built-in OP Stack and Arbitrum Orbit bridge support (withdrawal lifecycle, deposit monitoring, batch tracking). Blockscout supports more L2 types overall, including ZK rollups." } }
                ]
            })
        }
    ]
});
</script>

<style scoped>
/* Chain hero */
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

/* TL;DR box */
.tldr-box { padding: 24px 28px; background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; box-shadow: var(--shadow-card); }
.tldr-label { color: #5DAAE0; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px; }
.tldr-text { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; margin: 0; }

/* Comparison prose sections */
.comparison-prose p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; margin-bottom: 16px; max-width: 720px; }
.comparison-prose .bottom-line { padding: 12px 16px; background: rgba(61, 149, 206, 0.06); border-left: 3px solid rgba(61, 149, 206, 0.4); border-radius: 0 8px 8px 0; margin-top: 8px; }
.comparison-prose .bottom-line strong { color: var(--text-primary); }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }

/* Comparison table */
.comparison-table { border: 1px solid var(--drawer-divider); border-radius: 12px; overflow: hidden; }
.comp-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--drawer-divider); }
.comp-row:last-child { border-bottom: none; }
.comp-header { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.comp-row:not(.comp-header) span:first-child { color: var(--text-secondary); }
.comp-yes { color: #22C55E; }
.comp-no { color: var(--text-muted); }
.comp-partial { color: #F59E0B; }

/* Who should use */
.who-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.who-list li { padding: 14px 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; color: var(--text-secondary); font-size: 0.93rem; line-height: 1.6; position: relative; padding-left: 36px; }
.who-list li::before { content: '\2713'; position: absolute; left: 14px; color: #22C55E; font-weight: 700; }

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

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .tldr-box { padding: 18px 20px; }
}
</style>
