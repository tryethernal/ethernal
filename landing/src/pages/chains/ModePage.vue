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
                    <span class="current">Mode</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Mode Network</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Mode Network (chain ID 34443) that connects to your RPC endpoint and provides real-time transaction decoding, contract verification, and DeFi protocol debugging. Mode is a DeFi-focused OP Stack chain with Sequencer Fee Sharing (SFS), rewarding developers with a share of the sequencer revenue their contracts generate. Deploy a full-featured explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 223, 255, 0;">
                    <div class="chain-stat"><img src="/images/chains/mode.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">34443</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- SFS revenue concept -->
            <div class="my-12">
    <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cash-multiple"
                    title="Sequencer Fee Sharing Visibility"
                    description="Mode's signature feature is Sequencer Fee Sharing (SFS): developers register their contracts with the SFS contract (0x8680CEaBcb9b56913c519c069Add6Bc3494B7020) and earn a portion of the sequencer fees their contracts generate. Ethernal decodes SFS registration and claim transactions, so you can track exactly how much revenue each contract earns."
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
                                    explorer.mode.example/address/0x8680…7020
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-sfs">
                                    <div class="mock-verified-banner sfs-banner">
                                        <span class="mock-check">&#9733;</span>
                                        Sequencer Fee Sharing Contract
                                    </div>
                                    <div class="sfs-stats">
                                        <div class="sfs-stat">
                                            <span class="sfs-label">Registered Contracts</span>
                                            <span class="sfs-value">4,218</span>
                                        </div>
                                        <div class="sfs-stat">
                                            <span class="sfs-label">Total Fees Distributed</span>
                                            <span class="sfs-value">892.4 ETH</span>
                                        </div>
                                    </div>
                                    <div class="sfs-recent">
                                        <div class="sfs-recent-title">Recent Claims</div>
                                        <div class="sfs-row">
                                            <span class="sfs-addr">0x7d2e…b891</span>
                                            <span class="sfs-amount">+0.284 ETH</span>
                                        </div>
                                        <div class="sfs-row">
                                            <span class="sfs-addr">0x4fc8…1293</span>
                                            <span class="sfs-amount">+0.147 ETH</span>
                                        </div>
                                        <div class="sfs-row">
                                            <span class="sfs-addr">0x91a3…e7f2</span>
                                            <span class="sfs-amount">+0.063 ETH</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- L2-to-L1 withdrawal -->
            <div class="my-12">
    <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-arrow-up-bold-circle-outline"
                    title="L2-to-L1 Withdrawal Tracking"
                    description="Mode follows the standard OP Stack withdrawal lifecycle: initiation on L2, state proposal, 7-day challenge window, proving, and finalization on Ethereum. Ethernal tracks each step in real time so your users always know exactly where their withdrawal stands, whether they are bridging ETH, USDC, or any ERC-20 token back to L1."
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
                                    explorer.mode.example/withdrawal/2104
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-withdrawal">
                                    <div class="mock-stepper">
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">Initiated</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">State Proposed</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">Challenge Period</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step active">
                                            <div class="step-dot active"></div>
                                            <div class="step-label">Proven</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step">
                                            <div class="step-dot"></div>
                                            <div class="step-label">Finalized</div>
                                        </div>
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
                { icon: 'mdi-database-outline', title: 'Blob Batches', description: 'EIP-4844 blob and calldata batch monitoring with L1 links' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />


            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up a Mode Network Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Mode RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your Mode RPC endpoint. For Mode mainnet, use <code class="code-inline">https://mainnet.mode.network</code> or any supported provider.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your OptimismPortal and Batch Inbox addresses for Mode. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.mode.example</code>) to your Ethernal workspace. Your explorer is live with transaction decoding, contract verification, and bridge tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison section -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Mode Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Mode typically choose between the Mode Explorer (Blockscout-based), a self-hosted Blockscout instance, or Ethernal (hosted with OP Stack-native features and SFS visibility).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Mode Explorer</span>
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
                        <span>Withdrawal tracking</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Limited</span>
                        <span class="comp-no">Requires plugin</span>
                    </div>
                    <div class="comp-row">
                        <span>Deposit monitoring</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Partial</span>
                        <span class="comp-partial">Limited</span>
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
                </div>
            </section>

            <!-- Pricing context -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Mode Explorers
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

            <!-- FAQ Section -->
            <section class="faq-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Frequently Asked Questions
                </h2>
                <div class="faq-list">
                    <div class="faq-item">
                        <h3 class="faq-q">How do I set up a block explorer for Mode Network?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your Mode RPC endpoint (e.g. <code class="code-inline">https://mainnet.mode.network</code>), configure the OP Stack bridge addresses, and point your custom domain. The whole process takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is Mode's Sequencer Fee Sharing (SFS)?</h3>
                        <p class="faq-a">SFS is Mode's developer incentive mechanism. When you register your smart contract with the SFS contract (0x8680CEaBcb9b56913c519c069Add6Bc3494B7020), you earn a share of the sequencer fees that your contract generates. Ethernal decodes SFS registration, claim, and transfer transactions.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal to debug DeFi protocols on Mode?</h3>
                        <p class="faq-a">Yes. Ethernal decodes all function calls, internal calls, and events from DeFi protocols on Mode. For multi-hop swaps on Kim Exchange or lending operations on Ionic, you see the full call trace with decoded parameters, making it easy to identify exactly where a transaction fails or how liquidity flows.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Is Mode an OP Stack chain?</h3>
                        <p class="faq-a">Yes. Mode is built on the OP Stack and is part of the Optimism Superchain. It settles on Ethereum L1 and uses the standard OP Stack withdrawal lifecycle with a 7-day challenge period. Ethernal has native support for all OP Stack features including deposit monitoring, withdrawal tracking, and batch/blob monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Mode use EIP-4844 blobs?</h3>
                        <p class="faq-a">Yes. Mode adopted EIP-4844 blobs after the Ethereum Dencun upgrade (March 2024), posting transaction data as blobs instead of calldata to reduce L1 costs. Ethernal tracks both blob and calldata batches in the batch explorer view.</p>
                    </div>
                </div>
            </section>

            <!-- Internal links -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/op-stack" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon>
                        <div>
                            <span class="related-title">OP Stack Explorer</span>
                            <span class="related-desc">Bridge monitoring, withdrawals, and fault proofs for all OP Stack chains</span>
                        </div>
                    </router-link>
                    <router-link to="/chains/optimism" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-alpha-o-circle</v-icon>
                        <div>
                            <span class="related-title">Optimism Explorer</span>
                            <span class="related-desc">Block explorer for the original OP Stack chain by OP Labs</span>
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
    title: 'Block Explorer for Mode Network — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Mode Network (OP Stack). Transaction decoding, DeFi debugging, Sequencer Fee Sharing visibility, contract verification, and EIP-4844 blob monitoring.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Mode Network — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Mode Network (OP Stack). Transaction decoding, DeFi debugging, Sequencer Fee Sharing visibility, contract verification, and EIP-4844 blob monitoring.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/mode' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-mode.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/mode' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Mode Network",
                "description": "Hosted block explorer for Mode Network with transaction decoding, DeFi debugging, Sequencer Fee Sharing visibility, contract verification, and EIP-4844 blob monitoring.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/mode",
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
                "name": "How to set up a block explorer for Mode Network",
                "description": "Deploy a hosted block explorer for Mode Network in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect your Mode RPC", "text": "Paste your Mode RPC endpoint (e.g. https://mainnet.mode.network) into the workspace settings." },
                    { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter the OptimismPortal and Batch Inbox addresses for Mode." },
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
                    { "@type": "ListItem", "position": 2, "name": "Chains", "item": "https://tryethernal.com/chains" },
                    { "@type": "ListItem", "position": 3, "name": "Mode", "item": "https://tryethernal.com/chains/mode" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Mode Network?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your Mode RPC endpoint, configure the OP Stack bridge addresses, and point your custom domain. The process takes under 5 minutes." } },
                    { "@type": "Question", "name": "What is Mode's Sequencer Fee Sharing (SFS)?", "acceptedAnswer": { "@type": "Answer", "text": "SFS is Mode's developer incentive mechanism. Register your contract with the SFS contract and earn a share of sequencer fees your contract generates." } },
                    { "@type": "Question", "name": "Can I use Ethernal to debug DeFi protocols on Mode?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal decodes all function calls, internal calls, and events from DeFi protocols, showing the full call trace with decoded parameters." } },
                    { "@type": "Question", "name": "Is Mode an OP Stack chain?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Mode is built on the OP Stack, part of the Optimism Superchain, and settles on Ethereum L1 with a standard 7-day challenge period." } },
                    { "@type": "Question", "name": "Does Mode use EIP-4844 blobs?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Mode adopted EIP-4844 blobs after the Dencun upgrade, reducing L1 data costs. Ethernal tracks both blob and calldata batches." } }
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

