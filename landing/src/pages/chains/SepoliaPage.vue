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
                    <span class="current">Sepolia</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">TESTNET · ETHEREUM</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Sepolia Testnet</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Sepolia, Ethereum's primary testnet. Get transaction decoding, contract verification, and token tracking for your Sepolia development environment without running any infrastructure.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 98, 126, 234;">
                    <div class="chain-stat"><img src="/images/chains/ethereum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">11155111</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: Your Own Sepolia Explorer -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-flask-outline"
                    title="Your Own Sepolia Explorer"
                    description="Sepolia is the recommended Ethereum testnet for application development (replacing Goerli since 2023). While public explorers like Etherscan exist for Sepolia, teams building dApps or protocols often need a private, branded explorer that shows only their contracts and transactions. Ethernal gives you that."
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
                                    explorer.sepolia.example/overview
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-overview">
                                    <div class="overview-title">Sepolia Explorer</div>
                                    <div class="overview-stats">
                                        <div class="stat-card">
                                            <span class="stat-label">Latest Block</span>
                                            <span class="stat-value">7,284,192</span>
                                        </div>
                                        <div class="stat-card">
                                            <span class="stat-label">Chain ID</span>
                                            <span class="stat-value">11155111</span>
                                        </div>
                                        <div class="stat-card">
                                            <span class="stat-label">Avg Block Time</span>
                                            <span class="stat-value">12s</span>
                                        </div>
                                        <div class="stat-card">
                                            <span class="stat-label">Network</span>
                                            <span class="stat-value badge">Testnet</span>
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
                                    explorer.sepolia.example/faucet
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-faucet">
                                    <div class="faucet-title">Sepolia Faucet</div>
                                    <p class="faucet-desc">Request testnet ETH for development</p>
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
                { icon: 'mdi-check-decagram', title: 'Contract Verification', description: 'Verify Solidity source, read and write contract state from the UI' },
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-swap-horizontal', title: 'Token Tracking', description: 'ERC-20, ERC-721, and ERC-1155 transfers and balance changes' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />

            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up a Sepolia Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Sepolia RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste a Sepolia RPC URL from any provider: Alchemy (<code class="code-inline">https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY</code>), Infura, QuickNode, or the public endpoint.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Start exploring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Your Sepolia explorer is live. Blocks, transactions, and contracts are indexed automatically. Verify contracts and use the built-in faucet.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Use cases for testnet explorer -->
            <section class="use-cases-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Why Teams Use a Dedicated Sepolia Explorer
                </h2>
                <div class="use-case-cards">
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-test-tube</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">QA and Testing</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Give your QA team a clean explorer that only shows your project's contracts and transactions. No noise from other Sepolia activity.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-presentation</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Demo Environments</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Show investors and partners a branded explorer with your logo and domain. More professional than pointing them to a public Etherscan page.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-school-outline</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Hackathons and Workshops</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Provide participants with a testnet faucet and explorer in one URL. The built-in faucet means no separate faucet management.</p>
                    </div>
                    <div class="use-case-card">
                        <v-icon size="24" style="color: #5DAAE0; margin-bottom: 12px;">mdi-rocket-launch-outline</v-icon>
                        <h3 style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem; margin-bottom: 6px;">Pre-mainnet Staging</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">Run your Sepolia explorer on the same Ethernal plan you will use for mainnet. When you are ready to launch, just swap the RPC URL.</p>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Sepolia Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    The Starter plan (free) is often all you need for a Sepolia testnet explorer. It includes contract verification, token tracking, a built-in faucet, and unlimited transactions.
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
                        <h3 class="faq-q">How do I set up a block explorer for Sepolia?</h3>
                        <p class="faq-a">Create a free workspace on Ethernal and paste your Sepolia RPC endpoint. Your explorer is live immediately with transaction decoding, contract verification, and a built-in faucet.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Is Sepolia replacing Goerli as the Ethereum testnet?</h3>
                        <p class="faq-a">Yes. The Ethereum Foundation deprecated Goerli in early 2024. Sepolia (chain ID 11155111) is now the recommended testnet for application development. Holesky is used for validator/staking testing.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I get free Sepolia ETH through Ethernal?</h3>
                        <p class="faq-a">Yes. The Ethernal Starter plan includes a built-in testnet faucet. Users can request test ETH directly from your explorer page without needing a separate faucet service.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support Base Sepolia and Arbitrum Sepolia too?</h3>
                        <p class="faq-a">Yes. Ethernal works with any EVM-compatible chain. Connect Base Sepolia (chain ID 84532) or Arbitrum Sepolia (chain ID 421614) the same way you would connect Sepolia. You get the same features plus L2-specific bridge monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the difference between Sepolia and Holesky?</h3>
                        <p class="faq-a">Sepolia is for application developers (smart contracts, dApps, protocol testing). Holesky is for infrastructure and staking testing (validators, consensus clients). Ethernal supports both.</p>
                    </div>
                </div>
            </section>

            <!-- Related -->
            <section class="related-section my-16">
                <h2 class="font-heading text-white mb-6" style="font-weight: 700; font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.02em;">
                    Related
                </h2>
                <div class="related-links">
                    <router-link to="/hardhat-block-explorer" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-hammer-wrench</v-icon>
                        <div>
                            <span class="related-title">Hardhat Block Explorer</span>
                            <span class="related-desc">Auto-sync contracts and transactions from your local Hardhat node</span>
                        </div>
                    </router-link>
                    <router-link to="/anvil-block-explorer" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-anvil</v-icon>
                        <div>
                            <span class="related-title">Anvil Block Explorer</span>
                            <span class="related-desc">Foundry-native explorer for local Anvil development</span>
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
    title: 'Block Explorer for Sepolia Testnet — Ethernal',
    meta: [
        { name: 'description', content: 'Free hosted block explorer for Sepolia testnet. Contract verification, transaction decoding, call traces, and built-in faucet for Ethereum development.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Sepolia Testnet — Ethernal' },
        { property: 'og:description', content: 'Free hosted block explorer for Sepolia testnet. Contract verification, transaction decoding, call traces, and built-in faucet for Ethereum development.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/sepolia' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-sepolia.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/sepolia' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Sepolia",
                "description": "Free hosted block explorer for Sepolia testnet with contract verification, transaction decoding, call traces, and built-in faucet.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/sepolia",
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
                "name": "How to set up a Sepolia testnet block explorer",
                "description": "Deploy a free hosted block explorer for Sepolia with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace." },
                    { "@type": "HowToStep", "name": "Connect your Sepolia RPC", "text": "Paste a Sepolia RPC URL from Alchemy, Infura, QuickNode, or any provider." },
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
                    { "@type": "ListItem", "position": 2, "name": "Sepolia", "item": "https://tryethernal.com/chains/sepolia" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Create a free workspace on Ethernal and paste your Sepolia RPC endpoint. Your explorer is live immediately." } },
                    { "@type": "Question", "name": "Is Sepolia replacing Goerli?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Goerli was deprecated in early 2024. Sepolia (chain ID 11155111) is now the recommended Ethereum testnet for application development." } },
                    { "@type": "Question", "name": "Can I get free Sepolia ETH through Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The free Starter plan includes a built-in testnet faucet." } },
                    { "@type": "Question", "name": "Does Ethernal support Base Sepolia and Arbitrum Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Connect any EVM-compatible testnet the same way, with L2-specific bridge monitoring included." } },
                    { "@type": "Question", "name": "What is the difference between Sepolia and Holesky?", "acceptedAnswer": { "@type": "Answer", "text": "Sepolia is for application developers (smart contracts, dApps). Holesky is for infrastructure and staking testing. Ethernal supports both." } }
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

/* Overview mock */
.overview-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.overview-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.stat-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.stat-value.badge { color: #F59E0B; }

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
    .overview-stats { grid-template-columns: 1fr 1fr; }
}
</style>
