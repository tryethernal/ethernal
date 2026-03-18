<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Chain Hero -->
            <div class="chain-hero">
                <nav class="breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <span class="current">OP Stack Explorer</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FRAMEWORK · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for OP Stack Chains</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer that works with any OP Stack chain. Whether you are running Base, Optimism, Mode, Zora, or your own custom rollup built on the OP Stack, Ethernal provides transaction decoding, contract verification, withdrawal tracking, and EIP-4844 blob monitoring out of the box.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 255, 4, 32;">
                    <div class="chain-stat"><img src="/images/chains/optimism.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Chains</span> <span class="chain-stat-value">9+</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">DA</span> <span class="chain-stat-value">Ethereum L1</span></div>
                </div>
            </div>

            <!-- What is OP Stack -->
            <section class="arch-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    What is the OP Stack?
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 700px; margin-bottom: 16px;">
                    The OP Stack is a modular framework for building optimistic rollups, created by OP Labs and the Optimism Collective. It powers the Superchain: a network of interoperable L2 chains that share security and sequencing infrastructure on Ethereum. The OP Stack defines the execution layer (op-geth), derivation pipeline (op-node), batch submission, and fault proof system that all Superchain members use.
                </p>
                <div class="arch-cards">
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">OptimismPortal</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">The L1 contract that handles deposits and withdrawals between Ethereum and the OP Stack chain. Every OP Stack chain deploys its own OptimismPortal, and Ethernal monitors it for bridge activity.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Batch Submission</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">The sequencer posts batches of L2 transactions to Ethereum L1. Since the Dencun upgrade (EIP-4844), most OP Stack chains use blobs instead of calldata, reducing costs by over 90%.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Fault Proofs</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">OP Stack chains use fault proofs (formerly called fraud proofs) to secure withdrawals. A 7-day challenge window allows anyone to challenge incorrect state proposals before funds can be withdrawn to L1.</p>
                    </div>
                </div>
            </section>

            <!-- Feature 1: OP Stack config -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-shield-link-variant-outline"
                    title="Native OP Stack Bridge Monitoring"
                    description="Ethernal understands the OP Stack architecture natively. Paste your OptimismPortal and Batch Inbox addresses, and it monitors deposits from Ethereum, tracks withdrawals through the 7-day challenge period, and indexes every batch your sequencer submits. Works with any OP Stack chain, not just the well-known ones."
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
                                    explorer.yourchain.example/settings
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
                                        <div class="mock-field-input">0x…your OptimismPortal address</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Batch Inbox Address</div>
                                        <div class="mock-field-input">0x…your Batch Inbox address</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: Withdrawal tracking -->
            <div class="my-12">
                <FeatureSection
                inline-icon
                compact
                icon="mdi-arrow-up-bold-circle-outline"
                title="L2-to-L1 Withdrawal Lifecycle"
                description="All OP Stack chains share the same withdrawal flow: initiation on L2, state root proposal to L1, 7-day challenge window, proving, and finalization on Ethereum. Ethernal tracks each step in real time across any OP Stack chain, so your users always know where their withdrawal stands."
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
                                explorer.yourchain.example/withdrawal/872
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
                { icon: 'mdi-database-outline', title: 'Blob Batches', description: 'EIP-4844 blob and calldata batch monitoring with L1 links' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Chains using OP Stack -->
            <section class="chains-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Chains Built on the OP Stack
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 700px; margin-bottom: 16px;">
                    The OP Stack powers a growing ecosystem of L2 chains known as the Superchain. Ethernal works with all of them. Here are some of the most prominent:
                </p>
                <div class="chain-grid">
                    <router-link to="/chains/optimism" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Optimism</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">The original OP Stack chain. Governance hub of the Superchain.</p>
                    </router-link>
                    <router-link to="/chains/base" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Base</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Coinbase's L2. Largest OP Stack chain by TVL and transaction volume.</p>
                    </router-link>
                    <router-link to="/chains/mode" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Mode</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">DeFi-focused L2 with sequencer fee sharing for protocol developers.</p>
                    </router-link>
                    <router-link to="/chains/zora" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Zora</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">NFT and creator-focused L2. Optimized for minting and media.</p>
                    </router-link>
                    <router-link to="/chains/blast" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Blast</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">L2 with native yield on ETH and stablecoins. Unique tokenomics.</p>
                    </router-link>
                    <router-link to="/chains/redstone" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Redstone</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">On-chain gaming L2 built on the OP Stack by Lattice.</p>
                    </router-link>
                    <router-link to="/chains/lisk" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Lisk</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Migrated from its own L1 to an OP Stack L2 for Ethereum alignment.</p>
                    </router-link>
                    <router-link to="/chains/cyber" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Cyber</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Social-focused L2 for decentralized social networking protocols.</p>
                    </router-link>
                    <router-link to="/chains/mint" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Mint</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">NFT-focused L2 for digital collectibles and creator economy.</p>
                    </router-link>
                </div>
            </section>

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up an OP Stack Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your chain's RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the RPC endpoint for your OP Stack chain. This works with any chain: Base (<code class="code-inline">https://mainnet.base.org</code>), Optimism, Mode, or your own custom chain.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your OptimismPortal and Batch Inbox addresses. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.yourchain.example</code>) to your Ethernal workspace. Your OP Stack explorer is live.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for OP Stack Explorers
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
                        <h3 class="faq-q">What is the OP Stack?</h3>
                        <p class="faq-a">The OP Stack is a modular, open-source framework for building optimistic rollups on Ethereum. It was created by OP Labs and powers the Superchain, a network of interoperable L2 chains including Optimism, Base, Mode, Zora, and many others. All OP Stack chains share the same execution layer (op-geth), derivation pipeline, and fault proof system.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Which chains use the OP Stack?</h3>
                        <p class="faq-a">Major OP Stack chains include Optimism, Base (Coinbase), Mode, Zora, Blast, Redstone, Lisk, Cyber, Mint, and many more. The Superchain is growing rapidly, with new chains launching regularly. Ethernal works with all of them.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between OP Stack and Arbitrum Orbit?</h3>
                        <p class="faq-a">Both are frameworks for launching L2 rollups on Ethereum. The OP Stack uses optimistic rollups with fault proofs and a 7-day withdrawal challenge window. Arbitrum Orbit uses the Nitro engine with BOLD fraud proofs. OP Stack chains form the Superchain with shared sequencing, while Orbit chains can choose between rollup and AnyTrust modes. Ethernal supports both frameworks.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How do I set up a block explorer for my OP Stack chain?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your chain's RPC endpoint, and configure the OP Stack bridge with your OptimismPortal and Batch Inbox addresses. Your explorer is live in under 5 minutes with transaction decoding, contract verification, and bridge tracking.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal work with custom OP Stack chains or only the well-known ones?</h3>
                        <p class="faq-a">Ethernal works with any OP Stack chain, not just the well-known ones. If your chain runs on op-geth and uses the standard OptimismPortal and batch submission contracts, Ethernal will work with it. This includes private/permissioned chains as well.</p>
                    </div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/chains/base" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-alpha-b-circle</v-icon>
                        <div>
                            <span class="related-title">Base Block Explorer</span>
                            <span class="related-desc">Dedicated explorer for Coinbase's L2 with OP Stack bridge monitoring</span>
                        </div>
                    </router-link>
                    <router-link to="/chains/base-sepolia" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-flask-outline</v-icon>
                        <div>
                            <span class="related-title">Base Sepolia Block Explorer</span>
                            <span class="related-desc">Testnet explorer for Base with OP Stack features and built-in faucet</span>
                        </div>
                    </router-link>
                    <router-link to="/op-stack" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon>
                        <div>
                            <span class="related-title">OP Stack Explorer Features</span>
                            <span class="related-desc">Deep dive into Ethernal's OP Stack integration capabilities</span>
                        </div>
                    </router-link>
                    <router-link to="/arbitrum-orbit" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-orbit-variant</v-icon>
                        <div>
                            <span class="related-title">Arbitrum Orbit Chains</span>
                            <span class="related-desc">Explorer support for the alternative L2 framework</span>
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
    title: 'Block Explorer for OP Stack Chains — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for any OP Stack chain. Withdrawal tracking, EIP-4844 blob monitoring, contract verification, and transaction decoding for the Superchain.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for OP Stack Chains — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for any OP Stack chain. Withdrawal tracking, EIP-4844 blob monitoring, contract verification, and transaction decoding for the Superchain.' },
        { property: 'og:url', content: 'https://tryethernal.com/op-stack' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-op-stack.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/op-stack' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for OP Stack Chains",
                "description": "Hosted block explorer for any OP Stack chain with withdrawal tracking, EIP-4844 blob monitoring, contract verification, and transaction decoding.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/op-stack",
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
                "name": "How to set up a block explorer for an OP Stack chain",
                "description": "Deploy a hosted block explorer for any OP Stack chain in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a Public Explorer workspace." },
                    { "@type": "HowToStep", "name": "Connect your chain's RPC", "text": "Paste the RPC endpoint for your OP Stack chain." },
                    { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter your OptimismPortal and Batch Inbox addresses for bridge monitoring." },
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
                    { "@type": "ListItem", "position": 2, "name": "Chains", "item": "https://tryethernal.com/chains" },
                    { "@type": "ListItem", "position": 3, "name": "OP Stack Chains", "item": "https://tryethernal.com/op-stack" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "What is the OP Stack?", "acceptedAnswer": { "@type": "Answer", "text": "The OP Stack is a modular framework for building optimistic rollups on Ethereum. It powers the Superchain, including Optimism, Base, Mode, Zora, and many other L2 chains." } },
                    { "@type": "Question", "name": "Which chains use the OP Stack?", "acceptedAnswer": { "@type": "Answer", "text": "Major OP Stack chains include Optimism, Base (Coinbase), Mode, Zora, Blast, Redstone, Lisk, Cyber, Mint, and many more." } },
                    { "@type": "Question", "name": "What is the difference between OP Stack and Arbitrum Orbit?", "acceptedAnswer": { "@type": "Answer", "text": "Both are L2 rollup frameworks. OP Stack uses fault proofs with a 7-day challenge window. Arbitrum Orbit uses Nitro with BOLD fraud proofs. OP Stack chains form the Superchain; Orbit chains can choose rollup or AnyTrust mode. Ethernal supports both." } },
                    { "@type": "Question", "name": "How do I set up a block explorer for my OP Stack chain?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your RPC endpoint, configure the OptimismPortal and Batch Inbox addresses. Your explorer is live in under 5 minutes." } },
                    { "@type": "Question", "name": "Does Ethernal work with custom OP Stack chains?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal works with any chain running op-geth and using standard OP Stack contracts, including private and permissioned chains." } }
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

/* Architecture cards */
.arch-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.arch-card { padding: 16px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; }

/* Chain grid */
.chain-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
.chain-card { padding: 14px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 8px; text-decoration: none; display: block; transition: border-color 0.2s; }
.chain-card:hover { border-color: var(--border-glow); }

/* Setup steps */
.setup-steps { display: flex; flex-direction: column; gap: 20px; }
.setup-step { display: flex; gap: 16px; align-items: flex-start; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }

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
    .step { min-width: 55px; }
    .step-label { font-size: 8px; }
    .step-line { width: 16px; }
    .arch-cards { grid-template-columns: 1fr; }
    .chain-grid { grid-template-columns: 1fr 1fr; }
}
</style>
