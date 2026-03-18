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
                    <span class="current">BNB Chain</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L1 · BNB SMART CHAIN</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for BNB Chain</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                    Ethernal is a hosted block explorer for BNB Smart Chain (BSC) that connects to your RPC endpoint and provides real-time transaction decoding, contract verification, call traces, and token tracking. Deploy a full-featured, whitelabel explorer for your BNB Chain infrastructure in under 5 minutes.
                </p>
                <div class="chain-stats-strip" style="--chain-color: 243, 186, 47;">
                    <div class="chain-stat"><img src="/images/chains/bnb.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">56</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Consensus</span> <span class="chain-stat-value">PoSA</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">BNB</span></div>
                </div>
            </div>

            <!-- Feature 1: Transaction Decoding -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-code-json"
                    title="Full Transaction Decoding on BNB Chain"
                    description="BNB Smart Chain is fully EVM-compatible, which means Ethernal decodes every transaction out of the box: function calls, parameters, emitted events, and the complete internal call tree. Whether your users are interacting with DeFi protocols, NFT marketplaces, or custom contracts, every operation is decoded against verified ABIs and displayed in a clean, readable format."
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
                                    explorer.bnb.example/tx/0xd4e5...
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-decoded">
                                    <div class="mock-decoded-title">Decoded Transaction</div>
                                    <div class="mock-decoded-fn">
                                        <span class="fn-name">swapExactTokensForTokens</span>
                                        <span class="fn-badge">PancakeRouter</span>
                                    </div>
                                    <div class="mock-params">
                                        <div class="param-row">
                                            <span class="param-name">amountIn</span>
                                            <span class="param-type">uint256</span>
                                            <span class="param-val">1000000000000000000</span>
                                        </div>
                                        <div class="param-row">
                                            <span class="param-name">amountOutMin</span>
                                            <span class="param-type">uint256</span>
                                            <span class="param-val">2847391023</span>
                                        </div>
                                        <div class="param-row">
                                            <span class="param-name">path</span>
                                            <span class="param-type">address[]</span>
                                            <span class="param-val">[WBNB, BUSD]</span>
                                        </div>
                                        <div class="param-row">
                                            <span class="param-name">to</span>
                                            <span class="param-type">address</span>
                                            <span class="param-val">0xa1b2...c3d4</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: Call Traces -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-bug"
                    title="Call Traces for Debugging"
                    description="BNB Chain's 3-second block time and low gas costs encourage complex multi-contract interactions. Ethernal reconstructs the full execution trace for every transaction: CALL, DELEGATECALL, STATICCALL, and CREATE operations, nested to any depth. When a transaction reverts, you see exactly which internal call failed and why."
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
                                    explorer.bnb.example/tx/0xf7a8.../trace
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-trace">
                                    <div class="mock-trace-title">Call Trace</div>
                                    <div class="mock-trace-row depth-0">
                                        <span class="trace-op">CALL</span>
                                        <span class="trace-addr">0x10ED...Router</span>
                                        <span class="trace-fn">swapExactTokensForTokens()</span>
                                    </div>
                                    <div class="mock-trace-row depth-1">
                                        <span class="trace-op">STATICCALL</span>
                                        <span class="trace-addr">0xcA14...Factory</span>
                                        <span class="trace-fn">getPair()</span>
                                    </div>
                                    <div class="mock-trace-row depth-1">
                                        <span class="trace-op">CALL</span>
                                        <span class="trace-addr">0x16b9...Pair</span>
                                        <span class="trace-fn">swap()</span>
                                    </div>
                                    <div class="mock-trace-row depth-2">
                                        <span class="trace-op">CALL</span>
                                        <span class="trace-addr">0xbb4C...WBNB</span>
                                        <span class="trace-fn">transfer()</span>
                                    </div>
                                    <div class="mock-trace-row depth-2">
                                        <span class="trace-op">CALL</span>
                                        <span class="trace-addr">0xe9e7...BUSD</span>
                                        <span class="trace-fn">transfer()</span>
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
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'BEP-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' },
                { icon: 'mdi-chart-line', title: 'Analytics Dashboard', description: 'Transaction volume, gas usage, and active addresses over time' }
            ]" />

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up a BNB Chain Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your BNB Chain RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your BSC RPC endpoint. Use a provider like NodeReal, Ankr, QuickNode, or the public endpoint <code class="code-inline">https://bsc-dataseed.binance.org</code>. Ethernal starts syncing blocks immediately.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Set your native token</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Configure BNB as the native token. Ethernal will display gas costs, balances, and value transfers in BNB throughout the UI.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.bnb.example</code>) to your Ethernal workspace. Your BNB Chain explorer is live with full transaction decoding, contract verification, and token tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison section -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    BNB Chain Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on BNB Chain typically choose between BscScan (the official explorer from Etherscan), Blockscout (open-source self-hosted), or Ethernal (hosted with whitelabel and instant setup).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>BscScan</span>
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
                        <span>Contract verification</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                    </div>
                    <div class="comp-row">
                        <span>Call traces</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-yes">Yes</span>
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
                        <span>Private/custom chain</span>
                        <span class="comp-yes">Yes</span>
                        <span class="comp-no">Mainnet only</span>
                        <span class="comp-yes">Yes (self-host)</span>
                    </div>
                </div>
            </section>

            <!-- Pricing context -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for BNB Chain Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Start free with the Starter plan (ad-supported, includes contract verification, token tracking, and unlimited transactions).
                    For custom domains and branding, the Team plan starts at $150/month.
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

            <!-- FAQ Section -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Frequently Asked Questions
                </h2>
                <div class="faq-list">
                    <div class="faq-item">
                        <h3 class="faq-q">How do I set up a block explorer for BNB Chain?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your BSC RPC endpoint (any provider or the public Binance endpoint), configure BNB as the native token, and point your custom domain. The whole process takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal as a BscScan alternative?</h3>
                        <p class="faq-a">Yes. If you need a BNB Chain explorer under your own domain and branding (for your dApp, protocol, or internal team), Ethernal gives you a whitelabel alternative to BscScan with full control over the experience.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support BNB Chain testnet?</h3>
                        <p class="faq-a">Yes. Ethernal works with any EVM-compatible chain, including BNB Chain testnet (chain ID 97). Connect your testnet RPC and you get the same features as mainnet: transaction decoding, contract verification, and token tracking.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support BEP-20 tokens?</h3>
                        <p class="faq-a">Yes. BEP-20 is the BNB Chain equivalent of ERC-20. Since both standards use the same Transfer event and interface, Ethernal tracks all BEP-20 token transfers, balance changes, and token metadata automatically.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can Ethernal handle BNB Chain's 3-second block time?</h3>
                        <p class="faq-a">Yes. Ethernal is designed for high-throughput chains and syncs BNB Chain's fast blocks in real time. All transactions, token transfers, and contract interactions are indexed as they happen with no lag.</p>
                    </div>
                </div>
            </section>

            <!-- Internal links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/chains/ethereum" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-ethereum</v-icon>
                        <div>
                            <span class="related-title">Ethereum Explorer</span>
                            <span class="related-desc">Block explorer for Ethereum mainnet with call traces and contract verification</span>
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
    title: 'Block Explorer for BNB Chain — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for BNB Smart Chain (BSC). Transaction decoding, contract verification, call traces, BEP-20 token tracking, and custom domain support.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for BNB Chain — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for BNB Smart Chain (BSC). Transaction decoding, contract verification, call traces, BEP-20 token tracking, and custom domain support.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/bnb-chain' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-bnb-chain.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/bnb-chain' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for BNB Chain",
                "description": "Hosted block explorer for BNB Smart Chain with transaction decoding, contract verification, call traces, and BEP-20 token tracking.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/bnb-chain",
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
                "name": "How to set up a block explorer for BNB Chain",
                "description": "Deploy a hosted block explorer for BNB Smart Chain in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect your BNB Chain RPC", "text": "Paste your BSC RPC endpoint from a provider or the public Binance endpoint." },
                    { "@type": "HowToStep", "name": "Set your native token", "text": "Configure BNB as the native token for gas costs and balance displays." },
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
                    { "@type": "ListItem", "position": 2, "name": "BNB Chain", "item": "https://tryethernal.com/chains/bnb-chain" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for BNB Chain?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your BSC RPC endpoint, configure BNB as native token, and point your custom domain. The process takes under 5 minutes." } },
                    { "@type": "Question", "name": "Can I use Ethernal as a BscScan alternative?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal gives you a whitelabel BNB Chain explorer under your own domain and branding with full control over the experience." } },
                    { "@type": "Question", "name": "Does Ethernal support BNB Chain testnet?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal works with BNB Chain testnet (chain ID 97) with the same features as mainnet." } },
                    { "@type": "Question", "name": "Does Ethernal support BEP-20 tokens?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. BEP-20 uses the same Transfer event and interface as ERC-20, so Ethernal tracks all BEP-20 token transfers and balance changes automatically." } },
                    { "@type": "Question", "name": "Can Ethernal handle BNB Chain's 3-second block time?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal syncs BNB Chain's fast blocks in real time with no lag, indexing all transactions and token transfers as they happen." } }
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
.chain-stat-logo { width: 16px; height: 16px; border-radius: 50%; object-fit: contain; margin-right: 6px; vertical-align: -4px; }
.chain-stat-label { color: var(--text-muted); margin-right: 4px; }
.chain-stat-value { color: var(--text-primary); font-weight: 600; }

