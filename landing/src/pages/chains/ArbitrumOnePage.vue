<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Chain Hero -->
            <div class="chain-hero">
                <nav class="breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <span>Chains</span>
                    <span class="sep">/</span>
                    <span class="current">Arbitrum One</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · ARBITRUM ORBIT</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Arbitrum One</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Arbitrum One that provides real-time transaction decoding, contract verification, and Nitro-native features. Connect your RPC, configure your Orbit settings, and have a branded explorer running in minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 40, 160, 240;">
                    <div class="chain-stat"><img src="/images/chains/arbitrum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">42161</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Arbitrum Orbit</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: Orbit-Native Configuration -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cog-outline"
                    title="Orbit-Native Configuration"
                    description="Arbitrum One runs on Nitro, the engine behind Arbitrum Orbit chains. Ethernal monitors your Orbit chain's RollupCore contract, tracks assertion postings, and detects challenges. Configure it with your chain's Rollup and Inbox contract addresses."
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
                                    explorer.arb.example/settings
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">Arbitrum Orbit Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L1 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Ethereum Mainnet</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Rollup Contract Address</div>
                                        <div class="mock-field-input">0x5eF0D09d1E6204141B4d37530808eD19f60FBa35</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Inbox Contract Address</div>
                                        <div class="mock-field-input">0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: Decoded Transactions with Retryable Tickets -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-code-json"
                    title="Decoded Transactions with Retryable Tickets"
                    description="Arbitrum uses retryable tickets for L1-to-L2 messaging. When a cross-chain message is submitted, Ethernal decodes both the L1 transaction and the resulting L2 retryable ticket execution. You see the full lifecycle: submission, auto-redeem, and final execution with decoded parameters."
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
                                    explorer.arb.example/tx/0x6bc1…8d3f
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-trace">
                                    <div class="d-flex justify-space-between align-center mb-3">
                                        <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                        <span class="status-chip success">Success</span>
                                    </div>
                                    <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x5288…6bE1</span><span class="trace-method">createRetryableTicket(address,uint256,uint256,address,address,uint256,uint256,bytes)</span></div>
                                    <div class="trace-node indent"><span class="trace-op delegatecall">DELEGATECALL</span><span class="trace-addr">0x00A0…1235</span><span class="trace-method">_deliverMessage(address,uint256,uint256,uint256,bytes)</span></div>
                                    <div class="trace-node indent-2"><span class="trace-op event">LOG</span><span class="trace-method">InboxMessageDelivered(messageNum: 847291, data: 0x...)</span></div>
                                    <div class="trace-node indent-2"><span class="trace-op event">LOG</span><span class="trace-method">MessageDelivered(messageIndex, beforeAcc, inbox, ...)</span></div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature Grid -->
            <ChainFeatureGrid :features="[
                { icon: 'mdi-check-decagram', title: 'Contract Verification', description: 'Verify Solidity source, read and write contract state from the UI' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Architecture context -->
            <section class="arch-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Arbitrum One Architecture
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 700px; margin-bottom: 16px;">
                    Arbitrum One is an optimistic rollup built on the Nitro tech stack by Offchain Labs. It settles on Ethereum and uses fraud proofs (via BOLD, the Bounded Liquidity Delay protocol) to guarantee correctness. Key architectural details for developers:
                </p>
                <div class="arch-cards">
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Nitro Execution</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Compiles EVM to WASM for dispute resolution. Standard Solidity contracts deploy and run identically to Ethereum. Gas pricing uses a two-dimensional model: L2 computation + L1 calldata.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Sequencer</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Currently centralized (operated by Offchain Labs) with a decentralized sequencer on the roadmap. Transactions get soft-confirmed in under 1 second, with finality on Ethereum after the challenge period.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">BOLD Fraud Proofs</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Bounded Liquidity Delay ensures that disputes resolve within a fixed time window, preventing delay attacks. Validators can challenge incorrect state assertions posted to Ethereum.</p>
                    </div>
                </div>
            </section>

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up an Arbitrum One Block Explorer
                </h2>
                <div class="setup-steps">
                    <div class="setup-step">
                        <div class="step-number">1</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Create a workspace</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Sign up at <strong style="color: var(--text-primary);">app.tryethernal.com</strong> and create a Public Explorer workspace.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">2</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Arbitrum RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your RPC endpoint. For Arbitrum One mainnet: <code class="code-inline">https://arb1.arbitrum.io/rpc</code>, or use Alchemy, Infura, QuickNode, or any provider.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure Orbit bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your Rollup contract (<code class="code-inline">0x5eF0D09d1E6204141B4d37530808eD19f60FBa35</code>) and Inbox (<code class="code-inline">0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f</code>) addresses.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain and your branded Arbitrum One explorer is live with transaction decoding, contract verification, and bridge tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Arbitrum Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Arbitrum typically evaluate Arbiscan (official, Etherscan-operated), Blockscout, and Ethernal.
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Arbiscan</span>
                        <span>Blockscout</span>
                    </div>
                    <div class="comp-row">
                        <span>Custom domain</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-no">No</span>
                        <span class="comp-yes">Yes (self-host)</span>
                    </div>
                    <div class="comp-row">
                        <span>Full whitelabel</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-no">No</span>
                        <span class="comp-yes">Yes (self-host)</span>
                    </div>
                    <div class="comp-row">
                        <span>L1 bridge tracking</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Partial</span>
                        <span class="comp-no">Plugin</span>
                    </div>
                    <div class="comp-row">
                        <span>Hosted (no infra)</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-no">Self-host</span>
                    </div>
                    <div class="comp-row">
                        <span>Setup time</span>
                        <span class="comp-yes">&lt; 5 min</span>
                        <span class="comp-partial">N/A (public)</span>
                        <span class="comp-no">Hours/days</span>
                    </div>
                    <div class="comp-row">
                        <span>Call traces</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Your own Orbit chain</span>
                        <span class="comp-yes">Supported</span>
                        <span class="comp-no">No</span>
                        <span class="comp-yes">Self-host</span>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Arbitrum Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    The Starter plan (free, ad-supported) includes contract verification, token tracking, and unlimited transactions.
                    For custom domains and L1 bridge integration, the Team plan is $150/month.
                    Full whitelabel with custom branding, status page, and 5M transactions is $500/month on the App Chain plan.
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
                        <h3 class="faq-q">How do I set up a block explorer for Arbitrum One?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your Arbitrum One RPC endpoint (e.g. <code class="code-inline">https://arb1.arbitrum.io/rpc</code>), configure the Orbit bridge settings with your Rollup and Inbox addresses, and point your custom domain. Takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal work with custom Arbitrum Orbit chains?</h3>
                        <p class="faq-a">Yes. Ethernal supports any chain built on the Arbitrum Orbit stack, not just Arbitrum One. Provide your custom chain's RPC and Rollup/Inbox addresses, and Ethernal configures bridge monitoring automatically.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal as an Arbiscan alternative for my own chain?</h3>
                        <p class="faq-a">Yes. Arbiscan only serves the public Arbitrum One and Nova networks. If you are running your own Orbit chain, Ethernal gives you a dedicated, whitelabel explorer with your domain and branding.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between Arbitrum One, Arbitrum Nova, and Orbit?</h3>
                        <p class="faq-a">Arbitrum One is the main rollup (optimistic, settles on Ethereum). Arbitrum Nova uses AnyTrust (committee-based data availability) for lower fees. Orbit is the framework for launching custom L2/L3 chains. Ethernal supports all three.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support Arbitrum Sepolia testnet?</h3>
                        <p class="faq-a">Yes. Connect your Arbitrum Sepolia RPC (chain ID 421614) and you get the same features: transaction decoding, contract verification, and bridge monitoring.</p>
                    </div>
                </div>
            </section>

            <!-- Related links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/arbitrum-orbit" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon>
                        <div>
                            <span class="related-title">Arbitrum Orbit Explorer</span>
                            <span class="related-desc">Bridge monitoring and Nitro-native features for all Orbit chains</span>
                        </div>
                    </router-link>
                    <router-link to="/pricing" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-tag-outline</v-icon>
                        <div>
                            <span class="related-title">Pricing</span>
                            <span class="related-desc">Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise</span>
                        </div>
                    </router-link>
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
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import ChainFeatureGrid from '@/components/ChainFeatureGrid.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Block Explorer for Arbitrum One — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Arbitrum One (Nitro). Transaction decoding, contract verification, retryable ticket tracking, and Orbit bridge monitoring.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Arbitrum One — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Arbitrum One (Nitro). Transaction decoding, contract verification, retryable ticket tracking, and Orbit bridge monitoring.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/arbitrum-one' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-arbitrum-one.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/arbitrum-one' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Arbitrum One",
                "description": "Hosted block explorer for Arbitrum One with transaction decoding, contract verification, retryable ticket tracking, and Orbit bridge monitoring.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/arbitrum-one",
                "offers": [
                    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Ad-supported, contract verification, token tracking, unlimited transactions" },
                    { "@type": "Offer", "name": "Team", "price": "150", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Custom domain, native token, L1 explorer, 100k tx included" },
                    { "@type": "Offer", "name": "App Chain", "price": "500", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Full whitelabel, custom branding, status page, 5M tx included" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": "How to set up a block explorer for Arbitrum One",
                "description": "Deploy a hosted block explorer for Arbitrum One in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a Public Explorer workspace." },
                    { "@type": "HowToStep", "name": "Connect your Arbitrum RPC", "text": "Paste your Arbitrum One RPC endpoint (e.g. https://arb1.arbitrum.io/rpc)." },
                    { "@type": "HowToStep", "name": "Configure Orbit bridge", "text": "Enter the Rollup (0x5eF0D09d1E6204141B4d37530808eD19f60FBa35) and Inbox contract addresses." },
                    { "@type": "HowToStep", "name": "Go live", "text": "Point your custom domain to your Ethernal workspace." }
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
                    { "@type": "ListItem", "position": 2, "name": "Arbitrum One", "item": "https://tryethernal.com/chains/arbitrum-one" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Arbitrum One?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your Arbitrum One RPC endpoint, configure the Orbit bridge settings, and point your custom domain. Takes under 5 minutes." } },
                    { "@type": "Question", "name": "Does Ethernal work with custom Arbitrum Orbit chains?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal supports any chain built on the Arbitrum Orbit stack. Provide your chain's RPC and contract addresses." } },
                    { "@type": "Question", "name": "Can I use Ethernal as an Arbiscan alternative?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal gives you a dedicated, whitelabel explorer with your own domain and branding, unlike Arbiscan which only serves public networks." } },
                    { "@type": "Question", "name": "What is the difference between Arbitrum One, Nova, and Orbit?", "acceptedAnswer": { "@type": "Answer", "text": "Arbitrum One is the main optimistic rollup. Nova uses AnyTrust for lower fees. Orbit is the framework for custom L2/L3 chains. Ethernal supports all three." } },
                    { "@type": "Question", "name": "Does Ethernal support Arbitrum Sepolia testnet?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Connect your Arbitrum Sepolia RPC (chain ID 421614) for full transaction decoding, contract verification, and bridge monitoring." } }
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
.chain-stat-logo { width: 16px; height: 16px; border-radius: 50%; object-fit: contain; margin-right: 6px; vertical-align: -4px; }

/* Breadcrumb */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.breadcrumb a { color: #5DAAE0; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { color: var(--text-muted); }
.breadcrumb .current { color: var(--text-secondary); }

/* Browser preview */
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Settings */
.mock-settings-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.mock-field { margin-bottom: 14px; }
.mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input, .mock-field-select { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-field-select { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-family: 'Roboto', sans-serif; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }

/* Trace */
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; overflow: hidden; }
.trace-node.indent { padding-left: 20px; }
.trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.delegatecall { background: rgba(245, 158, 11, 0.12); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.25); }
.trace-op.event { background: rgba(34, 197, 94, 0.12); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; white-space: nowrap; }
.trace-method { color: #CBD5E1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }

/* Architecture cards */
.arch-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.arch-card { padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; }

/* Setup steps */
.setup-steps { display: flex; flex-direction: column; gap: 20px; }
.setup-step { display: flex; gap: 16px; align-items: flex-start; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }

/* Comparison */
.comparison-table { border: 1px solid var(--drawer-divider); border-radius: 12px; overflow: hidden; }
.comp-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--drawer-divider); }
.comp-row:last-child { border-bottom: none; }
.comp-header { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.comp-row:not(.comp-header) span:first-child { color: var(--text-secondary); }
.comp-yes { color: #22C55E; }
.comp-no { color: var(--text-muted); }
.comp-partial { color: #F59E0B; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 16px; }
.faq-item { padding: 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; }
.faq-q { color: var(--text-primary); font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; }
.faq-a { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.7; margin: 0; }

/* Related */
.related-links { display: flex; flex-direction: column; gap: 8px; }
.related-link { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; text-decoration: none; transition: border-color 0.2s; }
.related-link:hover { border-color: var(--border-glow); }
.related-link div { display: flex; flex-direction: column; gap: 2px; }
.related-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.related-desc { color: var(--text-muted); font-size: 0.8rem; }

/* Pricing */
.pricing-context .btn-outline { border: 1px solid var(--btn-outline-border); color: var(--text-secondary); text-transform: none; letter-spacing: 0; font-weight: 500; }

@media (max-width: 600px) {
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .arch-cards { grid-template-columns: 1fr; }
}
</style>