/* Browser preview frame */
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* SFS mockup */
.sfs-banner { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); color: #F59E0B; }
.sfs-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.sfs-stat { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.sfs-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.sfs-value { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.sfs-recent { margin-top: 4px; }
.sfs-recent-title { color: var(--text-secondary); font-size: 11px; font-weight: 600; margin-bottom: 8px; }
.sfs-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--drawer-divider); font-size: 11px; }
.sfs-addr { color: #5DAAE0; }
.sfs-amount { color: #22C55E; font-weight: 600; }

/* Settings mockup */
.mock-settings-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.mock-field { margin-bottom: 14px; }
.mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input, .mock-field-select { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-field-select { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-family: 'Roboto', sans-serif; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }

/* Trace mockup */
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; overflow: hidden; }
.trace-node.indent { padding-left: 20px; }
.trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.event { background: rgba(34, 197, 94, 0.12); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; white-space: nowrap; }
.trace-method { color: #CBD5E1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-chip.relayed { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-chip.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }

/* Table mockup */
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; gap: 8px; align-items: center; font-size: 11px; }
.mock-tbl-header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--drawer-divider); margin-bottom: 4px; }
.mock-tbl-row { padding: 10px 0; border-bottom: 1px solid var(--drawer-divider); }
.mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 0.8fr 1fr 0.8fr 0.8fr 1.2fr; }
.tbl-num { color: var(--text-primary); }
.tbl-hash { color: #5DAAE0; }
.data-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.data-chip.blob { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }

/* Contract sync */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mock-meta-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.mock-meta-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-meta-val { color: #CBD5E1; font-size: 12px; }
.mock-meta-val.badge { color: #5DAAE0; }

/* Withdrawal stepper */
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
    .mock-tbl-header.five-col, .mock-tbl-row.five-col { grid-template-columns: 1fr 1fr 1fr; font-size: 10px; }
    .mock-tbl-header.five-col span:nth-child(n+4), .mock-tbl-row.five-col span:nth-child(n+4) { display: none; }
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .step { min-width: 55px; }
    .step-label { font-size: 8px; }
    .step-line { width: 16px; }
    .sfs-stats { grid-template-columns: 1fr; }
}
</style>
