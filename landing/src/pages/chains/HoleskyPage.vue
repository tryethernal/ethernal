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
                    <span class="current">Holesky</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">TESTNET · ETHEREUM</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Holesky Testnet</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Holesky, Ethereum's dedicated testnet for validator and staking infrastructure testing. Get transaction decoding, contract verification, and staking contract monitoring for your Holesky environment without running any infrastructure.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 98, 126, 234;">
                    <div class="chain-stat"><img src="/images/chains/ethereum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">17000</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: Interact with Staking Contracts -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-check-decagram"
                    title="Interact with Staking Contracts"
                    description="Deploy and verify staking-related contracts on Holesky, then interact with them directly from the explorer UI. Test deposit contract interactions, withdrawal credential changes, and validator management functions without building a custom frontend. Read contract state and send write transactions in one click."
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
                                    explorer.holesky.example/address/0x4242…
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-contract-panel">
                                    <div class="panel-tabs">
                                        <span class="tab">Code</span>
                                        <span class="tab active">Read</span>
                                        <span class="tab">Write</span>
                                        <span class="tab">Events</span>
                                    </div>
                                    <div class="panel-content">
                                        <div class="read-fn">
                                            <div class="fn-header">
                                                <span class="fn-name">get_deposit_count</span>
                                                <span class="fn-type">view</span>
                                            </div>
                                            <div class="fn-result">
                                                <span class="fn-label">Result</span>
                                                <span class="fn-val">1,847,293</span>
                                            </div>
                                        </div>
                                        <div class="read-fn">
                                            <div class="fn-header">
                                                <span class="fn-name">get_deposit_root</span>
                                                <span class="fn-type">view</span>
                                            </div>
                                            <div class="fn-result">
                                                <span class="fn-label">Result</span>
                                                <span class="fn-val">0x8a7b…4f21</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Feature 2: Built-in Testnet Faucet -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-water-outline"
                    title="Built-in Testnet Faucet"
                    description="The Ethernal Starter plan (free) includes a built-in testnet faucet for your explorer. Visitors can request test ETH directly from your explorer page. No need to set up a separate faucet service or point users to third-party faucets with rate limits and CAPTCHAs."
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
                                    explorer.holesky.example/faucet
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-faucet">
                                    <div class="faucet-title">Holesky Faucet</div>
                                    <p class="faucet-desc">Request testnet ETH for validator testing</p>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Recipient Address</div>
                                        <div class="mock-field-input">0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D</div>
                                    </div>
                                    <div class="faucet-amount">
                                        <span class="faucet-label">Amount</span>
                                        <span class="faucet-val">0.5 ETH</span>
                                    </div>
                                    <div class="mock-settings-btn">Request Testnet ETH</div>
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
                    How to Set Up a Holesky Block Explorer
                </h2>
                <div class="setup-steps">
                    <div class="setup-step">
                        <div class="step-number">1</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Create a workspace</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Sign up at <strong style="color: var(--text-primary);">app.tryethernal.com</strong> and create a new workspace.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">2</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Holesky RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste a Holesky RPC URL from any provider: Alchemy (<code class="code-inline">https://eth-holesky.g.alchemy.com/v2/YOUR_KEY</code>), Infura, QuickNode, or your own consensus/execution client pair.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Start exploring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Your Holesky explorer is live. Blocks, transactions, and contracts are indexed automatically. Verify contracts and use the built-in faucet.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Use cases -->
            <section class="use-cases-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Why Teams Use a Dedicated Holesky Explorer
                </h2>
                <div class="use-case-cards">
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-shield-lock-outline</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Staking Protocol Testing</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Test liquid staking contracts (Lido, Rocket Pool, EigenLayer restaking) on Holesky before deploying to mainnet. Track deposit events and withdrawal flows in your own explorer.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-server-network</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Consensus Client Development</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Teams building or testing consensus clients (Lighthouse, Prysm, Teku, Nimbus, Lodestar) use Holesky to validate their implementations against a real proof-of-stake network.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-account-key-outline</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Validator Tooling</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Build and test validator management dashboards, key management tools, and exit/withdrawal credential workflows with a dedicated explorer that shows only your activity.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-cog-transfer-outline</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Infrastructure Testing</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Test your node infrastructure, MEV relay integrations, and network monitoring tools against Holesky before rolling changes out to mainnet validators.</p>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Holesky Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    The Starter plan (free) is often all you need for a Holesky testnet explorer. It includes contract verification, token tracking, a built-in faucet, and unlimited transactions.
                    For custom domains and branding, the Team plan starts at $150/month.
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
                        <h3 class="faq-q">How do I set up a block explorer for Holesky?</h3>
                        <p class="faq-a">Create a free workspace on Ethernal and paste your Holesky RPC endpoint. Your explorer is live immediately with transaction decoding, contract verification, and a built-in faucet.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between Holesky and Sepolia?</h3>
                        <p class="faq-a">Holesky (chain ID 17000) is designed for validator and staking infrastructure testing, with 1.6 billion ETH supply to simulate mainnet staking conditions. Sepolia (chain ID 11155111) is for application development: smart contracts, dApps, and protocol testing. Ethernal supports both.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Is Holesky replacing Goerli?</h3>
                        <p class="faq-a">Yes. The Ethereum Foundation launched Holesky in September 2023 specifically for staking and infrastructure testing, as Goerli was deprecated. Holesky has a much larger ETH supply (1.6B) to better simulate mainnet validator economics.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I get free Holesky ETH through Ethernal?</h3>
                        <p class="faq-a">Yes. The Ethernal Starter plan includes a built-in testnet faucet. Users can request test ETH directly from your explorer page without needing a separate faucet service.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support staking-specific features on Holesky?</h3>
                        <p class="faq-a">Ethernal provides full transaction decoding, contract verification, and call trace debugging for any contract on Holesky, including deposit contracts, liquid staking protocols, and restaking contracts. You can interact with verified staking contracts directly from the explorer UI.</p>
                    </div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/chains/sepolia" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-flask-outline</v-icon>
                        <div>
                            <span class="related-title">Sepolia Block Explorer</span>
                            <span class="related-desc">Ethereum's primary testnet for application development</span>
                        </div>
                    </router-link>
                    <router-link to="/hardhat-block-explorer" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-hammer-wrench</v-icon>
                        <div>
                            <span class="related-title">Hardhat Block Explorer</span>
                            <span class="related-desc">Auto-sync contracts and transactions from your local Hardhat node</span>
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
    title: 'Block Explorer for Holesky Testnet — Ethernal',
    meta: [
        { name: 'description', content: 'Free hosted block explorer for Holesky testnet. Contract verification, transaction decoding, call traces, and built-in faucet for Ethereum staking and validator testing.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Holesky Testnet — Ethernal' },
        { property: 'og:description', content: 'Free hosted block explorer for Holesky testnet. Contract verification, transaction decoding, call traces, and built-in faucet for Ethereum staking and validator testing.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/holesky' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-holesky.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/holesky' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Holesky",
                "description": "Free hosted block explorer for Holesky testnet with contract verification, transaction decoding, call traces, and built-in faucet for validator and staking testing.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/holesky",
                "offers": [
                    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Free testnet explorer with contract verification, token tracking, faucet, unlimited transactions" },
                    { "@type": "Offer", "name": "Team", "price": "150", "priceCurrency": "USD", "priceSpecification": { "@type": "UnitPriceSpecification", "billingDuration": "P1M" }, "description": "Custom domain, native token, L1 explorer, 100k tx included" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": "How to set up a Holesky testnet block explorer",
                "description": "Deploy a free hosted block explorer for Holesky with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace." },
                    { "@type": "HowToStep", "name": "Connect your Holesky RPC", "text": "Paste a Holesky RPC URL from Alchemy, Infura, QuickNode, or your own node." },
                    { "@type": "HowToStep", "name": "Start exploring", "text": "Your explorer is live with transaction decoding, contract verification, and a built-in faucet." }
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
                    { "@type": "ListItem", "position": 3, "name": "Holesky", "item": "https://tryethernal.com/chains/holesky" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Holesky?", "acceptedAnswer": { "@type": "Answer", "text": "Create a free workspace on Ethernal and paste your Holesky RPC endpoint. Your explorer is live immediately." } },
                    { "@type": "Question", "name": "What is the difference between Holesky and Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Holesky (chain ID 17000) is for validator and staking testing with 1.6B ETH supply. Sepolia (chain ID 11155111) is for application development. Ethernal supports both." } },
                    { "@type": "Question", "name": "Is Holesky replacing Goerli?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Holesky launched in September 2023 for staking and infrastructure testing, replacing Goerli which was deprecated." } },
                    { "@type": "Question", "name": "Can I get free Holesky ETH through Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The free Starter plan includes a built-in testnet faucet." } },
                    { "@type": "Question", "name": "Does Ethernal support staking-specific features on Holesky?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal provides full transaction decoding, contract verification, and call traces for all Holesky contracts including deposit contracts and staking protocols." } }
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

