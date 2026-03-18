<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Chain Hero -->
            <div class="chain-hero">
                <nav class="breadcrumb mb-3">
                    <router-link to="/">Home</router-link>
                    <span class="sep">/</span>
                    <span class="current">Arbitrum Orbit Explorer</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FRAMEWORK · ARBITRUM ORBIT</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Arbitrum Orbit Chains</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer that works with any Arbitrum Orbit chain. Whether you are running Arbitrum One, Nova, Degen Chain, Xai, or your own custom L2/L3 built on the Nitro stack, Ethernal provides transaction decoding, contract verification, retryable ticket tracking, and bridge monitoring out of the box.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 40, 160, 240;">
                    <div class="chain-stat"><img src="/images/chains/arbitrum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Arbitrum Orbit</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Chains</span> <span class="chain-stat-value">5+</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">DA</span> <span class="chain-stat-value">Rollup + AnyTrust</span></div>
                </div>
            </div>

            <!-- What is Arbitrum Orbit -->
            <section class="arch-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    What is Arbitrum Orbit?
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 700px; margin-bottom: 16px;">
                    Arbitrum Orbit is a framework by Offchain Labs for launching custom L2 and L3 chains using the Nitro tech stack. Orbit chains settle on Ethereum (L2) or on another Arbitrum chain (L3), and teams can choose between two data availability modes: full Rollup (data posted to Ethereum) or AnyTrust (data held by a committee for lower costs). The Nitro engine compiles EVM to WASM for dispute resolution, supports standard Solidity contracts, and uses BOLD (Bounded Liquidity Delay) fraud proofs.
                </p>
                <div class="arch-cards">
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Rollup Mode</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Full data availability on Ethereum. Transaction data is posted to L1 calldata or blobs. Maximum security, higher data costs. Used by Arbitrum One.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">AnyTrust Mode</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Data availability via a committee (Data Availability Committee, or DAC). Much lower costs, slightly different trust assumptions. Used by Arbitrum Nova, Degen Chain, and many gaming chains.</p>
                    </div>
                    <div class="arch-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">BOLD Fraud Proofs</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Bounded Liquidity Delay ensures disputes resolve within a fixed time window, preventing delay attacks. Validators challenge incorrect state assertions posted to the parent chain.</p>
                    </div>
                </div>
            </section>

            <!-- Feature 1: Orbit config -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cog-outline"
                    title="Native Orbit Bridge Monitoring"
                description="Ethernal understands the Nitro architecture natively. Configure your Rollup and Inbox contract addresses, and it monitors assertion postings, tracks retryable tickets for L1-to-L2 messaging, and detects challenges. Works with any Orbit chain: L2 settling on Ethereum or L3 settling on another Arbitrum chain."
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
                                    <div class="mock-field-input">0x…your Rollup contract address</div>
                                </div>
                                <div class="mock-field">
                                    <div class="mock-field-label">Inbox Contract Address</div>
                                    <div class="mock-field-input">0x…your Inbox contract address</div>
                                </div>
                                <div class="mock-settings-btn">Create Configuration</div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>
            </div>

            <!-- Feature 2: Retryable ticket trace -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-code-json"
                    title="Retryable Ticket Tracing"
                description="Arbitrum uses retryable tickets for cross-chain messaging. When a message is sent from L1 to your Orbit chain (or from a parent Orbit chain to an L3), Ethernal decodes the full lifecycle: submission, auto-redeem attempt, and final execution. See decoded parameters at every step of the cross-chain call."
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
                                explorer.yourchain.example/tx/0xd4a2…8c1e
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
                                <div class="trace-node indent-2"><span class="trace-op event">LOG</span><span class="trace-method">InboxMessageDelivered(messageNum: 129401, data: 0x...)</span></div>
                                <div class="trace-node indent-2"><span class="trace-op event">LOG</span><span class="trace-method">MessageDelivered(messageIndex, beforeAcc, inbox, ...)</span></div>
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
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Chains using Orbit -->
            <section class="chains-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Chains Built on Arbitrum Orbit
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 700px; margin-bottom: 16px;">
                    The Orbit ecosystem includes L2 chains settling on Ethereum and L3 chains settling on Arbitrum One or Nova. Ethernal works with all of them:
                </p>
                <div class="chain-grid">
                    <router-link to="/chains/arbitrum-one" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Arbitrum One</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">The flagship optimistic rollup. Settles on Ethereum. Largest Orbit chain by TVL.</p>
                    </router-link>
                    <router-link to="/chains/arbitrum-nova" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Arbitrum Nova</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">AnyTrust chain for gaming and social. Lower fees via DAC data availability.</p>
                    </router-link>
                    <router-link to="/chains/degen-chain" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Degen Chain</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">L3 on Arbitrum Orbit. Community-driven chain for the Degen token ecosystem.</p>
                    </router-link>
                    <router-link to="/chains/xai" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Xai</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Gaming-focused L3 by Offchain Labs. AnyTrust mode for low-cost game transactions.</p>
                    </router-link>
                    <router-link to="/chains/proof-of-play-apex" class="chain-card">
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">Proof of Play</h3>
                        <p style="color: var(--text-muted); font-size: 0.8rem;">Gaming L3 powering on-chain games like Pirate Nation. Built on Orbit AnyTrust.</p>
                    </router-link>
                </div>
            </section>

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up an Arbitrum Orbit Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your chain's RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the RPC endpoint for your Orbit chain. For Arbitrum One: <code class="code-inline">https://arb1.arbitrum.io/rpc</code>. For custom Orbit chains, use your sequencer's RPC URL.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure Orbit bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your Rollup and Inbox contract addresses. Ethernal starts monitoring assertions, retryable tickets, and cross-chain messages automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain and your branded Orbit explorer is live with transaction decoding, contract verification, and bridge tracking.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Arbitrum Orbit Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    Start free with the Starter plan (ad-supported, includes contract verification, token tracking, and unlimited transactions).
                    For custom domains and L1 bridge integration, the Team plan starts at $150/month.
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
                        <h3 class="faq-q">What is Arbitrum Orbit?</h3>
                        <p class="faq-a">Arbitrum Orbit is a framework by Offchain Labs for launching custom L2 and L3 chains using the Nitro tech stack. Teams can choose between Rollup mode (data on Ethereum) or AnyTrust mode (data via committee) depending on their cost and security requirements. Orbit chains can settle on Ethereum (L2) or on another Arbitrum chain (L3).</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between Arbitrum Orbit and OP Stack?</h3>
                        <p class="faq-a">Both are frameworks for launching L2 rollups. Orbit uses the Nitro engine with BOLD fraud proofs and offers AnyTrust (committee-based data availability) as an alternative to full rollup. OP Stack uses op-geth with fault proofs and a 7-day challenge window, and chains form the Superchain. Ethernal supports both frameworks with native bridge monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How do I launch an Orbit chain with a block explorer?</h3>
                        <p class="faq-a">After deploying your Orbit chain using the Arbitrum SDK or Orbit Portal, create a workspace on Ethernal, paste your chain's RPC, and configure the Rollup and Inbox contract addresses. Your explorer is live in under 5 minutes with transaction decoding, contract verification, and bridge monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support L3 Orbit chains?</h3>
                        <p class="faq-a">Yes. Ethernal works with Orbit chains at any layer. L3 chains that settle on Arbitrum One or Nova are configured the same way: provide the RPC endpoint and the parent chain's Rollup/Inbox addresses.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between AnyTrust and Rollup mode?</h3>
                        <p class="faq-a">In Rollup mode, all transaction data is posted to Ethereum L1 (maximum security, higher costs). In AnyTrust mode, data is held by a Data Availability Committee (lower costs, different trust assumptions). Arbitrum One uses Rollup mode; Nova, Xai, and most gaming chains use AnyTrust. Ethernal supports both modes.</p>
                    </div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/chains/arbitrum-one" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-alpha-a-circle</v-icon>
                        <div>
                            <span class="related-title">Arbitrum One Block Explorer</span>
                            <span class="related-desc">Dedicated explorer for the flagship Arbitrum rollup</span>
                        </div>
                    </router-link>
                    <router-link to="/chains/arbitrum-sepolia" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-flask-outline</v-icon>
                        <div>
                            <span class="related-title">Arbitrum Sepolia Block Explorer</span>
                            <span class="related-desc">Testnet explorer for Arbitrum with Orbit features and built-in faucet</span>
                        </div>
                    </router-link>
                    <router-link to="/arbitrum-orbit" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-orbit-variant</v-icon>
                        <div>
                            <span class="related-title">Arbitrum Orbit Explorer Features</span>
                            <span class="related-desc">Deep dive into Ethernal's Orbit integration capabilities</span>
                        </div>
                    </router-link>
                    <router-link to="/op-stack" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon>
                        <div>
                            <span class="related-title">OP Stack Chains</span>
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
    title: 'Block Explorer for Arbitrum Orbit Chains — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for any Arbitrum Orbit chain. Retryable ticket tracing, bridge monitoring, contract verification, and transaction decoding for Nitro-based L2/L3 chains.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Arbitrum Orbit Chains — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for any Arbitrum Orbit chain. Retryable ticket tracing, bridge monitoring, contract verification, and transaction decoding for Nitro-based L2/L3 chains.' },
        { property: 'og:url', content: 'https://tryethernal.com/arbitrum-orbit' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-arbitrum-orbit.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/arbitrum-orbit' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Arbitrum Orbit Chains",
                "description": "Hosted block explorer for any Arbitrum Orbit chain with retryable ticket tracing, bridge monitoring, contract verification, and transaction decoding.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/arbitrum-orbit",
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
                "name": "How to set up a block explorer for an Arbitrum Orbit chain",
                "description": "Deploy a hosted block explorer for any Arbitrum Orbit chain in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a Public Explorer workspace." },
                    { "@type": "HowToStep", "name": "Connect your chain's RPC", "text": "Paste the RPC endpoint for your Orbit chain." },
                    { "@type": "HowToStep", "name": "Configure Orbit bridge", "text": "Enter your Rollup and Inbox contract addresses for bridge monitoring." },
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
                    { "@type": "ListItem", "position": 3, "name": "Arbitrum Orbit Chains", "item": "https://tryethernal.com/arbitrum-orbit" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "What is Arbitrum Orbit?", "acceptedAnswer": { "@type": "Answer", "text": "Arbitrum Orbit is a framework by Offchain Labs for launching custom L2 and L3 chains using the Nitro tech stack. Teams choose between Rollup (data on Ethereum) or AnyTrust (data via committee) modes." } },
                    { "@type": "Question", "name": "What is the difference between Orbit and OP Stack?", "acceptedAnswer": { "@type": "Answer", "text": "Orbit uses Nitro with BOLD fraud proofs and offers AnyTrust mode. OP Stack uses op-geth with fault proofs and forms the Superchain. Ethernal supports both." } },
                    { "@type": "Question", "name": "How do I launch an Orbit chain with a block explorer?", "acceptedAnswer": { "@type": "Answer", "text": "After deploying your Orbit chain, create a workspace on Ethernal, paste your RPC, and configure Rollup/Inbox addresses. Live in under 5 minutes." } },
                    { "@type": "Question", "name": "Does Ethernal support L3 Orbit chains?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal works with Orbit chains at any layer, including L3s settling on Arbitrum One or Nova." } },
                    { "@type": "Question", "name": "What is the difference between AnyTrust and Rollup mode?", "acceptedAnswer": { "@type": "Answer", "text": "Rollup posts all data to Ethereum (max security, higher cost). AnyTrust uses a Data Availability Committee (lower cost, different trust). Ethernal supports both." } }
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
    .arch-cards { grid-template-columns: 1fr; }
    .chain-grid { grid-template-columns: 1fr 1fr; }
}
</style>
