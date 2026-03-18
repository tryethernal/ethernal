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
                    <span class="current">Arbitrum Sepolia</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">TESTNET · ARBITRUM ORBIT</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Arbitrum Sepolia Testnet</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Arbitrum Sepolia, the official testnet for Arbitrum's Nitro stack. Get transaction decoding, contract verification, retryable ticket tracing, and a built-in faucet for your Arbitrum Sepolia development environment.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 40, 160, 240;">
                    <div class="chain-stat"><img src="/images/chains/arbitrum.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">421614</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">Arbitrum Orbit</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Sepolia</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Feature 1: Orbit Bridge Monitoring on Testnet -->
            <div class="my-12">
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cog-outline"
                    title="Orbit Bridge Monitoring on Testnet"
                    description="Arbitrum Sepolia (chain ID 421614) runs the same Nitro stack as Arbitrum One mainnet. Ethernal monitors your testnet Rollup and Inbox contracts, tracks L1-to-L2 retryable tickets, and follows assertion postings. Test your bridge integration in a staging environment before going to mainnet."
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
                                    explorer.arb-sepolia.example/settings
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">Arbitrum Orbit Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L1 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Sepolia Testnet</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Rollup Contract Address</div>
                                        <div class="mock-field-input">0xd80810638dbDF9081b72C1B33c65375e807281C8</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Inbox Contract Address</div>
                                        <div class="mock-field-input">0xaAe29B0366299461418F5324a79Afc425BE5ae21</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
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
                    description="The Ethernal Starter plan (free) includes a built-in testnet faucet. Visitors can request test ETH directly from your Arbitrum Sepolia explorer page. No need to set up a separate faucet service or deal with third-party rate limits."
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
                                    explorer.arb-sepolia.example/faucet
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-faucet">
                                    <div class="faucet-title">Arbitrum Sepolia Faucet</div>
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
                    How to Set Up an Arbitrum Sepolia Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect Arbitrum Sepolia RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste the Arbitrum Sepolia RPC endpoint: <code class="code-inline">https://sepolia-rollup.arbitrum.io/rpc</code> or use a provider like Alchemy or QuickNode.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure Orbit bridge (optional)</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter the testnet Rollup and Inbox contract addresses to enable retryable ticket tracking and assertion monitoring. Uses Sepolia L1 as the parent chain.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Start exploring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Your Arbitrum Sepolia explorer is live. Blocks, transactions, and contracts are indexed automatically. Use the built-in faucet and verify contracts.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section class="pricing-context my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Pricing for Arbitrum Sepolia Explorers
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.7; max-width: 640px;">
                    The Starter plan (free) is often all you need for an Arbitrum Sepolia testnet explorer. It includes contract verification, token tracking, a built-in faucet, and unlimited transactions.
                    For custom domains and branding, the Team plan starts at $150/month. Full whitelabel is $500/month on the App Chain plan.
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
                        <h3 class="faq-q">How do I set up a block explorer for Arbitrum Sepolia?</h3>
                        <p class="faq-a">Create a free workspace on Ethernal, paste the Arbitrum Sepolia RPC endpoint (<code class="code-inline">https://sepolia-rollup.arbitrum.io/rpc</code>), and optionally configure Orbit bridge addresses. Your explorer is live in minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is the chain ID for Arbitrum Sepolia?</h3>
                        <p class="faq-a">Arbitrum Sepolia uses chain ID 421614. It settles on the Sepolia testnet (chain ID 11155111) and runs the same Nitro stack as Arbitrum One mainnet (chain ID 42161).</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Ethernal support Orbit bridge features on Arbitrum Sepolia?</h3>
                        <p class="faq-a">Yes. Configure your testnet Rollup and Inbox contract addresses and Ethernal will track retryable tickets, assertion postings, and L1-to-L2 message delivery on Arbitrum Sepolia.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I get free Arbitrum Sepolia ETH through Ethernal?</h3>
                        <p class="faq-a">Yes. The Ethernal Starter plan includes a built-in testnet faucet. Users can request test ETH directly from your explorer page without a separate faucet.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use the same Ethernal setup for Arbitrum One mainnet?</h3>
                        <p class="faq-a">Yes. The configuration is identical. When you are ready to go to production, update your RPC URL from Arbitrum Sepolia to Arbitrum One and swap the bridge contract addresses. Everything else carries over.</p>
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
                            <span class="related-desc">Full-featured explorer for Arbitrum One mainnet with Orbit bridge monitoring</span>
                        </div>
                    </router-link>
                    <router-link to="/chains/sepolia" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-flask-outline</v-icon>
                        <div>
                            <span class="related-title">Sepolia Block Explorer</span>
                            <span class="related-desc">Ethereum's primary testnet for application development</span>
                        </div>
                    </router-link>
                    <router-link to="/arbitrum-orbit" class="related-link">
                        <v-icon size="18" style="color: #5DAAE0;">mdi-layers-outline</v-icon>
                        <div>
                            <span class="related-title">Arbitrum Orbit Chains</span>
                            <span class="related-desc">Explorer support for all Orbit and Nitro-based networks</span>
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

        <LandingCTA chain="arbitrum-sepolia" />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import ChainFeatureGrid from '@/components/ChainFeatureGrid.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Block Explorer for Arbitrum Sepolia Testnet — Ethernal',
    meta: [
        { name: 'description', content: 'Free hosted block explorer for Arbitrum Sepolia testnet. Orbit bridge monitoring, retryable ticket tracing, contract verification, and built-in faucet.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Arbitrum Sepolia Testnet — Ethernal' },
        { property: 'og:description', content: 'Free hosted block explorer for Arbitrum Sepolia testnet. Orbit bridge monitoring, retryable ticket tracing, contract verification, and built-in faucet.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/arbitrum-sepolia' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-arbitrum-sepolia.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/arbitrum-sepolia' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Arbitrum Sepolia",
                "description": "Free hosted block explorer for Arbitrum Sepolia testnet with Orbit bridge monitoring, retryable ticket tracing, contract verification, and built-in faucet.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/arbitrum-sepolia",
                "offers": [
                    { "@type": "Offer", "name": "Starter", "price": "0", "priceCurrency": "USD", "description": "Free testnet explorer with contract verification, token tracking, faucet, unlimited transactions" },
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
                "name": "How to set up an Arbitrum Sepolia testnet block explorer",
                "description": "Deploy a free hosted block explorer for Arbitrum Sepolia with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace." },
                    { "@type": "HowToStep", "name": "Connect Arbitrum Sepolia RPC", "text": "Paste the Arbitrum Sepolia RPC endpoint (https://sepolia-rollup.arbitrum.io/rpc)." },
                    { "@type": "HowToStep", "name": "Configure Orbit bridge", "text": "Enter testnet Rollup and Inbox contract addresses for retryable ticket tracking." },
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
                    { "@type": "ListItem", "position": 2, "name": "Arbitrum Sepolia", "item": "https://tryethernal.com/chains/arbitrum-sepolia" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Arbitrum Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Create a free workspace on Ethernal, paste the Arbitrum Sepolia RPC (https://sepolia-rollup.arbitrum.io/rpc), and optionally configure Orbit bridge addresses." } },
                    { "@type": "Question", "name": "What is the chain ID for Arbitrum Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Arbitrum Sepolia uses chain ID 421614. It settles on Sepolia (chain ID 11155111) and runs the same Nitro stack as Arbitrum One (chain ID 42161)." } },
                    { "@type": "Question", "name": "Does Ethernal support Orbit bridge features on Arbitrum Sepolia?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Configure your testnet Rollup and Inbox addresses and Ethernal tracks retryable tickets, assertions, and L1-to-L2 messages." } },
                    { "@type": "Question", "name": "Can I get free Arbitrum Sepolia ETH through Ethernal?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. The free Starter plan includes a built-in testnet faucet." } },
                    { "@type": "Question", "name": "Can I use the same setup for Arbitrum One mainnet?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Update your RPC URL and bridge contract addresses when moving to production. Everything else carries over." } }
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

/* Faucet */
.mock-faucet { text-align: left; }
.faucet-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.faucet-desc { color: var(--text-muted); font-size: 11px; margin-bottom: 16px; }
.faucet-amount { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); margin-bottom: 14px; }
.faucet-label { color: var(--text-muted); font-size: 11px; }
.faucet-val { color: var(--text-primary); font-weight: 600; font-size: 13px; }

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
}
</style>