/* Contract panel */
.panel-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 1px solid var(--drawer-divider); }
.tab { padding: 8px 16px; color: var(--text-muted); font-size: 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.tab.active { color: #5DAAE0; border-bottom-color: #5DAAE0; }
.read-fn { padding: 12px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 8px; margin-bottom: 10px; }
.fn-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.fn-name { color: #5DAAE0; font-weight: 600; font-size: 12px; }
.fn-type { padding: 2px 6px; border-radius: 4px; background: rgba(167, 139, 250, 0.1); color: #A78BFA; font-size: 9px; font-weight: 600; border: 1px solid rgba(167, 139, 250, 0.2); }
.fn-label { color: var(--text-muted); font-size: 10px; display: block; margin-bottom: 4px; }
.fn-result { padding-top: 8px; border-top: 1px solid var(--drawer-divider); }
.fn-val { color: var(--text-primary); font-size: 12px; }

/* Faucet */
.mock-faucet { text-align: left; }
.faucet-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.faucet-desc { color: var(--text-muted); font-size: 11px; margin-bottom: 16px; }
.faucet-amount { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); margin-bottom: 14px; }
.faucet-label { color: var(--text-muted); font-size: 11px; }
.faucet-val { color: var(--text-primary); font-weight: 600; font-size: 13px; }
.mock-field { margin-bottom: 14px; }
.mock-field-label { color: var(--text-secondary); font-size: 11px; margin-bottom: 6px; }
.mock-field-input { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.mock-settings-btn { display: inline-flex; padding: 8px 24px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 12px; font-weight: 600; margin-top: 4px; }

/* Setup steps */
.setup-steps { display: flex; flex-direction: column; gap: 20px; }
.setup-step { display: flex; gap: 16px; align-items: flex-start; }
.step-number { width: 32px; height: 32px; border-radius: 50%; background: rgba(61, 149, 206, 0.12); border: 1px solid rgba(61, 149, 206, 0.3); color: #5DAAE0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.code-inline { background: var(--glass-bg-strong); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #A5D6FF; }

/* Use case cards */
.use-case-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.use-case-card { padding: 20px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; }

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
    .use-case-cards { grid-template-columns: 1fr; }
}
</style>
