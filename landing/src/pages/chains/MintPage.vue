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
                    <span class="current">Mint</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Mint</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Mint, the NFT-focused OP Stack L2 designed for low-cost minting and green NFT infrastructure. Mint provides a dedicated chain optimized for NFT creators, collectors, and marketplaces. Connect your RPC, configure OP Stack bridge monitoring, and deploy a branded explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 48, 209, 88;">
                    <div class="chain-stat"><img src="/images/chains/mint.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">185</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- OP Stack config -->
            <div class="my-12">
    <FeatureSection inline-icon compact icon="mdi-shield-link-variant-outline" title="OP Stack Bridge Monitoring"
                    description="Mint runs on the OP Stack, providing low-cost NFT operations with Ethereum security. Ethernal monitors the OptimismPortal contract, tracks deposits from Ethereum L1, and follows withdrawals through the challenge period. Configure it with your OptimismPortal and Batch Inbox addresses.">
                    <template #visual>
                        <div class="browser-preview">
                            <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.mint.example/settings</div><div style="width: 42px;"></div></div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">OP Stack Configuration</div>
                                    <div class="mock-field"><div class="mock-field-label">L1 Parent Chain</div><div class="mock-field-select"><span>Ethereum Mainnet</span><v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon></div></div>
                                    <div class="mock-field"><div class="mock-field-label">OptimismPortal Address</div><div class="mock-field-input">0x59625d1FE0Eeb8114a4d13c863978F39b3Cb2B57</div></div>
                                    <div class="mock-field"><div class="mock-field-label">Batch Inbox Address</div><div class="mock-field-input">0xFF00000000000000000000000000000000000185</div></div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- NFT minting and tracking -->
            <div class="my-12">
    <FeatureSection inline-icon compact icon="mdi-image-multiple-outline" title="NFT Minting and Collection Tracking" :reverse="true"
                    description="Mint is purpose-built for NFT operations. Ethernal indexes every ERC-721 and ERC-1155 mint, transfer, and burn on the chain. Track collection launches, monitor minting activity, see holder distributions, and verify that collection contracts behave as expected. For NFT marketplaces on Mint, this means complete visibility into listing, buying, and auction activity.">
                    <template #visual>
                        <div class="browser-preview">
                            <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.mint.example/token-transfers</div><div style="width: 42px;"></div></div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header five-col"><span>Collection</span><span>Type</span><span>From</span><span>To</span><span>Token ID</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge nft">ArtDrop</span></span><span class="tbl-type">ERC-721</span><span class="tbl-addr">0x0000...0000</span><span class="tbl-addr">0x4e99...9f33</span><span class="tbl-num">#1,247</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge edition">Edition</span></span><span class="tbl-type">ERC-1155</span><span class="tbl-addr">0x0000...0000</span><span class="tbl-addr">0x7d2b...e891</span><span class="tbl-num">x100</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge nft">GreenNFT</span></span><span class="tbl-type">ERC-721</span><span class="tbl-addr">0xf1d8...7a92</span><span class="tbl-addr">0x2b87...e451</span><span class="tbl-num">#892</span></div>
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
                { icon: 'mdi-arrow-up-bold-circle-outline', title: 'Withdrawal Tracking', description: 'Full L2-to-L1 withdrawal lifecycle with challenge period monitoring' },
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />


            <!-- Setup -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">How to Set Up a Mint Block Explorer</h2>
                <div class="setup-steps">
                    <div class="setup-step"><div class="step-number">1</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Create a workspace</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Sign up at <strong style="color: var(--text-primary);">app.tryethernal.com</strong> and create a new workspace. Select "Public Explorer" as the type.</p></div></div>
                    <div class="setup-step"><div class="step-number">2</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect the Mint RPC</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the Mint RPC endpoint: <code class="code-inline">https://rpc.mintchain.io</code>.</p></div></div>
                    <div class="setup-step"><div class="step-number">3</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter the OptimismPortal and Batch Inbox addresses. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p></div></div>
                    <div class="setup-step"><div class="step-number">4</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.mint.example</code>) to your Ethernal workspace.</p></div></div>
                </div>
            </section>

            <!-- Comparison -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Mint Explorer Options Compared</h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">NFT creators and marketplaces on Mint can choose between the default explorer, Blockscout (self-hosted), or Ethernal.</p>
                <div class="comparison-table">
                    <div class="comp-row comp-header"><span>Feature</span><span>Ethernal</span><span>Mint Explorer</span><span>Blockscout</span></div>
                    <div class="comp-row"><span>Custom domain</span><span class="comp-yes">Yes</span><span class="comp-no">No</span><span class="comp-yes">Yes (self-host)</span></div>
                    <div class="comp-row"><span>Full whitelabel</span><span class="comp-yes">Yes</span><span class="comp-no">No</span><span class="comp-yes">Yes (self-host)</span></div>
                    <div class="comp-row"><span>Withdrawal tracking</span><span class="comp-yes">Built-in</span><span class="comp-partial">Limited</span><span class="comp-no">Plugin</span></div>
                    <div class="comp-row"><span>Hosted (no infra)</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span><span class="comp-no">Self-host</span></div>
                    <div class="comp-row"><span>Setup time</span><span class="comp-yes">&lt; 5 min</span><span class="comp-partial">N/A (public)</span><span class="comp-no">Hours/days</span></div>
                    <div class="comp-row"><span>ERC-721/1155 support</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span></div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Pricing for Mint Explorers</h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">Start free with the Starter plan (ad-supported, includes contract verification, token tracking, and unlimited transactions). For custom domains and L1 explorer integration, the Team plan starts at $150/month. Full whitelabel with custom branding, status page, and 5M transactions included is available on the App Chain plan at $500/month.</p>
                <v-btn class="btn-outline mt-6" href="/pricing" rounded="lg" size="large">View Full Pricing<v-icon end size="16">mdi-arrow-right</v-icon></v-btn>
            </section>

            <!-- FAQ -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Frequently Asked Questions</h2>
                <div class="faq-list">
                    <div class="faq-item"><h3 class="faq-q">What is Mint?</h3><p class="faq-a">Mint is an NFT-focused Layer 2 blockchain built on the OP Stack. It is designed for low-cost NFT minting, green NFT infrastructure, and a thriving creator economy. Mint settles on Ethereum, providing full Ethereum security for NFT operations at a fraction of the cost.</p></div>
                    <div class="faq-item"><h3 class="faq-q">How do I set up a block explorer for Mint?</h3><p class="faq-a">Create a workspace on Ethernal, paste the Mint RPC endpoint (<code class="code-inline">https://rpc.mintchain.io</code>), configure the OP Stack bridge with OptimismPortal and Batch Inbox addresses, and point your custom domain. Takes under 5 minutes.</p></div>
                    <div class="faq-item"><h3 class="faq-q">What makes Mint different from other NFT chains?</h3><p class="faq-a">Mint focuses on green NFT infrastructure with low-cost minting. By running on the OP Stack, it inherits Ethereum's security while keeping minting costs low through optimistic rollup data compression and EIP-4844 blob batching.</p></div>
                    <div class="faq-item"><h3 class="faq-q">Does Ethernal support ERC-721A collections on Mint?</h3><p class="faq-a">Yes. Ethernal indexes all ERC-721, ERC-721A, and ERC-1155 token events on Mint. Batch mints (common with ERC-721A gas optimization) are fully tracked with individual token ID visibility.</p></div>
                    <div class="faq-item"><h3 class="faq-q">Can I track NFT marketplace activity on Mint?</h3><p class="faq-a">Yes. Ethernal indexes all transactions on Mint including marketplace interactions: listings, purchases, auctions, and royalty payments. Once marketplace contracts are verified, these actions are decoded with full parameter visibility.</p></div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">Related</h2>
                <div class="related-links">
                    <router-link to="/op-stack" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon><div><span class="related-title">OP Stack Explorer</span><span class="related-desc">Bridge monitoring, withdrawals, and fault proofs for all OP Stack chains</span></div></router-link>
                    <router-link to="/features" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-view-grid-outline</v-icon><div><span class="related-title">All Features</span><span class="related-desc">Transaction decoding, contract verification, token tracking, and more</span></div></router-link>
                    <router-link to="/pricing" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-tag-outline</v-icon><div><span class="related-title">Pricing</span><span class="related-desc">Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise</span></div></router-link>
                </div>
            </section>
        </v-container>
        <LandingCTA chain="mint" />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import ChainFeatureGrid from '@/components/ChainFeatureGrid.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Block Explorer for Mint — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Mint (OP Stack). NFT minting tracking, ERC-721/ERC-1155 indexing, L2-to-L1 withdrawal monitoring, and contract verification for the NFT-focused L2.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Mint — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Mint (OP Stack). NFT minting tracking, ERC-721/ERC-1155 indexing, and contract verification.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/mint' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-mint.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/chains/mint' }],
    script: [
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", "name": "Ethernal Block Explorer for Mint", "description": "Hosted block explorer for Mint with NFT tracking, collection indexing, and OP Stack bridge monitoring.", "brand": { "@type": "Organization", "name": "Ethernal" }, "url": "https://tryethernal.com/chains/mint", "offers": [
            { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Ad-supported, contract verification, token tracking, unlimited transactions" },
            { "@type": "Offer", "name": "Team", "price": "150", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Custom domain, native token, L1 explorer, 100k tx included" },
            { "@type": "Offer", "name": "App Chain", "price": "500", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Full whitelabel, custom branding, status page, 5M tx included" }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", "name": "How to set up a block explorer for Mint", "description": "Deploy a hosted block explorer for Mint in under 5 minutes.", "step": [
            { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a Public Explorer workspace." },
            { "@type": "HowToStep", "name": "Connect Mint RPC", "text": "Paste the Mint RPC endpoint (https://rpc.mintchain.io)." },
            { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter OptimismPortal and Batch Inbox addresses." },
            { "@type": "HowToStep", "name": "Go live", "text": "Point your custom domain to your Ethernal workspace." }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Mint", "item": "https://tryethernal.com/chains/mint" }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            { "@type": "Question", "name": "What is Mint?", "acceptedAnswer": { "@type": "Answer", "text": "An NFT-focused OP Stack L2 for low-cost minting and green NFT infrastructure." } },
            { "@type": "Question", "name": "How do I set up a Mint explorer?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace, paste the RPC, configure OP Stack bridge, and point your domain. Under 5 minutes." } },
            { "@type": "Question", "name": "What makes Mint different?", "acceptedAnswer": { "@type": "Answer", "text": "Green NFT infrastructure with low-cost minting on OP Stack, inheriting Ethereum security." } },
            { "@type": "Question", "name": "Does Ethernal support ERC-721A?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal indexes ERC-721, ERC-721A, and ERC-1155 events with batch mint tracking." } },
            { "@type": "Question", "name": "Can I track NFT marketplace activity?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. All marketplace transactions are indexed and decoded when contracts are verified." } }
        ] }) }
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
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.breadcrumb a { color: #5DAAE0; text-decoration: none; } .breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { color: var(--text-muted); } .breadcrumb .current { color: var(--text-secondary); }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; } .dot.red { background: #ff5f56; } .dot.yellow { background: #febc2e; } .dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }
.mock-settings-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.mock-field { margin-bottom: 14px; } .mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input, .mock-field-select { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-field-select { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-family: 'Roboto', sans-serif; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; overflow: hidden; }
.trace-node.indent { padding-left: 20px; } .trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.event { background: rgba(34, 197, 94, 0.12); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; white-space: nowrap; }
.trace-method { color: #CBD5E1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; gap: 8px; align-items: center; font-size: 11px; }
.mock-tbl-header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--drawer-divider); margin-bottom: 4px; }
.mock-tbl-row { padding: 10px 0; border-bottom: 1px solid var(--drawer-divider); }
.mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 0.8fr 0.7fr 0.9fr 0.9fr 0.8fr; }
.tbl-num { color: var(--text-primary); } .tbl-hash { color: #5DAAE0; } .tbl-addr { color: var(--text-secondary); }
.tbl-type { color: var(--text-muted); font-size: 10px; }
.token-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.token-badge.nft { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }
.token-badge.edition { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }
.mock-withdrawal { text-align: center; }
.mock-stepper { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 24px; flex-wrap: wrap; }
.step { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 70px; }
.step-dot { width: 28px; height: 28px; border-radius: 50%; background: rgba(61, 149, 206, 0.1); border: 2px solid rgba(61, 149, 206, 0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text-muted); }
.step-dot.done { background: rgba(34, 197, 94, 0.15); border-color: #22C55E; color: #22C55E; }
.step-dot.active { background: rgba(61, 149, 206, 0.15); border-color: #3D95CE; box-shadow: 0 0 12px rgba(61, 149, 206, 0.3); }
.step-label { color: var(--text-secondary); font-size: 10px; white-space: nowrap; }
.step-sub { color: #F59E0B; font-size: 9px; margin-top: -4px; }
.step-line { width: 30px; height: 2px; background: rgba(61, 149, 206, 0.15); margin-bottom: 24px; flex-shrink: 0; }
.step-line.done { background: #22C55E; }
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mock-meta-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.mock-meta-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-meta-val { color: #CBD5E1; font-size: 12px; } .mock-meta-val.badge { color: #5DAAE0; }
.setup-steps { display: flex; flex-direction: column; gap: 20px; }
.setup-step { display: flex; gap: 16px; align-items: flex-start; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }
.comparison-table { border: 1px solid var(--drawer-divider); border-radius: 12px; overflow: hidden; }
.comp-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--drawer-divider); }
.comp-row:last-child { border-bottom: none; }
.comp-header { background: var(--bg-surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
.comp-row:not(.comp-header) span:first-child { color: var(--text-secondary); }
.comp-yes { color: #22C55E; } .comp-no { color: var(--text-muted); } .comp-partial { color: #F59E0B; }
.faq-list { display: flex; flex-direction: column; gap: 16px; }
.faq-item { padding: 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 12px; }
.faq-q { color: var(--text-primary); font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; }
.faq-a { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.7; margin: 0; }
.related-links { display: flex; flex-direction: column; gap: 8px; }
.related-link { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; text-decoration: none; transition: border-color 0.2s; }
.related-link:hover { border-color: var(--border-glow); }
.related-link div { display: flex; flex-direction: column; gap: 2px; }
.related-title { color: var(--text-primary); font-weight: 600; font-size: 0.9rem; }
.related-desc { color: var(--text-muted); font-size: 0.8rem; }
.pricing-context .btn-outline { border: 1px solid var(--btn-outline-border); color: var(--text-secondary); text-transform: none; letter-spacing: 0; font-weight: 500; }
@media (max-width: 600px) {
    .mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 1fr 1fr 1fr; font-size: 10px; }
    .mock-tbl-header.five-col span:nth-child(n+4), .mock-tbl-row.five-col span:nth-child(n+4) { display: none; }
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .step { min-width: 55px; } .step-label { font-size: 8px; } .step-line { width: 16px; }
}
</style>