/* Breadcrumb */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.breadcrumb a { color: #5DAAE0; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { color: var(--text-muted); }
.breadcrumb .current { color: var(--text-secondary); }

/* Browser preview frame */
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Decoded transaction mockup */
.mock-decoded-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 14px; }
.mock-decoded-fn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
.fn-name { color: #A5D6FF; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 13px; }
.fn-badge { padding: 2px 8px; border-radius: 4px; background: rgba(61, 149, 206, 0.12); color: #5DAAE0; font-size: 10px; font-weight: 600; }
.mock-params { display: flex; flex-direction: column; gap: 6px; }
.param-row { display: flex; gap: 10px; align-items: center; font-size: 11px; padding: 4px 0; }
.param-name { color: var(--text-primary); font-weight: 600; min-width: 90px; }
.param-type { color: var(--text-muted); font-size: 10px; min-width: 60px; }
.param-val { color: #A5D6FF; font-family: 'JetBrains Mono', monospace; font-size: 10px; }

/* Call trace mockup */
.mock-trace-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 14px; }
.mock-trace-row { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); align-items: center; font-size: 11px; }
.mock-trace-row:last-child { border-bottom: none; }
.depth-0 { padding-left: 0; }
.depth-1 { padding-left: 20px; }
.depth-2 { padding-left: 40px; }
.trace-op { background: rgba(61, 149, 206, 0.12); color: #5DAAE0; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; flex-shrink: 0; }
.trace-addr { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 10px; }
.trace-fn { color: #A5D6FF; font-family: 'JetBrains Mono', monospace; }

/* Setup steps */
.setup-steps { display: flex; flex-direction: column; gap: 20px; }
.setup-step { display: flex; gap: 16px; align-items: flex-start; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }

/* Comparison table */
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
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .mock-trace-row { font-size: 9px; gap: 6px; }
    .depth-1 { padding-left: 12px; }
    .depth-2 { padding-left: 24px; }
    .param-row { font-size: 9px; gap: 6px; }
}
</style>
