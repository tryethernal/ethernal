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
                    <span class="current">Degen Chain</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L3 APPCHAIN · ARBITRUM ORBIT</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Degen Chain</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Degen Chain, the community-driven L3 built on Base using Arbitrum Orbit. Degen Chain powers the DEGEN tipping token ecosystem on Farcaster, processing thousands of micro-transactions daily. Connect your RPC, configure Orbit bridge monitoring, and have a branded explorer running in minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 163, 110, 253;">
                    <div class="chain-stat"><img src="/images/chains/degen.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">666666666</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Arbitrum Orbit</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Base (L3)</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">DEGEN</span></div>
                </div>
            </div>

            <!-- Feature 1: L3 on Base: Orbit Bridge Monitoring -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-layers-triple-outline"
                    title="L3 on Base: Orbit Bridge Monitoring"
                    description="Degen Chain is an L3 that settles on Base (which itself settles on Ethereum). Ethernal monitors the Orbit bridge between Degen Chain and Base, tracking deposits, withdrawals, and assertion postings. Configure it with your chain's Rollup and Inbox contract addresses on Base."
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
                                    explorer.degen.example/settings
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">Arbitrum Orbit Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L2 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Base (L2)</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Rollup Contract Address</div>
                                        <div class="mock-field-input">0xD34F3a11F89452e1F16061FB55Ea6E4a3Fa71810</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Inbox Contract Address</div>
                                        <div class="mock-field-input">0xFF55fB76F5671dD9eB6215eCFfEe267153e648d0</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: DEGEN Token Transfer Tracking -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-swap-horizontal"
                    title="DEGEN Token Transfer Tracking"
                    description="The DEGEN token is the native currency of the Degen Chain ecosystem, used for tipping on Farcaster and community rewards. Ethernal indexes every ERC-20 transfer, tracks balance changes per address, and shows token holder distributions. Monitor tipping activity, reward distributions, and DEX swaps in real time."
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
                                    explorer.degen.example/token-transfers
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header five-col">
                                        <span>Token</span>
                                        <span>From</span>
                                        <span>To</span>
                                        <span>Amount</span>
                                        <span>Tx Hash</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-token"><span class="token-badge degen">DEGEN</span></span>
                                        <span class="tbl-addr">0x4a21...8f33</span>
                                        <span class="tbl-addr">0x9b12...2c71</span>
                                        <span class="tbl-num">10,000</span>
                                        <span class="tbl-hash">0x7c3a...e912</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-token"><span class="token-badge degen">DEGEN</span></span>
                                        <span class="tbl-addr">0x6e77...1d82</span>
                                        <span class="tbl-addr">0x3f45...7a99</span>
                                        <span class="tbl-num">5,000</span>
                                        <span class="tbl-hash">0x2d81...a543</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-token"><span class="token-badge usdc">USDC</span></span>
                                        <span class="tbl-addr">0x8c33...4e51</span>
                                        <span class="tbl-addr">0x1a67...9f12</span>
                                        <span class="tbl-num">250.00</span>
                                        <span class="tbl-hash">0x5f19...b887</span>
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
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up a Degen Chain Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect the Degen Chain RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the Degen Chain RPC endpoint: <code class="code-inline">https://rpc.degen.tips</code>. This connects Ethernal to Degen Chain's L3 nodes.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure Orbit bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter the Rollup and Inbox contract addresses on Base. Ethernal starts monitoring bridge deposits, withdrawals, and assertion postings between Degen Chain and Base automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.degen.example</code>) to your Ethernal workspace. Your Degen Chain explorer is live with full transaction decoding and token tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Degen Chain Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Degen Chain can choose between the community explorer, Blockscout (self-hosted), or Ethernal (hosted with Orbit-native features).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Community Explorer</span>
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
                        <span>L3 bridge tracking</span>
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
                        <span class="comp-partial">Limited</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Degen Chain Explorers
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
                        <h3 class="faq-q">What is Degen Chain?</h3>
                        <p class="faq-a">Degen Chain is a Layer 3 blockchain built on Base using the Arbitrum Orbit framework. It was created by the Farcaster community to power the DEGEN tipping token ecosystem. As an L3, it settles on Base (which settles on Ethereum), giving it extremely low transaction costs while inheriting Ethereum's security.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How do I set up a block explorer for Degen Chain?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste the Degen Chain RPC endpoint (<code class="code-inline">https://rpc.degen.tips</code>), configure the Orbit bridge with your Rollup and Inbox addresses on Base, and point your custom domain. Takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the DEGEN token?</h3>
                        <p class="faq-a">DEGEN is the native gas and governance token of Degen Chain. It originated as a Farcaster community tipping token and became the foundation for a dedicated L3 chain. Users pay gas fees in DEGEN and use it for tipping, rewards, and community governance.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Is Degen Chain an L2 or L3?</h3>
                        <p class="faq-a">Degen Chain is an L3. It runs on the Arbitrum Orbit framework and settles on Base (an OP Stack L2), which in turn settles on Ethereum. This layered architecture provides very low fees while inheriting security guarantees from both Base and Ethereum.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I track DEGEN tipping activity with Ethernal?</h3>
                        <p class="faq-a">Yes. Ethernal indexes all token transfers on Degen Chain, including DEGEN tips. Once tipping contracts are verified, you see decoded function calls like tip(), transferFrom(), and the associated Transfer events with full parameter visibility.</p>
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
                    <router-link to="/chains/base" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-link-variant</v-icon>
                        <div>
                            <span class="related-title">Base Explorer</span>
                            <span class="related-desc">Degen Chain's parent L2, built on the OP Stack by Coinbase</span>
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
    title: 'Block Explorer for Degen Chain — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Degen Chain (L3 on Base, Arbitrum Orbit). DEGEN token tracking, transaction decoding, contract verification, and Farcaster ecosystem visibility.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Degen Chain — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Degen Chain (L3 on Base, Arbitrum Orbit). DEGEN token tracking, transaction decoding, contract verification, and Farcaster ecosystem visibility.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/degen-chain' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-degen-chain.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/degen-chain' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Degen Chain",
                "description": "Hosted block explorer for Degen Chain with DEGEN token tracking, transaction decoding, contract verification, and L3 bridge monitoring.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/degen-chain",
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
                "name": "How to set up a block explorer for Degen Chain",
                "description": "Deploy a hosted block explorer for Degen Chain in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect Degen Chain RPC", "text": "Paste the Degen Chain RPC endpoint (https://rpc.degen.tips)." },
                    { "@type": "HowToStep", "name": "Configure Orbit bridge", "text": "Enter the Rollup and Inbox contract addresses on Base for L3 bridge monitoring." },
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
                    { "@type": "ListItem", "position": 2, "name": "Degen Chain", "item": "https://tryethernal.com/chains/degen-chain" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "What is Degen Chain?", "acceptedAnswer": { "@type": "Answer", "text": "Degen Chain is a Layer 3 blockchain built on Base using Arbitrum Orbit, created by the Farcaster community to power the DEGEN tipping token ecosystem." } },
                    { "@type": "Question", "name": "How do I set up a block explorer for Degen Chain?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste the RPC endpoint (https://rpc.degen.tips), configure Orbit bridge addresses, and point your domain. Takes under 5 minutes." } },
                    { "@type": "Question", "name": "What is the DEGEN token?", "acceptedAnswer": { "@type": "Answer", "text": "DEGEN is the native gas and governance token of Degen Chain, originating as a Farcaster community tipping token." } },
                    { "@type": "Question", "name": "Is Degen Chain an L2 or L3?", "acceptedAnswer": { "@type": "Answer", "text": "Degen Chain is an L3, running on Arbitrum Orbit and settling on Base, which settles on Ethereum." } },
                    { "@type": "Question", "name": "Can I track DEGEN tipping activity with Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal indexes all token transfers including DEGEN tips, with decoded function calls and full parameter visibility." } }
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

/* Table */
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; gap: 8px; align-items: center; font-size: 11px; }
.mock-tbl-header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--drawer-divider); margin-bottom: 4px; }
.mock-tbl-row { padding: 10px 0; border-bottom: 1px solid var(--drawer-divider); }
.mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 0.7fr 0.9fr 0.9fr 0.8fr 1fr; }
.tbl-num { color: var(--text-primary); }
.tbl-hash { color: #5DAAE0; }
.tbl-addr { color: var(--text-secondary); }
.token-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }
.token-badge.degen { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }
.token-badge.usdc { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }

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
    .mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 1fr 1fr 1fr; font-size: 10px; }
    .mock-tbl-header.five-col span:nth-child(n+4), .mock-tbl-row.five-col span:nth-child(n+4) { display: none; }
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
}
</style>
