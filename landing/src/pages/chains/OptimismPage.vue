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
                    <span class="current">Optimism</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Optimism</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Optimism (chain ID 10) that connects to your RPC endpoint and provides real-time transaction decoding, contract verification, and L2-to-L1 withdrawal tracking. Optimism is the original OP Stack chain built by OP Labs, powering the Superchain vision. Deploy a full-featured explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 255, 4, 32;">
                    <div class="chain-stat"><img src="/images/chains/optimism.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">10</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: OP Stack Configuration -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-shield-link-variant-outline"
                    title="Built for the Original OP Stack Chain"
                    description="Optimism is where the OP Stack began. OP Labs built the rollup framework that now powers Base, Zora, Mode, and dozens of other chains. Ethernal monitors your OptimismPortal contract (0xbEb5Fc579115071764c7423A4f12eDde41f106Ed), tracks deposits from Ethereum L1, and follows withdrawals through the full 7-day challenge period with fault proof verification."
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
                                    explorer.optimism.example/settings
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">OP Stack Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L1 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Ethereum Mainnet</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">OptimismPortal Address</div>
                                        <div class="mock-field-input">0xbEb5Fc579115071764c7423A4f12eDde41f106Ed</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Batch Inbox Address</div>
                                        <div class="mock-field-input">0xFF00000000000000000000000000000000000010</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: Withdrawal Tracking -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-arrow-up-bold-circle-outline"
                    title="L2-to-L1 Withdrawal Lifecycle"
                    description="Optimism pioneered the 7-day withdrawal challenge period that all OP Stack chains now use. With the Fault Proof upgrade (June 2024), withdrawals go through a new proving step before finalization. Ethernal tracks every phase: initiation on L2, state root proposal, challenge window, fault proof verification, and finalization on Ethereum L1."
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
                                    explorer.optimism.example/withdrawal/7821
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
                                        <div class="step active">
                                            <div class="step-dot active"></div>
                                            <div class="step-label">Challenge Period</div>
                                            <div class="step-sub">5d 12h remaining</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step">
                                            <div class="step-dot"></div>
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
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-database-outline', title: 'Blob Batches', description: 'EIP-4844 blob and calldata batch monitoring with L1 links' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up an Optimism Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Optimism RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your Optimism RPC endpoint. For Optimism mainnet, use <code class="code-inline">https://mainnet.optimism.io</code> or any provider like Alchemy, Infura, or QuickNode.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your OptimismPortal (<code class="code-inline">0xbEb5Fc579115071764c7423A4f12eDde41f106Ed</code>) and Batch Inbox (<code class="code-inline">0xFF00000000000000000000000000000000000010</code>) addresses. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.optimism.example</code>) to your Ethernal workspace. Your explorer is live with transaction decoding, contract verification, and bridge tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison section -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Optimism Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Optimism typically choose between Optimistic Etherscan (the official explorer), Blockscout (open-source self-hosted), or Ethernal (hosted with OP Stack-native features).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Etherscan (OP)</span>
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
                        <span>Fault proof monitoring</span>
                        <span class="comp-yes">Built-in</span>
                        <span class="comp-partial">Partial</span>
                        <span class="comp-no">No</span>
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
                    Pricing for Optimism Explorers
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
                        <h3 class="faq-q">How do I set up a block explorer for Optimism?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your Optimism RPC endpoint (e.g. <code class="code-inline">https://mainnet.optimism.io</code>), configure the OP Stack bridge addresses (OptimismPortal and Batch Inbox), and point your custom domain. The whole process takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What are Optimism fault proofs?</h3>
                        <p class="faq-a">Fault proofs (shipped June 2024) replaced the previous centralized proposal mechanism. They allow anyone to challenge an incorrect state root posted to L1. Ethernal monitors the DisputeGameFactory and tracks each game through its lifecycle, giving you visibility into the security of your withdrawals.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal as an Optimistic Etherscan alternative?</h3>
                        <p class="faq-a">Yes. If you are running a fork of Optimism or a custom OP Stack chain, Ethernal gives you a private, whitelabel explorer that you control. Unlike Optimistic Etherscan, you get your own domain, your own branding, and built-in OP Stack bridge monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the Superchain and how does Optimism relate to it?</h3>
                        <p class="faq-a">The Superchain is OP Labs' vision for a network of interoperable OP Stack chains that share bridging, security, and a common communication layer. Optimism (chain ID 10) is the flagship chain. Ethernal supports all Superchain networks, including Base, Zora, and Mode.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Optimism use EIP-4844 blobs?</h3>
                        <p class="faq-a">Yes. Since the Ethereum Dencun upgrade (March 2024), Optimism posts transaction data as EIP-4844 blobs instead of calldata, reducing L1 data costs by over 90%. Ethernal distinguishes between blob and calldata batches in the batch explorer view.</p>
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
                    <router-link to="/chains/base" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-alpha-b-circle</v-icon>
                        <div>
                            <span class="related-title">Base Explorer</span>
                            <span class="related-desc">Block explorer for Coinbase's L2, built on the OP Stack</span>
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
    title: 'Block Explorer for Optimism — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Optimism (OP Stack). Transaction decoding, contract verification, L2-to-L1 withdrawal tracking, fault proof monitoring, and EIP-4844 blob batches.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Optimism — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Optimism (OP Stack). Transaction decoding, contract verification, L2-to-L1 withdrawal tracking, fault proof monitoring, and EIP-4844 blob batches.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/optimism' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-optimism.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/optimism' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Optimism",
                "description": "Hosted block explorer for Optimism with transaction decoding, contract verification, L2-to-L1 withdrawal tracking, fault proof monitoring, and EIP-4844 blob batches.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/optimism",
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
                "name": "How to set up a block explorer for Optimism",
                "description": "Deploy a hosted block explorer for Optimism in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect your Optimism RPC", "text": "Paste your Optimism RPC endpoint (e.g. https://mainnet.optimism.io) into the workspace settings." },
                    { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter the OptimismPortal (0xbEb5Fc579115071764c7423A4f12eDde41f106Ed) and Batch Inbox (0xFF00000000000000000000000000000000000010) addresses." },
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
                    { "@type": "ListItem", "position": 2, "name": "Optimism", "item": "https://tryethernal.com/chains/optimism" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Optimism?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your Optimism RPC endpoint, configure the OP Stack bridge addresses, and point your custom domain. The process takes under 5 minutes." } },
                    { "@type": "Question", "name": "What are Optimism fault proofs?", "acceptedAnswer": { "@type": "Answer", "text": "Fault proofs (shipped June 2024) allow anyone to challenge incorrect state roots posted to L1, replacing the previous centralized proposal mechanism. Ethernal monitors the DisputeGameFactory and tracks each game." } },
                    { "@type": "Question", "name": "Can I use Ethernal as an Optimistic Etherscan alternative?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal gives you a private, whitelabel explorer with your own domain, branding, and built-in OP Stack bridge monitoring." } },
                    { "@type": "Question", "name": "What is the Superchain?", "acceptedAnswer": { "@type": "Answer", "text": "The Superchain is OP Labs' vision for a network of interoperable OP Stack chains. Optimism (chain ID 10) is the flagship chain. Ethernal supports all Superchain networks." } },
                    { "@type": "Question", "name": "Does Optimism use EIP-4844 blobs?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Since the Dencun upgrade (March 2024), Optimism posts transaction data as EIP-4844 blobs, reducing L1 costs by over 90%. Ethernal tracks both blob and calldata batches." } }
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

/* Settings mockup */
.mock-settings-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.mock-field { margin-bottom: 14px; }
.mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input, .mock-field-select { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-field-select { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-family: 'Roboto', sans-serif; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }

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
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .step { min-width: 55px; }
    .step-label { font-size: 8px; }
    .step-line { width: 16px; }
}
</style>
