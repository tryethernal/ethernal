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
                    <span class="current">Etherscan Alternative</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">OPEN-SOURCE BLOCK EXPLORER</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Etherscan Alternative for Custom EVM Chains</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Etherscan is the gold standard for browsing Ethereum mainnet. But for your own chain, its EaaS costs six figures, is closed-source, and has a weeks-long setup. Ethernal gives you a fully branded, self-hostable block explorer in under 5 minutes. MIT licensed, from $0.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 61, 149, 206;">
                    <div class="chain-stat"><span class="chain-stat-label">Setup</span> <span class="chain-stat-value">&lt; 5 min</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">License</span> <span class="chain-stat-value">MIT</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Self-host</span> <span class="chain-stat-value">Yes</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Pricing</span> <span class="chain-stat-value">From $0</span></div>
                </div>
            </div>

            <!-- TL;DR -->
            <section class="tldr-box my-12">
                <h2 class="tldr-label">TL;DR</h2>
                <p class="tldr-text">
                    Etherscan is unmatched for Ethereum mainnet browsing and brand recognition. For custom EVM chains, Ethernal offers a faster, cheaper path: open-source (MIT), self-hostable via Docker, native L2 bridge support, and published pricing starting at $0. Etherscan EaaS requires custom enterprise contracts and is not self-hostable.
                </p>
            </section>

            <!-- Why teams look for alternatives -->
            <section class="my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Why Teams Look for Etherscan Alternatives
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px; margin-bottom: 14px;">
                    Etherscan is the most recognized block explorer in crypto. For browsing Ethereum mainnet, it is the default. That said, teams launching their own EVM chains run into real friction with Etherscan's Explorer-as-a-Service (EaaS) offering:
                </p>
                <ul class="alt-reasons-list">
                    <li><strong style="color: var(--text-primary);">Enterprise pricing.</strong> EaaS contracts have been reported at $1-2M/year (CoinTelegraph, Snowtrace incident). There is no public pricing page.</li>
                    <li><strong style="color: var(--text-primary);">Closed-source.</strong> Etherscan's codebase is proprietary. You cannot audit, fork, or self-host it.</li>
                    <li><strong style="color: var(--text-primary);">Weeks-long setup.</strong> Deploying an EaaS instance means contacting sales, negotiating contracts, and waiting for provisioning.</li>
                    <li><strong style="color: var(--text-primary);">Vendor dependency risk.</strong> In 2023, Avalanche's Etherscan-powered explorer (Snowtrace) was discontinued, partly due to high costs. Teams lost their explorer infrastructure overnight.</li>
                    <li><strong style="color: var(--text-primary);">API paywalls.</strong> In November 2025, Base, Optimism, and Avalanche APIs on Etherscan moved behind $49+/month plans, breaking integrations that relied on free tiers.</li>
                </ul>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px; margin-top: 14px;">
                    None of this diminishes Etherscan's strengths. It has unmatched brand recognition and is the trusted standard for Ethereum mainnet. The question is whether that justifies the cost and constraints for your own chain.
                </p>
            </section>

            <!-- Detailed Comparisons -->
            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Setup and Deployment
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> is designed for speed. Clone the repo, run <code class="code-inline">make start</code>, paste your RPC URL. Under 5 minutes for a self-hosted instance. The entire stack is Node.js and Docker. Or skip self-hosting entirely and use the hosted version, which is instant.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Etherscan EaaS</strong> is a managed service with no self-hosted option. Deployment requires contacting the sales team, negotiating an enterprise contract, and waiting for Etherscan to provision your instance. Teams report the process taking weeks.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Ethernal is orders of magnitude faster to deploy. Etherscan EaaS is for teams with enterprise budgets and timelines.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> publishes its pricing. Self-hosted is free (MIT license). Hosted plans start at $0 (Starter, ad-supported), $150/month (Team, custom domain), and $500/month (App Chain, full white-label with custom branding, status page, and 5M transactions). Enterprise plans are available on request.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Etherscan</strong> is free to browse public chains. API plans range from free to $399/month. EaaS (running your own Etherscan-branded explorer) is custom-priced with no public tiers. Published reports and industry sources cite $1-2M/year for EaaS contracts.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> Ethernal's full white-label ($500/month) costs less per year than one month of reported Etherscan EaaS pricing.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Open Source and Data Sovereignty
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> is MIT licensed. The full source code is on GitHub. You can self-host on your own infrastructure, fork it, and customize it without restrictions. Your data stays on your servers.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Etherscan</strong> is proprietary. There is no source code access, no self-hosting option, and no way to audit the codebase. All data lives on Etherscan's infrastructure.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> If vendor lock-in or data sovereignty matters, Etherscan is not an option. Ethernal and Blockscout are.
                    </p>
                </div>
            </section>

            <section class="comparison-detail my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Brand Recognition
                </h2>
                <div class="comparison-prose">
                    <p>
                        <strong style="color: var(--text-primary);">Etherscan</strong> is the most recognized explorer brand in crypto. "Check Etherscan" is practically a verb in the ecosystem. An EaaS instance inherits that trust and familiarity, which has real value for user confidence.
                    </p>
                    <p>
                        <strong style="color: var(--text-primary);">Ethernal</strong> is a growing brand (370+ chains, 13,000+ users). But with full white-label, your users see your brand, not Ethernal's. The explorer looks and feels like a native part of your chain's ecosystem.
                    </p>
                    <p class="bottom-line">
                        <strong>Bottom line:</strong> If Etherscan brand recognition justifies the cost, use their EaaS. If your users should see your brand, white-label is the point.
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
                        <span>Etherscan</span>
                    </div>
                    <div class="comp-row">
                        <span>Open source</span>
                        <span class="comp-yes">Yes (MIT)</span>
                        <span class="comp-no">No</span>
                    </div>
                    <div class="comp-row">
                        <span>Self-hostable</span>
                        <span class="comp-yes">Yes (Docker)</span>
                        <span class="comp-no">No</span>
                    </div>
                    <div class="comp-row">
                        <span>Setup time</span>
                        <span class="comp-yes">&lt; 5 minutes</span>
                        <span class="comp-partial">Weeks (EaaS)</span>
                    </div>
                    <div class="comp-row">
                        <span>White-label</span>
                        <span class="comp-yes">Full (from $500/mo)</span>
                        <span class="comp-partial">Limited (EaaS)</span>
                    </div>
                    <div class="comp-row">
                        <span>L2 bridge support</span>
                        <span class="comp-yes">Built-in (OP Stack, Orbit)</span>
                        <span class="comp-partial">Limited</span>
                    </div>
                    <div class="comp-row">
                        <span>Transaction tracing</span>
                        <span class="comp-yes">Full call traces</span>
                        <span class="comp-partial">Basic</span>
                    </div>
                    <div class="comp-row">
                        <span>Contract verification</span>
                        <span class="comp-yes">Solidity, Vyper (UI/API/CLI)</span>
                        <span class="comp-yes">Solidity, Vyper (industry standard)</span>
                    </div>
                    <div class="comp-row">
                        <span>Etherscan-compatible API</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes (original)</span>
                    </div>
                    <div class="comp-row">
                        <span>Chain ecosystem</span>
                        <span class="comp-partial">370+ chains</span>
                        <span class="comp-partial">20+ chain-specific explorers</span>
                    </div>
                    <div class="comp-row">
                        <span>Starting price (custom chain)</span>
                        <span class="comp-yes">$0</span>
                        <span class="comp-no">Custom (reported $1-2M/yr)</span>
                    </div>
                    <div class="comp-row">
                        <span>Data sovereignty</span>
                        <span class="comp-yes">Full (self-host)</span>
                        <span class="comp-no">No</span>
                    </div>
                    <div class="comp-row">
                        <span>Brand recognition</span>
                        <span class="comp-partial">Growing</span>
                        <span class="comp-yes">Industry standard</span>
                    </div>
                </div>
            </section>

            <!-- When Etherscan is better -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Etherscan
                </h2>
                <ul class="who-list">
                    <li>Teams where Etherscan brand recognition is worth the enterprise cost</li>
                    <li>Projects on chains already supported by Etherscan (Ethereum, BSC, Polygon, etc.)</li>
                    <li>Enterprises that want the most established name in block exploration</li>
                </ul>
            </section>

            <!-- When Ethernal is better -->
            <section class="who-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Who Should Use Ethernal
                </h2>
                <ul class="who-list">
                    <li>Teams launching custom EVM chains who need an explorer now, not in weeks</li>
                    <li>Startups and mid-stage teams where $1M+/year for an explorer is not justifiable</li>
                    <li>Teams that need full control over their explorer's code and data</li>
                    <li>L2/L3 operators who need native bridge monitoring without custom Etherscan integrations</li>
                </ul>
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
                        <h3 class="faq-q">Is Etherscan free?</h3>
                        <p class="faq-a">Etherscan is free to browse public chains and has free API tiers. Running an Etherscan-branded explorer for your own chain (EaaS) requires an enterprise contract. Published reports cite $1-2M/year. Ethernal is free to self-host and has hosted plans starting at $0.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I self-host Etherscan?</h3>
                        <p class="faq-a">No. Etherscan is closed-source and proprietary. Ethernal (MIT license) and Blockscout are the main open-source, self-hostable alternatives for EVM chains.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal have Etherscan-compatible APIs?</h3>
                        <p class="faq-a">Yes. Ethernal provides Etherscan-compatible REST API endpoints. Existing tooling built for the Etherscan API format works with Ethernal out of the box.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What happened with Etherscan and Snowtrace?</h3>
                        <p class="faq-a">In 2023, Avalanche's Etherscan-powered explorer (Snowtrace) was discontinued, partly due to high EaaS costs. This highlighted the vendor lock-in risk of relying on closed-source explorer infrastructure for your chain.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I migrate from Etherscan to Ethernal?</h3>
                        <p class="faq-a">If you have your own chain, point Ethernal at the same RPC endpoint. It re-indexes automatically. For public Etherscan-indexed chains, Ethernal connects via your RPC URL independently. No manual data migration is required.</p>
                    </div>
                </div>
            </section>

            <!-- Related links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/blockscout-alternative" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-swap-horizontal</v-icon>
                        <div>
                            <span class="related-title">Blockscout Alternative</span>
                            <span class="related-desc">Open-source comparison: Ethernal vs Blockscout on setup, L2 support, and runtime</span>
                        </div>
                    </router-link>
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
    title: 'Etherscan Alternative - Ethernal',
    meta: [
        { name: 'description', content: 'Open-source Etherscan alternative for custom EVM chains. Self-hostable, MIT licensed, deploys in 5 minutes. Full white-label from $500/mo vs Etherscan\'s $1M+ EaaS.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Etherscan Alternative - Ethernal' },
        { property: 'og:description', content: 'Open-source Etherscan alternative for custom EVM chains. Self-hostable, MIT licensed, deploys in 5 minutes. Full white-label from $500/mo vs Etherscan\'s $1M+ EaaS.' },
        { property: 'og:url', content: 'https://tryethernal.com/etherscan-alternative' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/etherscan-alternative' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal - Etherscan Alternative",
                "description": "Open-source, MIT-licensed block explorer for custom EVM chains. Self-hostable via Docker, deploys in under 5 minutes, with native L2 bridge support and full white-label branding.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/etherscan-alternative",
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
                    { "@type": "ListItem", "position": 2, "name": "Etherscan Alternative", "item": "https://tryethernal.com/etherscan-alternative" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "Is Etherscan free?", "acceptedAnswer": { "@type": "Answer", "text": "Etherscan is free to browse public chains and has free API tiers. Running an Etherscan-branded explorer for your own chain (EaaS) requires an enterprise contract. Published reports cite $1-2M/year. Ethernal is free to self-host and has hosted plans starting at $0." } },
                    { "@type": "Question", "name": "Can I self-host Etherscan?", "acceptedAnswer": { "@type": "Answer", "text": "No. Etherscan is closed-source and proprietary. Ethernal (MIT license) and Blockscout are the main open-source, self-hostable alternatives for EVM chains." } },
                    { "@type": "Question", "name": "Does Ethernal have Etherscan-compatible APIs?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal provides Etherscan-compatible REST API endpoints. Existing tooling built for the Etherscan API format works with Ethernal out of the box." } },
                    { "@type": "Question", "name": "What happened with Etherscan and Snowtrace?", "acceptedAnswer": { "@type": "Answer", "text": "In 2023, Avalanche's Etherscan-powered explorer (Snowtrace) was discontinued, partly due to high EaaS costs. This highlighted the vendor lock-in risk of relying on closed-source explorer infrastructure." } },
                    { "@type": "Question", "name": "Can I migrate from Etherscan to Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "If you have your own chain, point Ethernal at the same RPC endpoint. It re-indexes automatically. For public Etherscan-indexed chains, Ethernal connects via your RPC URL independently." } }
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

/* Alternative reasons list */
.alt-reasons-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; max-width: 640px; }
.alt-reasons-list li { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; padding-left: 20px; position: relative; }
.alt-reasons-list li::before { content: '\2022'; position: absolute; left: 4px; color: #5DAAE0; font-weight: 700; }

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

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .tldr-box { padding: 18px 20px; }
}
</style>
