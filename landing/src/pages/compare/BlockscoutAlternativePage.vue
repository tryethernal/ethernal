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
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethernal vs Blockscout</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Two open-source block explorers, different trade-offs. Ethernal optimizes for setup speed and simplicity. Blockscout optimizes for ecosystem breadth and customization depth. Here is how they compare for teams shipping EVM chains.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 61, 149, 206;">
                    <div class="chain-stat"><span class="chain-stat-label">Setup</span> <span class="chain-stat-value">&lt; 5 min</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">License</span> <span class="chain-stat-value">MIT</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Self-host</span> <span class="chain-stat-value">Docker</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Pricing</span> <span class="chain-stat-value">From $0</span></div>
                </div>
            </div>

            <!-- TL;DR -->
            <section class="tldr-box my-12">
                <h2 class="tldr-label">TL;DR</h2>
                <p class="tldr-text">
                    Ethernal deploys in under 5 minutes from an RPC URL, runs on Node.js and Docker, and includes native OP Stack and Arbitrum Orbit bridge support. Blockscout has the largest open-source explorer ecosystem (1000+ chains), is built on Elixir/Erlang, and offers deep customization through its plugin architecture. Both are open source and self-hostable.
                </p>
            </section>

            <!-- Why teams look for alternatives -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Why Teams Look for Blockscout Alternatives
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Blockscout powers over 1,000 chains and is the default open-source explorer for most rollup teams. It earned that position. But some teams hit friction they didn't expect: the Elixir/Erlang runtime is unfamiliar to most Node.js shops, self-hosted deployments can take hours or days to configure, and L2-specific features like bridge monitoring require separate plugins. None of these are bugs. They're architectural choices that work well for some teams and not others.
                </p>
            </section>

            <!-- Detailed Comparisons -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Setup and Deployment
                </h2>
                <div class="setup-comparison">
                    <div class="browser-preview" style="flex: 1; min-width: 0;">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">terminal - ethernal</div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="terminal-line"><span class="terminal-cmd">$ git clone https://github.com/tryethernal/ethernal.git</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ cd ethernal && make start</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ # paste RPC URL in browser → done</span></div>
                            <div class="terminal-line"><span class="terminal-output">✓ Explorer live in 4 minutes</span></div>
                        </div>
                    </div>
                    <div class="browser-preview" style="flex: 1; min-width: 0;">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">terminal - blockscout</div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="terminal-line"><span class="terminal-cmd">$ apt install erlang elixir</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ mix deps.get && mix compile</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ docker compose up -d postgres</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ mix ecto.create && mix ecto.migrate</span></div>
                            <div class="terminal-line"><span class="terminal-cmd">$ mix phx.server</span></div>
                            <div class="terminal-line"><span class="terminal-status">⏳ Configure indexer, frontend, proxy...</span></div>
                            <div class="terminal-line"><span class="terminal-status">⏳ Budget: hours to days</span></div>
                        </div>
                    </div>
                </div>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal:</strong> Clone the repo, run <code class="code-inline">make start</code>, paste your RPC URL. Done. The stack is Node.js and Docker. Under 5 minutes for self-hosted, instant for the hosted version.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout:</strong> Self-hosted means setting up an Elixir/Erlang runtime, PostgreSQL, and multiple coordinated services. Budget hours to days unless your team already runs Elixir. Autoscout, their hosted option, is faster.
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
                        <strong style="color: var(--text-primary);">Ethernal:</strong> Full white-label from $500/mo (custom domain, logo, colors, theme). Self-hosted means you can change anything. The codebase is Node.js/Vue, so most web developers can jump in without learning a new stack.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout:</strong> Full customization if you self-host. Their EaaS has managed white-label too. Customizing the source means writing Elixir, which is a different skill set.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Similar capabilities, different skill requirements for customization.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Ecosystem
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Blockscout:</strong> 1000+ chains. Used by Ethereum, Optimism, Base, Gnosis. The largest open-source explorer community by a wide margin.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal:</strong> 370+ chains, 13,000+ users. Smaller, but growing quickly with OP Stack and Arbitrum Orbit teams.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Blockscout has the larger ecosystem. Ethernal is growing fast.
                    </p>
                </div>
            </section>

            <!-- Comparison table -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    At-a-Glance Comparison
                </h2>
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
                        <span>ZK rollup support</span>
                        <span class="comp-no">Planned</span>
                        <span class="comp-yes">Yes</span>
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
                        <span>Chain ecosystem</span>
                        <span class="comp-partial">370+ chains</span>
                        <span class="comp-yes">1000+ chains</span>
                    </div>
                    <div class="comp-row">
                        <span>Transparent pricing</span>
                        <span class="comp-yes">Published</span>
                        <span class="comp-partial">Custom / contact</span>
                    </div>
                </div>
            </section>

            <!-- When Blockscout is better -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Blockscout
                </h2>
                <ul class="who-list">
                    <li>You need the largest open-source explorer ecosystem and community</li>
                    <li>Your team already writes Elixir and wants deep source customization</li>
                    <li>You are a major L1 ecosystem and want the most battle-tested option</li>
                </ul>
            </section>

            <!-- When Ethernal is better -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Ethernal
                </h2>
                <ul class="who-list">
                    <li>You are shipping an L2 or app chain and need a working explorer before launch day</li>
                    <li>Your stack is Node.js/Docker and nobody on the team writes Elixir</li>
                    <li>You want to see pricing on a webpage, not negotiate it over email</li>
                    <li>You are a solo developer debugging on Hardhat or Anvil</li>
                </ul>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing
                </h2>
                <div class="pricing-grid">
                    <div class="pricing-card">
                        <div class="pricing-card-name">Self-hosted</div>
                        <div class="pricing-card-price">$0 <span class="pricing-card-label">MIT License</span></div>
                        <div class="pricing-card-detail">Fork, extend, self-host. No restrictions.</div>
                    </div>
                    <div class="pricing-card">
                        <div class="pricing-card-name">Starter</div>
                        <div class="pricing-card-price">$0 <span class="pricing-card-label">/month</span></div>
                        <div class="pricing-card-detail">Hosted, ad-supported. Contract verification, token tracking, unlimited tx.</div>
                    </div>
                    <div class="pricing-card">
                        <div class="pricing-card-name">Team</div>
                        <div class="pricing-card-price">$150 <span class="pricing-card-label">/month</span></div>
                        <div class="pricing-card-detail">Custom domain, no ads, L1 explorer, 100k tx included.</div>
                    </div>
                    <div class="pricing-card">
                        <div class="pricing-card-name">App Chain</div>
                        <div class="pricing-card-price">$500 <span class="pricing-card-label">/month</span></div>
                        <div class="pricing-card-detail">Full white-label. Custom branding, status page, 5M tx.</div>
                    </div>
                </div>
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
                        <h3 class="faq-q">Which is easier to set up?</h3>
                        <p class="faq-a">Ethernal. Clone the repo, run <code class="code-inline">make start</code>, paste your RPC URL. The whole process takes under 5 minutes. Blockscout self-hosted requires an Elixir runtime and more infrastructure. Autoscout simplifies Blockscout's hosted option.</p>
                    </div>
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
                        <h3 class="faq-q">Which has better L2 support?</h3>
                        <p class="faq-a">Ethernal has deeper built-in OP Stack and Arbitrum Orbit bridge support (withdrawal lifecycle, deposit monitoring, batch tracking). Blockscout supports more L2 types overall, including ZK rollups.</p>
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
                    <router-link to="/routescan-alternative" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-swap-horizontal</v-icon>
                        <div>
                            <span class="related-title">Routescan Alternative</span>
                            <span class="related-desc">Open-source, self-hostable alternative to Routescan's managed explorer</span>
                        </div>
                    </router-link>
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
                            <span class="related-desc">In-depth comparison of Etherscan, Blockscout, Ethernal, and more</span>
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
    title: 'Blockscout Alternative: Ethernal vs Blockscout Compared',
    meta: [
        { name: 'description', content: 'Compare Ethernal and Blockscout: two open-source block explorers for EVM chains. Setup, architecture, L2 support, and pricing side by side.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Blockscout Alternative: Ethernal vs Blockscout Compared' },
        { property: 'og:description', content: 'Compare Ethernal and Blockscout: two open-source block explorers for EVM chains. Setup, architecture, L2 support, and pricing side by side.' },
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
                "name": "Ethernal - Blockscout Alternative",
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
                    { "@type": "ListItem", "position": 2, "name": "Blockscout Alternative", "item": "https://tryethernal.com/blockscout-alternative" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "Which is easier to set up, Ethernal or Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Ethernal. Clone the repo, run make start, paste your RPC URL. Under 5 minutes. Blockscout self-hosted requires an Elixir runtime and more infrastructure." } },
                    { "@type": "Question", "name": "Is Ethernal open source like Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal is MIT licensed. You can fork it, extend it, and self-host it without restrictions." } },
                    { "@type": "Question", "name": "Can I migrate from Blockscout to Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Point Ethernal at the same RPC endpoint your Blockscout instance uses. Historical data re-indexes automatically." } },
                    { "@type": "Question", "name": "Does Ethernal support as many chains as Blockscout?", "acceptedAnswer": { "@type": "Answer", "text": "Blockscout supports 1,000+ chains. Ethernal supports 370+ unique EVM chains. Both work with any EVM-compatible chain." } },
                    { "@type": "Question", "name": "Which has better L2 support?", "acceptedAnswer": { "@type": "Answer", "text": "Ethernal has deeper built-in OP Stack and Arbitrum Orbit bridge support. Blockscout supports more L2 types overall, including ZK rollups." } },
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

/* Pricing context */
.pricing-context .btn-outline { border: 1px solid var(--btn-outline-border); color: var(--text-secondary); text-transform: none; letter-spacing: 0; font-weight: 500; }

/* Terminal mockup */
.setup-comparison { display: flex; gap: 20px; margin-bottom: 24px; }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }
.terminal-line { margin-bottom: 6px; line-height: 1.6; }
.terminal-cmd { color: #22C55E; }
.terminal-output { color: #A5D6FF; }
.terminal-status { color: #F59E0B; }

/* Pricing cards */
.pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 8px; }
.pricing-card { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; }
.pricing-card-name { font-size: 0.9rem; font-weight: 600; color: #5DAAE0; margin-bottom: 8px; }
.pricing-card-price { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
.pricing-card-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 400; }
.pricing-card-detail { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-top: 8px; }

@media (max-width: 1024px) {
    .pricing-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
    .setup-comparison { flex-direction: column; }
    .pricing-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .tldr-box { padding: 18px 20px; }
}
</style>
