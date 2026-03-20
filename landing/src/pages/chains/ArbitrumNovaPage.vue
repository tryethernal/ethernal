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
                    <span class="current">Arbitrum Nova</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 · ARBITRUM ANYTRUST</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Arbitrum Nova</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Arbitrum Nova that connects to your RPC endpoint and provides real-time transaction decoding, contract verification, and AnyTrust data availability monitoring. Arbitrum Nova uses a committee-based DA model instead of posting all data to Ethereum, making it significantly cheaper for high-volume applications like gaming and social platforms. Deploy your Nova explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 229, 123, 36;">
                    <div class="chain-stat"><img src="/images/chains/arbitrum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">42170</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Arbitrum AnyTrust</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: AnyTrust Data Availability Monitoring -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-shield-link-variant-outline"
                    title="AnyTrust Data Availability Monitoring"
                    description="Arbitrum Nova uses AnyTrust, a committee-based data availability model where a Data Availability Committee (DAC) stores transaction data off-chain. Only a certificate (DACert) is posted to Ethereum L1. Ethernal tracks your DAC certificate postings, monitors committee health, and alerts if data availability falls below threshold. Configure it by entering your Rollup and Inbox contract addresses."
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
                                    explorer.nova.example/settings
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
                                        <div class="mock-field-input">0xFb209827c58283535b744575e11953DCC4bEAD88</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Inbox Contract Address</div>
                                        <div class="mock-field-input">0xc4448b71118c9071Bcb9734A0EAc55D18A153949</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: AnyTrust vs Full Rollup: Fee Comparison -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-scale-balance"
                    title="AnyTrust vs Full Rollup: Fee Comparison"
                    description="Nova transactions cost a fraction of what they cost on Arbitrum One because the DAC handles data availability instead of posting calldata to Ethereum. Ethernal displays the L1 data cost component for each transaction, so developers building on Nova can verify they are getting the expected fee savings compared to a full rollup."
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
                                    explorer.nova.example/tx/0x8a2f...d471
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-fee-breakdown">
                                    <div class="fee-title">Transaction Fee Breakdown</div>
                                    <div class="fee-row">
                                        <span class="fee-label">L2 Execution</span>
                                        <span class="fee-val">0.000012 ETH</span>
                                    </div>
                                    <div class="fee-row">
                                        <span class="fee-label">L1 Data (AnyTrust DAC)</span>
                                        <span class="fee-val highlight">0.000001 ETH</span>
                                    </div>
                                    <div class="fee-row total">
                                        <span class="fee-label">Total Fee</span>
                                        <span class="fee-val">0.000013 ETH</span>
                                    </div>
                                    <div class="fee-compare">
                                        <span class="compare-label">Same tx on Arbitrum One (full rollup)</span>
                                        <span class="compare-val">~0.000089 ETH</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature Grid -->
            <ChainFeatureGrid :features="[
                { icon: 'mdi-code-json', title: 'Transaction Decoding', description: 'Function names, parameters, and events decoded against verified ABIs' },
                { icon: 'mdi-check-decagram', title: 'Contract Verification', description: 'Verify Solidity source, read and write contract state from the UI' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up an Arbitrum Nova Block Explorer
                </h2>
                <div class="setup-steps">
                    <div class="setup-step">
                        <div class="step-number">1</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Create a workspace</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Sign up at <strong style="color: var(--text-primary);">app.tryethernal.com</strong> and create a new workspace. Select "Public Explorer" as the type.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">2</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Nova RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your Arbitrum Nova RPC endpoint. For mainnet, use <code class="code-inline">https://nova.arbitrum.io/rpc</code> or any provider like Alchemy or QuickNode.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure Orbit bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your Rollup (<code class="code-inline">0xFb209827c58283535b744575e11953DCC4bEAD88</code>) and Inbox (<code class="code-inline">0xc4448b71118c9071Bcb9734A0EAc55D18A153949</code>) contract addresses. Ethernal starts monitoring bridge activity automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.nova.example</code>) to your Ethernal workspace. Your explorer is live with transaction decoding, contract verification, and bridge tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Arbitrum Nova Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Arbitrum Nova typically evaluate Nova Arbiscan (official), Blockscout (open-source self-hosted), and Ethernal (hosted with AnyTrust-native features).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Nova Arbiscan</span>
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
                        <span>AnyTrust DA tracking</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Limited</span>
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
                        <span>Custom AnyTrust chain</span>
                        <span class="comp-yes">Supported</span>
                        <span class="comp-no">No</span>
                        <span class="comp-yes">Self-host</span>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Arbitrum Nova Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Start free with the Starter plan (ad-supported, includes contract verification, token tracking, and unlimited transactions).
                    For custom domains and L1 explorer integration, the Team plan starts at $150/month.
                    Full whitelabel with custom branding, status page, and 5M transactions included is available on the App Chain plan at $500/month.
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
                        <h3 class="faq-q">What is the difference between Arbitrum Nova and Arbitrum One?</h3>
                        <p class="faq-a">Arbitrum One is a full optimistic rollup that posts all transaction data to Ethereum L1. Arbitrum Nova uses AnyTrust, where a Data Availability Committee stores data off-chain and only posts a certificate to L1. This makes Nova significantly cheaper (often 10x or more) but introduces a trust assumption on the committee. Nova is ideal for gaming, social, and high-frequency use cases.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How do I set up a block explorer for Arbitrum Nova?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your Arbitrum Nova RPC endpoint (<code class="code-inline">https://nova.arbitrum.io/rpc</code>), configure the Orbit bridge with your Rollup and Inbox addresses, and point your custom domain. The process takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Did Reddit use Arbitrum Nova?</h3>
                        <p class="faq-a">Yes. Reddit chose Arbitrum Nova for its Community Points system in 2022, leveraging the low transaction costs to enable millions of token transfers for subreddit rewards. Although the Community Points program was sunset in late 2023, it demonstrated Nova's capacity for high-volume social applications.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal for my own AnyTrust chain?</h3>
                        <p class="faq-a">Yes. If you are running a custom Arbitrum Orbit chain with AnyTrust data availability, Ethernal supports it. Provide your chain's RPC and Rollup/Inbox contract addresses and Ethernal configures bridge monitoring automatically.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal track AnyTrust Data Availability Committee status?</h3>
                        <p class="faq-a">Ethernal monitors DAC certificate postings to Ethereum L1 and tracks batch submission patterns. You can see which batches used AnyTrust DA certificates versus fallback rollup mode, giving visibility into your chain's data availability health.</p>
                    </div>
                </div>
            </section>

            <!-- Related -->
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
                    <router-link to="/chains/arbitrum-one" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-link-variant</v-icon>
                        <div>
                            <span class="related-title">Arbitrum One Explorer</span>
                            <span class="related-desc">Full rollup explorer with retryable ticket tracking and BOLD fraud proofs</span>
                        </div>
                    </router-link>
                    <router-link to="/pricing" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-tag-outline</v-icon>
                        <div>
                            <span class="related-title">Pricing</span>
                            <span class="related-desc">Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise</span>
                        </div>
                    </router-link>
                </div>
            </section>
        </v-container>

        <LandingCTA chain="arbitrum-nova" />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import ChainFeatureGrid from '@/components/ChainFeatureGrid.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Block Explorer for Arbitrum Nova — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Arbitrum Nova (AnyTrust). Transaction decoding, contract verification, AnyTrust DA monitoring, and low-cost gaming transaction tracking.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Arbitrum Nova — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Arbitrum Nova (AnyTrust). Transaction decoding, contract verification, AnyTrust DA monitoring, and low-cost gaming transaction tracking.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/arbitrum-nova' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-arbitrum-nova.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/arbitrum-nova' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Arbitrum Nova",
                "description": "Hosted block explorer for Arbitrum Nova with transaction decoding, contract verification, AnyTrust DA monitoring, and gaming transaction tracking.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/arbitrum-nova",
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
                "name": "How to set up a block explorer for Arbitrum Nova",
                "description": "Deploy a hosted block explorer for Arbitrum Nova in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect your Nova RPC", "text": "Paste your Arbitrum Nova RPC endpoint (e.g. https://nova.arbitrum.io/rpc)." },
                    { "@type": "HowToStep", "name": "Configure Orbit bridge", "text": "Enter the Rollup (0xFb209827c58283535b744575e11953DCC4bEAD88) and Inbox contract addresses." },
                    { "@type": "HowToStep", "name": "Go live", "text": "Point your custom domain to your Ethernal workspace. Your explorer is live." }
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
                    { "@type": "ListItem", "position": 2, "name": "Arbitrum Nova", "item": "https://tryethernal.com/chains/arbitrum-nova" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "What is the difference between Arbitrum Nova and Arbitrum One?", "acceptedAnswer": { "@type": "Answer", "text": "Arbitrum One is a full optimistic rollup posting all data to Ethereum. Nova uses AnyTrust with a Data Availability Committee for cheaper transactions, ideal for gaming and social use cases." } },
                    { "@type": "Question", "name": "How do I set up a block explorer for Arbitrum Nova?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your Nova RPC endpoint, configure Orbit bridge addresses, and point your custom domain. Takes under 5 minutes." } },
                    { "@type": "Question", "name": "Did Reddit use Arbitrum Nova?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Reddit used Nova for Community Points, processing millions of token transfers at minimal cost. The program was sunset in late 2023." } },
                    { "@type": "Question", "name": "Can I use Ethernal for my own AnyTrust chain?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal supports any Arbitrum Orbit chain with AnyTrust data availability. Provide your RPC and contract addresses." } },
                    { "@type": "Question", "name": "Does Ethernal track AnyTrust DAC status?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal monitors DAC certificate postings and tracks batch submission patterns, showing AnyTrust DA certificates versus fallback rollup mode." } }
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

/* Fee breakdown */
.mock-fee-breakdown { font-size: 12px; }
.fee-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.fee-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--drawer-divider); }
.fee-row.total { background: var(--glass-bg); border-radius: 8px; border-bottom: none; margin-top: 4px; font-weight: 600; }
.fee-label { color: var(--text-secondary); }
.fee-val { color: var(--text-primary); }
.fee-val.highlight { color: #22C55E; }
.fee-compare { display: flex; justify-content: space-between; padding: 10px 14px; margin-top: 12px; border-radius: 8px; background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.15); }
.compare-label { color: var(--text-muted); font-size: 11px; }
.compare-val { color: #F59E0B; font-size: 11px; font-weight: 600; }

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
}
</style>
