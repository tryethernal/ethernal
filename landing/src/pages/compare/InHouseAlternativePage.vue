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
                    <span class="current">Build vs Buy</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">BLOCK EXPLORER INFRASTRUCTURE</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Build vs Buy: Block Explorer for Your EVM Chain</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Building a block explorer from scratch takes 3-6 months of engineering, a dedicated team, and ongoing maintenance. Or deploy Ethernal in 5 minutes. Open-source, MIT licensed, fully customizable.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 61, 149, 206;">
                    <div class="chain-stat"><span class="chain-stat-label">Ethernal Setup</span> <span class="chain-stat-value">&lt; 5 min</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Custom Build</span> <span class="chain-stat-value">3-6 months</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Ethernal Cost</span> <span class="chain-stat-value">From $0</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Custom Build</span> <span class="chain-stat-value">$150K+/yr</span></div>
                </div>
            </div>

            <!-- TL;DR -->
            <section class="tldr-box my-12">
                <h2 class="tldr-label">TL;DR</h2>
                <p class="tldr-text">
                    Building a custom block explorer means indexing every block, decoding every transaction, parsing every event log, handling reorgs, and keeping it all in sync 24/7. Most teams underestimate this by 10x. Ethernal is MIT licensed: you get the same level of control as building from scratch, without the 6-month head start cost. Fork it, extend it, or use the hosted service.
                </p>
            </section>

            <!-- What it actually takes -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    What It Actually Takes to Build a Block Explorer
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Block indexer.</strong> You need a service that subscribes to new blocks (via WebSocket or polling), parses each block header, iterates through every transaction, and stores it all in a database. It has to handle chain reorgs (when the canonical chain changes), backfill historical data on first sync, and keep up with real-time block production without falling behind.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Transaction decoder.</strong> Raw transaction data is hex-encoded calldata. To make it human-readable, you need ABI parsing, proxy contract resolution (EIP-1967, EIP-1822, diamond proxies), and event log decoding for every known event signature. This alone is a multi-week project.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Contract verification.</strong> Users expect to verify source code against deployed bytecode. That means matching compiler versions across every Solidity and Vyper release, handling constructor arguments, library linking, metadata hash validation, and optimization settings. Getting this right is notoriously difficult.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Search and API.</strong> Address lookups, token balances, transaction history with pagination, filtering by method ID or event topic. At scale, these queries hit millions of rows. You need proper indexing, caching, and an Etherscan-compatible API if you want tooling (Hardhat, Foundry, wallets) to work out of the box.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Frontend.</strong> Real-time block and transaction updates, call trace visualization, token and NFT pages, contract read/write interfaces, responsive design. Each of these is a feature that takes weeks to build well.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Infrastructure.</strong> PostgreSQL with proper partitioning for large chains, a caching layer (Redis), job queues for background processing, monitoring and alerting. The database alone needs careful schema design to handle chains producing blocks every 2 seconds.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Ongoing maintenance.</strong> Every Ethereum upgrade introduces new opcodes, new EIPs, and new precompiles. Cancun added blob transactions. Pectra changed how validators work. Each upgrade requires engineering work to support. Then there are chain-specific quirks, security patches, and dependency updates.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> A minimum viable block explorer is 3-6 months of full-time engineering. A production-grade one is a full product.
                    </p>
                </div>
            </section>

            <!-- Time to Launch -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Time to Launch
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
                            <div class="terminal-line"><span class="terminal-cmd">$ # paste RPC URL → explorer live</span></div>
                            <div class="terminal-line"><span class="terminal-output">✓ Done. 4 minutes.</span></div>
                        </div>
                    </div>
                    <div class="browser-preview" style="flex: 1; min-width: 0;">
                        <div class="preview-header">
                            <div class="d-flex align-center ga-2">
                                <span class="dot red"></span>
                                <span class="dot yellow"></span>
                                <span class="dot green"></span>
                            </div>
                            <div class="preview-url-bar">terminal - custom build</div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="terminal-line"><span class="terminal-status">Month 1: Block indexer + reorg handling</span></div>
                            <div class="terminal-line"><span class="terminal-status">Month 2: Transaction decoder + ABI parser</span></div>
                            <div class="terminal-line"><span class="terminal-status">Month 3: Contract verification engine</span></div>
                            <div class="terminal-line"><span class="terminal-status">Month 4: API + search + pagination</span></div>
                            <div class="terminal-line"><span class="terminal-status">Month 5: Frontend + real-time updates</span></div>
                            <div class="terminal-line"><span class="terminal-status">Month 6: Testing, deployment, bug fixes</span></div>
                            <div class="terminal-line"><span class="terminal-status">⏳ Still no L2 bridge support...</span></div>
                        </div>
                    </div>
                </div>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Build in-house:</strong> 3-6 months for an MVP. 12+ months to reach feature parity with existing explorers. Every EVM upgrade (Cancun, Pectra, Glamsterdam) requires engineering work to support new transaction types, opcodes, and protocol changes.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Use Ethernal:</strong> Under 5 minutes from an RPC URL. Self-hosted via Docker or instant on hosted plans. Historical data syncs automatically in the background.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Building makes sense if you need capabilities no existing explorer provides. Otherwise, you are rebuilding what already exists.
                    </p>
                </div>
            </section>

            <!-- Total Cost -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Total Cost
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Build in-house:</strong> 2-3 senior engineers for 6 months = $150K-$300K just to ship v1. Then ongoing maintenance: $50K-$100K/year minimum for bug fixes, EVM upgrades, infrastructure, and on-call.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Use Ethernal:</strong> $0 self-hosted (MIT license). $500/mo for full white-label hosted. $6K/year vs $150K+/year.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Building costs 25-50x more than using Ethernal, and that gap widens over time with maintenance.
                    </p>
                </div>
            </section>

            <!-- Customization -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Customization
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Build in-house:</strong> Full control over every pixel. Every design decision, every API endpoint, every schema choice is yours. Nobody can tell you "that feature isn't on the roadmap."
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Use Ethernal:</strong> MIT licensed, so you also have full control. Fork the repo and modify anything: the Vue frontend, the Node.js backend, the indexer logic, the data models. The difference is you start from a working product, not a blank file.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Both give you full control. Ethernal gives you a 3-year head start.
                    </p>
                </div>
            </section>

            <!-- Maintenance -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Maintenance
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Build in-house:</strong> Every Ethereum upgrade, new EIP, or chain fork requires engineering work. You handle monitoring, scaling, security patches. When the explorer goes down at 3 AM, your team is the one waking up.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Use Ethernal:</strong> Hosted plans include maintenance, upgrades, and monitoring. Self-hosted follows the release cycle: <code class="code-inline">git pull</code>, restart, done.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Maintenance is the hidden cost that makes custom builds expensive long-term.
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
                        <span>Criteria</span>
                        <span>Build In-House</span>
                        <span>Use Ethernal</span>
                    </div>
                    <div class="comp-row">
                        <span>Time to launch</span>
                        <span class="comp-no">3-6 months</span>
                        <span class="comp-yes">&lt; 5 minutes</span>
                    </div>
                    <div class="comp-row">
                        <span>Upfront cost</span>
                        <span class="comp-no">$150K-$300K</span>
                        <span class="comp-yes">$0</span>
                    </div>
                    <div class="comp-row">
                        <span>Annual maintenance</span>
                        <span class="comp-no">$50K-$100K</span>
                        <span class="comp-yes">$0 (self-hosted) or $1.8K-$6K (hosted)</span>
                    </div>
                    <div class="comp-row">
                        <span>Full source access</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes (MIT)</span>
                    </div>
                    <div class="comp-row">
                        <span>Customization</span>
                        <span class="comp-yes">Unlimited</span>
                        <span class="comp-yes">Unlimited (fork)</span>
                    </div>
                    <div class="comp-row">
                        <span>EVM upgrade support</span>
                        <span class="comp-no">You build it</span>
                        <span class="comp-yes">Included</span>
                    </div>
                    <div class="comp-row">
                        <span>Transaction tracing</span>
                        <span class="comp-no">You build it</span>
                        <span class="comp-yes">Built-in</span>
                    </div>
                    <div class="comp-row">
                        <span>Contract verification</span>
                        <span class="comp-no">You build it</span>
                        <span class="comp-yes">Built-in</span>
                    </div>
                    <div class="comp-row">
                        <span>L2 bridge support</span>
                        <span class="comp-no">You build it</span>
                        <span class="comp-yes">Built-in (OP Stack, Orbit)</span>
                    </div>
                    <div class="comp-row">
                        <span>Etherscan-compatible API</span>
                        <span class="comp-no">You build it</span>
                        <span class="comp-yes">Built-in</span>
                    </div>
                    <div class="comp-row">
                        <span>White-label branding</span>
                        <span class="comp-yes">By definition</span>
                        <span class="comp-yes">Full (from $500/mo)</span>
                    </div>
                    <div class="comp-row">
                        <span>Community and support</span>
                        <span class="comp-no">None</span>
                        <span class="comp-yes">GitHub, Discord, docs</span>
                    </div>
                </div>
            </section>

            <!-- When building in-house makes sense -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    When Building In-House Makes Sense
                </h2>
                <ul class="who-list">
                    <li>You need features that no existing explorer provides (highly specialized analytics, custom visualizations for non-standard protocols)</li>
                    <li>Block exploration is your core product, not infrastructure supporting another product</li>
                    <li>You have a dedicated infrastructure team with block explorer experience</li>
                </ul>
            </section>

            <!-- When Ethernal makes more sense -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    When Ethernal Makes More Sense
                </h2>
                <ul class="who-list">
                    <li>Your block explorer is infrastructure, not your core product</li>
                    <li>You need a working explorer before your chain launches</li>
                    <li>You want full source access without 6 months of build time</li>
                    <li>Your engineering team should be building your product, not an explorer</li>
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
                        <h3 class="faq-q">Can I customize Ethernal as much as a custom build?</h3>
                        <p class="faq-a">Yes. Ethernal is MIT licensed. Fork the repo and modify anything: UI, indexer logic, API endpoints, data models. The difference is you start from a working product.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How much does it cost to build a block explorer?</h3>
                        <p class="faq-a">A minimum viable explorer takes 2-3 senior engineers 3-6 months ($150K-$300K). Production-grade with contract verification, tracing, and API adds another 3-6 months. Annual maintenance runs $50K-$100K+.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What if I outgrow Ethernal?</h3>
                        <p class="faq-a">You have the source code (MIT license). You can fork and extend without limits. Or contact the team for enterprise support.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I start with Ethernal and build custom later?</h3>
                        <p class="faq-a">Yes. Many teams start with Ethernal to launch their chain, then decide whether a custom build is worth the investment once they understand their actual requirements.</p>
                    </div>
                </div>
            </section>

            <!-- Related links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/etherscan-alternative" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-swap-horizontal</v-icon>
                        <div>
                            <span class="related-title">Etherscan Alternative</span>
                            <span class="related-desc">Open-source, self-hostable alternative to Etherscan for custom EVM chains</span>
                        </div>
                    </router-link>
                    <router-link to="/blockscout-alternative" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-swap-horizontal</v-icon>
                        <div>
                            <span class="related-title">Blockscout Alternative</span>
                            <span class="related-desc">How Ethernal compares to Blockscout on setup, L2 support, and runtime</span>
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
    title: 'Build vs Buy a Block Explorer: Real Cost Breakdown',
    meta: [
        { name: 'description', content: 'Should you build a block explorer in-house or use Explorer-as-a-Service? Real infra costs, engineering time, and maintenance trade-offs compared.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Build vs Buy a Block Explorer: Real Cost Breakdown' },
        { property: 'og:description', content: 'Should you build a block explorer in-house or use Explorer-as-a-Service? Real infra costs, engineering time, and maintenance trade-offs compared.' },
        { property: 'og:url', content: 'https://tryethernal.com/build-vs-buy-block-explorer' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/build-vs-buy-block-explorer' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Build vs Buy Block Explorer", "item": "https://tryethernal.com/build-vs-buy-block-explorer" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "Can I customize Ethernal as much as a custom build?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal is MIT licensed. Fork the repo and modify anything: UI, indexer logic, API endpoints, data models. The difference is you start from a working product." } },
                    { "@type": "Question", "name": "How much does it cost to build a block explorer?", "acceptedAnswer": { "@type": "Answer", "text": "A minimum viable explorer takes 2-3 senior engineers 3-6 months ($150K-$300K). Production-grade with contract verification, tracing, and API adds another 3-6 months. Annual maintenance runs $50K-$100K+." } },
                    { "@type": "Question", "name": "What if I outgrow Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "You have the source code (MIT license). You can fork and extend without limits. Or contact the team for enterprise support." } },
                    { "@type": "Question", "name": "Can I start with Ethernal and build custom later?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Many teams start with Ethernal to launch their chain, then decide whether a custom build is worth the investment once they understand their actual requirements." } }
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
.pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.pricing-card { padding: 24px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; }
.pricing-card-name { font-size: 0.9rem; font-weight: 600; color: #5DAAE0; margin-bottom: 8px; }
.pricing-card-price { font-size: 2rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
.pricing-card-label { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; }
.pricing-card-detail { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }

@media (max-width: 900px) { .pricing-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px) { .pricing-grid { grid-template-columns: 1fr; } }

@media (max-width: 768px) {
    .setup-comparison { flex-direction: column; }
}

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .tldr-box { padding: 18px 20px; }
}
</style>
