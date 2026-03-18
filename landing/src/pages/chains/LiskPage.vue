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
                    <span class="current">Lisk</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Lisk</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Lisk, the established blockchain project that migrated to the OP Stack as an Ethereum L2. Lisk brings its JavaScript/TypeScript developer heritage and LSK token to the Superchain ecosystem, with a focus on real-world asset (RWA) tokenization. Deploy a Lisk explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 14, 187, 207;">
                    <div class="chain-stat"><img src="/images/chains/lisk.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">1135</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- OP Stack config -->
            <div class="my-12">
    <FeatureSection inline-icon compact icon="mdi-shield-link-variant-outline" title="OP Stack Bridge Monitoring"
                    description="Lisk runs on the OP Stack as part of the Optimism Superchain. Ethernal monitors the OptimismPortal contract, tracks deposits from Ethereum L1, and follows withdrawals through the 7-day challenge period. Configure it by entering your OptimismPortal and Batch Inbox addresses.">
                    <template #visual>
                        <div class="browser-preview">
                            <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.lisk.example/settings</div><div style="width: 42px;"></div></div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">OP Stack Configuration</div>
                                    <div class="mock-field"><div class="mock-field-label">L1 Parent Chain</div><div class="mock-field-select"><span>Ethereum Mainnet</span><v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon></div></div>
                                    <div class="mock-field"><div class="mock-field-label">OptimismPortal Address</div><div class="mock-field-input">0x26dB93F8b8b4f7016240af62F7730979d353f9A7</div></div>
                                    <div class="mock-field"><div class="mock-field-label">Batch Inbox Address</div><div class="mock-field-input">0xFF00000000000000000000000000000000001135</div></div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- LSK token tracking -->
            <div class="my-12">
    <FeatureSection inline-icon compact icon="mdi-swap-horizontal" title="LSK Token and RWA Tracking" :reverse="true"
                    description="Lisk focuses on real-world asset tokenization, bringing traditional assets on-chain. Ethernal indexes LSK token transfers, RWA token movements, and DeFi interactions. Track token holder distributions, monitor staking activity, and see balance changes for any address in real time.">
                    <template #visual>
                        <div class="browser-preview">
                            <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.lisk.example/token-transfers</div><div style="width: 42px;"></div></div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header five-col"><span>Token</span><span>From</span><span>To</span><span>Amount</span><span>Tx Hash</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge lsk">LSK</span></span><span class="tbl-addr">0x912C...59b2</span><span class="tbl-addr">0x6C2C...3f21</span><span class="tbl-num">50,000</span><span class="tbl-hash">0x4a1b...7c8e</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge usdc">USDC</span></span><span class="tbl-addr">0x7d2b...e891</span><span class="tbl-addr">0x4e99...9f33</span><span class="tbl-num">10,000</span><span class="tbl-hash">0x8f22...1a22</span></div>
                                    <div class="mock-tbl-row five-col"><span class="tbl-token"><span class="token-badge rwa">RWA-T</span></span><span class="tbl-addr">0xf1d8...7a92</span><span class="tbl-addr">0x2b87...e451</span><span class="tbl-num">100</span><span class="tbl-hash">0xc3d4...5e67</span></div>
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
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">How to Set Up a Lisk Block Explorer</h2>
                <div class="setup-steps">
                    <div class="setup-step"><div class="step-number">1</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Create a workspace</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Sign up at <strong style="color: var(--text-primary);">app.tryethernal.com</strong> and create a new workspace. Select "Public Explorer" as the type.</p></div></div>
                    <div class="setup-step"><div class="step-number">2</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect the Lisk RPC</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the Lisk RPC endpoint: <code class="code-inline">https://rpc.api.lisk.com</code>.</p></div></div>
                    <div class="setup-step"><div class="step-number">3</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter the OptimismPortal and Batch Inbox addresses. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p></div></div>
                    <div class="setup-step"><div class="step-number">4</div><div><h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3><p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.lisk.example</code>) to your Ethernal workspace.</p></div></div>
                </div>
            </section>

            <!-- Comparison -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Lisk Explorer Options Compared</h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">Teams building on Lisk can choose between the official Lisk explorer (Blockscout-based), self-hosted Blockscout, or Ethernal.</p>
                <div class="comparison-table">
                    <div class="comp-row comp-header"><span>Feature</span><span>Ethernal</span><span>Lisk Explorer</span><span>Blockscout</span></div>
                    <div class="comp-row"><span>Custom domain</span><span class="comp-yes">Yes</span><span class="comp-no">No</span><span class="comp-yes">Yes (self-host)</span></div>
                    <div class="comp-row"><span>Full whitelabel</span><span class="comp-yes">Yes</span><span class="comp-no">No</span><span class="comp-yes">Yes (self-host)</span></div>
                    <div class="comp-row"><span>Withdrawal tracking</span><span class="comp-yes">Built-in</span><span class="comp-partial">Limited</span><span class="comp-no">Plugin</span></div>
                    <div class="comp-row"><span>Hosted (no infra)</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span><span class="comp-no">Self-host</span></div>
                    <div class="comp-row"><span>Setup time</span><span class="comp-yes">&lt; 5 min</span><span class="comp-partial">N/A (public)</span><span class="comp-no">Hours/days</span></div>
                    <div class="comp-row"><span>Call traces</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span><span class="comp-yes">Yes</span></div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Pricing for Lisk Explorers</h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">Start free with the Starter plan (ad-supported, includes contract verification, token tracking, and unlimited transactions). For custom domains and L1 explorer integration, the Team plan starts at $150/month. Full whitelabel with custom branding, status page, and 5M transactions included is available on the App Chain plan at $500/month.</p>
                <v-btn class="btn-outline mt-6" href="/pricing" rounded="lg" size="large">View Full Pricing<v-icon end size="16">mdi-arrow-right</v-icon></v-btn>
            </section>

            <!-- FAQ -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">Frequently Asked Questions</h2>
                <div class="faq-list">
                    <div class="faq-item"><h3 class="faq-q">What is Lisk?</h3><p class="faq-a">Lisk is a blockchain project founded in 2016 that migrated to the OP Stack as an Ethereum L2 in 2024. It is part of the Optimism Superchain and focuses on making blockchain accessible to JavaScript/TypeScript developers, with a growing emphasis on real-world asset (RWA) tokenization.</p></div>
                    <div class="faq-item"><h3 class="faq-q">How do I set up a block explorer for Lisk?</h3><p class="faq-a">Create a workspace on Ethernal, paste the Lisk RPC endpoint (<code class="code-inline">https://rpc.api.lisk.com</code>), configure the OP Stack bridge with OptimismPortal and Batch Inbox addresses, and point your custom domain. Takes under 5 minutes.</p></div>
                    <div class="faq-item"><h3 class="faq-q">What is the LSK token?</h3><p class="faq-a">LSK is the native token of the Lisk ecosystem, migrated from the original Lisk blockchain to the new OP Stack L2. It is used for gas fees, governance, and staking within the Lisk ecosystem.</p></div>
                    <div class="faq-item"><h3 class="faq-q">Is Lisk part of the Optimism Superchain?</h3><p class="faq-a">Yes. Lisk is built on the OP Stack and is a member of the Optimism Superchain, sharing the same bridge infrastructure, security model, and interoperability standards as other OP Stack chains like Base and Optimism mainnet.</p></div>
                    <div class="faq-item"><h3 class="faq-q">Does Lisk support real-world asset tokenization?</h3><p class="faq-a">Yes. Lisk has positioned itself as an RWA-focused L2, providing infrastructure for tokenizing real-world assets like real estate, securities, and commodities. Ethernal tracks all RWA token transfers and contract interactions on the Lisk chain.</p></div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">Related</h2>
                <div class="related-links">
                    <router-link to="/op-stack" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon><div><span class="related-title">OP Stack Explorer</span><span class="related-desc">Bridge monitoring, withdrawals, and fault proofs for all OP Stack chains</span></div></router-link>
                    <router-link to="/chains/base" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-link-variant</v-icon><div><span class="related-title">Base Explorer</span><span class="related-desc">Another OP Stack L2 in the Superchain, built by Coinbase</span></div></router-link>
                    <router-link to="/pricing" class="related-link"><v-icon size="18" style="color: #5DAAE0;">mdi-tag-outline</v-icon><div><span class="related-title">Pricing</span><span class="related-desc">Starter (free), Team ($150/mo), App Chain ($500/mo), Enterprise</span></div></router-link>
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
    title: 'Block Explorer for Lisk — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Lisk (OP Stack). LSK token tracking, RWA visibility, L2-to-L1 withdrawal tracking, and contract verification for the Lisk Superchain L2.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Lisk — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Lisk (OP Stack). LSK token tracking, RWA visibility, L2-to-L1 withdrawal tracking, and contract verification.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/lisk' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-lisk.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/chains/lisk' }],
    script: [
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", "name": "Ethernal Block Explorer for Lisk", "description": "Hosted block explorer for Lisk with LSK token tracking, RWA visibility, and OP Stack bridge monitoring.", "brand": { "@type": "Organization", "name": "Ethernal" }, "url": "https://tryethernal.com/chains/lisk", "offers": [
            { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Ad-supported, contract verification, token tracking, unlimited transactions" },
            { "@type": "Offer", "name": "Team", "price": "150", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Custom domain, native token, L1 explorer, 100k tx included" },
            { "@type": "Offer", "name": "App Chain", "price": "500", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Full whitelabel, custom branding, status page, 5M tx included" }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", "name": "How to set up a block explorer for Lisk", "description": "Deploy a hosted block explorer for Lisk in under 5 minutes.", "step": [
            { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a Public Explorer workspace." },
            { "@type": "HowToStep", "name": "Connect Lisk RPC", "text": "Paste the Lisk RPC endpoint (https://rpc.api.lisk.com)." },
            { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter OptimismPortal and Batch Inbox addresses." },
            { "@type": "HowToStep", "name": "Go live", "text": "Point your custom domain to your Ethernal workspace." }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Lisk", "item": "https://tryethernal.com/chains/lisk" }
        ] }) },
        { type: 'application/ld+json', children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            { "@type": "Question", "name": "What is Lisk?", "acceptedAnswer": { "@type": "Answer", "text": "An OP Stack L2 founded in 2016, now part of the Optimism Superchain with a focus on RWA tokenization." } },
            { "@type": "Question", "name": "How do I set up a Lisk explorer?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace, paste the RPC, configure OP Stack bridge, and point your domain. Under 5 minutes." } },
            { "@type": "Question", "name": "What is the LSK token?", "acceptedAnswer": { "@type": "Answer", "text": "The native token of Lisk, used for gas, governance, and staking." } },
            { "@type": "Question", "name": "Is Lisk part of the Superchain?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Lisk is an OP Stack chain and member of the Optimism Superchain." } },
            { "@type": "Question", "name": "Does Lisk support RWA tokenization?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Lisk focuses on real-world asset tokenization. Ethernal tracks all RWA token activity." } }
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
.breadcrumb a { color: #5DAAE0; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb .sep { color: var(--text-muted); }
.breadcrumb .current { color: var(--text-secondary); }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; } .dot.yellow { background: #febc2e; } .dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }
.mock-settings-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.mock-field { margin-bottom: 14px; }
.mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input, .mock-field-select { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-field-select { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-family: 'Roboto', sans-serif; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; overflow: hidden; }
.trace-node.indent { padding-left: 20px; } .trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.event { background: rgba(34, 197, 94, 0.12); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; white-space: nowrap; }
.trace-method { color: #CBD5E1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; gap: 8px; align-items: center; font-size: 11px; }
.mock-tbl-header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--drawer-divider); margin-bottom: 4px; }
.mock-tbl-row { padding: 10px 0; border-bottom: 1px solid var(--drawer-divider); }
.mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 0.7fr 0.9fr 0.9fr 0.8fr 1fr; }
.tbl-num { color: var(--text-primary); } .tbl-hash { color: #5DAAE0; } .tbl-addr { color: var(--text-secondary); }
.token-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.token-badge.lsk { background: rgba(61, 149, 206, 0.1); color: #5DAAE0; border: 1px solid rgba(61, 149, 206, 0.2); }
.token-badge.usdc { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.token-badge.rwa { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }
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
