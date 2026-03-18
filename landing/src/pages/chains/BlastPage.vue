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
                    <span class="current">Blast</span>
                </nav>
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">L2 ROLLUP · OP STACK</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Explorer for Blast</h1>
                <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem;">
                            Ethernal is a hosted block explorer for Blast (chain ID 81457) that connects to your RPC endpoint and provides real-time transaction decoding, contract verification, and yield tracking. Blast is an OP Stack L2 with native yield: ETH earns approximately 4% and stablecoins earn approximately 5% through auto-rebasing. Deploy a full-featured explorer in under 5 minutes.
                        </p>
                <div class="chain-stats-strip" style="--chain-color: 252, 255, 7;">
                    <div class="chain-stat"><img src="/images/chains/blast.svg" alt="" class="chain-stat-logo" /><span class="chain-stat-label">Chain ID</span> <span class="chain-stat-value">81457</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Framework</span> <span class="chain-stat-value">OP Stack</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Parent</span> <span class="chain-stat-value">Ethereum</span></div>
                    <div class="chain-stat"><span class="chain-stat-label">Token</span> <span class="chain-stat-value">ETH</span></div>
                </div>
            </div>

            <!-- Yield claim decoding -->
            <div class="my-12">
    <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-percent-outline"
                    title="Decoded Yield Claim Transactions"
                    description="Blast's native yield comes from ETH staking (via Lido) and T-Bill protocols (via MakerDAO's DAI Savings Rate) on L1. When contracts or users claim yield through the Blast yield contract (0x4300000000000000000000000000000000000002), Ethernal decodes the full transaction: claim amount, claimable balance, and the underlying rebasing mechanism."
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
                                    explorer.blast.example/tx/0x7f91…c482
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-trace">
                                    <div class="d-flex justify-space-between align-center mb-3">
                                        <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                        <span class="status-chip success">Success</span>
                                    </div>
                                    <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x4300…0002</span><span class="trace-method">claimAllYield(address,address)</span></div>
                                    <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x4300…0002</span><span class="trace-method">readClaimableYield(address)</span></div>
                                    <div class="trace-node indent"><span class="trace-op event">LOG</span><span class="trace-method">YieldClaimed(account: 0x91a3…e7f2, recipient: 0x91a3…e7f2, amount: 2847000000000000000)</span></div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>
            </div>

            <!-- Balance with yield -->
            <div class="my-12">
    <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-chart-line"
                    title="Rebasing Balance Tracking"
                    description="On Blast, ETH and USDB (the native stablecoin) balances auto-rebase to reflect accrued yield. Ethernal tracks balance changes including yield accrual, so you can see both the base balance and the yield component for any address. For smart contracts that opt into automatic yield mode, the balance grows every block."
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
                                    explorer.blast.example/address/0x91a3…e7f2
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-balance">
                                    <div class="balance-title">Address Balance</div>
                                    <div class="balance-grid">
                                        <div class="balance-card">
                                            <span class="balance-label">ETH Balance</span>
                                            <span class="balance-value">14.2847 ETH</span>
                                            <span class="balance-yield">+0.1284 ETH yield accrued</span>
                                        </div>
                                        <div class="balance-card">
                                            <span class="balance-label">USDB Balance</span>
                                            <span class="balance-value">52,418.72 USDB</span>
                                            <span class="balance-yield">+892.41 USDB yield accrued</span>
                                        </div>
                                    </div>
                                    <div class="balance-meta">
                                        <div class="meta-row">
                                            <span class="meta-key">Yield Mode</span>
                                            <span class="meta-val yield-auto">Automatic</span>
                                        </div>
                                        <div class="meta-row">
                                            <span class="meta-key">Gas Mode</span>
                                            <span class="meta-val">Claimable</span>
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
                { icon: 'mdi-check-decagram', title: 'Contract Verification', description: 'Verify Solidity source, read and write contract state from the UI' },
                { icon: 'mdi-arrow-up-bold-circle-outline', title: 'Withdrawal Tracking', description: 'Full L2-to-L1 withdrawal lifecycle with challenge period monitoring' },
                { icon: 'mdi-bug', title: 'Call Traces', description: 'Full execution traces with nested internal calls and revert reasons' },
                { icon: 'mdi-web', title: 'Custom Domain', description: 'Your brand, your domain, full whitelabel on paid plans' }
            ]" />


            <!-- Setup walkthrough -->
            <section class="setup-section my-16">
                <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    How to Set Up a Blast Block Explorer
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
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Connect your Blast RPC</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Paste your Blast RPC endpoint. For Blast mainnet, use <code class="code-inline">https://rpc.blast.io</code> or any supported provider like Alchemy or QuickNode.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">3</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Configure OP Stack bridge monitoring</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Enter your OptimismPortal and Batch Inbox addresses for Blast. Ethernal starts monitoring deposits, withdrawals, and batches automatically.</p>
                        </div>
                    </div>
                    <div class="setup-step">
                        <div class="step-number">4</div>
                        <div>
                            <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 4px;">Go live</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">Point your custom domain (e.g. <code class="code-inline">explorer.blast.example</code>) to your Ethernal workspace. Your explorer is live with yield tracking, contract verification, and bridge monitoring.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Comparison section -->
            <section class="comparison-section my-16">
                <h2 class="font-heading text-white mb-4" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
                    Blast Explorer Options Compared
                </h2>
                <p class="mb-8" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; max-width: 600px;">
                    Teams building on Blast typically choose between Blastscan (official, Etherscan-operated), Blockscout, or Ethernal (hosted with OP Stack-native features and yield visibility).
                </p>
                <div class="comparison-table">
                    <div class="comp-row comp-header">
                        <span>Feature</span>
                        <span>Ethernal</span>
                        <span>Blastscan</span>
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
                        <span class="comp-yes">Yes</span>
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
                    Pricing for Blast Explorers
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
                        <h3 class="faq-q">How do I set up a block explorer for Blast?</h3>
                        <p class="faq-a">Create a workspace on Ethernal, paste your Blast RPC endpoint (e.g. <code class="code-inline">https://rpc.blast.io</code>), configure the OP Stack bridge addresses, and point your custom domain. The whole process takes under 5 minutes.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">How does Blast's native yield work?</h3>
                        <p class="faq-a">Blast deposits user ETH into Lido (stETH) and stablecoins into MakerDAO's DAI Savings Rate on Ethereum L1. The yield is passed back to L2 users through auto-rebasing tokens. ETH earns approximately 4% and USDB (Blast's native stablecoin) earns approximately 5%. Contracts can configure their yield mode to Automatic (balance grows), Claimable (claim manually), or Void (no yield).</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Can I use Ethernal as a Blastscan alternative?</h3>
                        <p class="faq-a">Yes. If you are running a fork of Blast or building a DeFi protocol that needs a private explorer, Ethernal gives you a whitelabel explorer with your own domain, branding, and built-in OP Stack bridge monitoring.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">What is Blast's withdrawal period?</h3>
                        <p class="faq-a">Blast uses a 14-day withdrawal challenge period (compared to the standard 7 days on most OP Stack chains). Ethernal tracks each phase of the withdrawal lifecycle: initiation, state proposal, challenge window, proving, and finalization on Ethereum.</p>
                    </div>
                    <div class="faq-item">
                        <h3 class="faq-q">Does Blast share gas revenue with developers?</h3>
                        <p class="faq-a">Yes. Blast shares net gas revenue with smart contract developers through the Blast precompile (0x4300000000000000000000000000000000000001). Contracts configure their gas mode and can claim accumulated gas revenue. Ethernal decodes all gas configuration and claim transactions.</p>
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
    title: 'Block Explorer for Blast — Ethernal',
    meta: [
        { name: 'description', content: 'Hosted block explorer for Blast (OP Stack). Native yield tracking, gas revenue decoding, contract verification, L2-to-L1 withdrawal monitoring, and rebasing balance visibility.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Explorer for Blast — Ethernal' },
        { property: 'og:description', content: 'Hosted block explorer for Blast (OP Stack). Native yield tracking, gas revenue decoding, contract verification, L2-to-L1 withdrawal monitoring, and rebasing balance visibility.' },
        { property: 'og:url', content: 'https://tryethernal.com/chains/blast' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-chains-blast.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/chains/blast' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Ethernal Block Explorer for Blast",
                "description": "Hosted block explorer for Blast with native yield tracking, gas revenue decoding, contract verification, L2-to-L1 withdrawal monitoring, and rebasing balance visibility.",
                "brand": { "@type": "Organization", "name": "Ethernal" },
                "url": "https://tryethernal.com/chains/blast",
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
                "name": "How to set up a block explorer for Blast",
                "description": "Deploy a hosted block explorer for Blast in under 5 minutes with Ethernal.",
                "step": [
                    { "@type": "HowToStep", "name": "Create a workspace", "text": "Sign up at app.tryethernal.com and create a new workspace with Public Explorer type." },
                    { "@type": "HowToStep", "name": "Connect your Blast RPC", "text": "Paste your Blast RPC endpoint (e.g. https://rpc.blast.io) into the workspace settings." },
                    { "@type": "HowToStep", "name": "Configure OP Stack bridge", "text": "Enter the OptimismPortal and Batch Inbox addresses for Blast." },
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
                    { "@type": "ListItem", "position": 3, "name": "Blast", "item": "https://tryethernal.com/chains/blast" }
                ]
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                    { "@type": "Question", "name": "How do I set up a block explorer for Blast?", "acceptedAnswer": { "@type": "Answer", "text": "Create a workspace on Ethernal, paste your Blast RPC endpoint, configure the OP Stack bridge addresses, and point your custom domain. The process takes under 5 minutes." } },
                    { "@type": "Question", "name": "How does Blast's native yield work?", "acceptedAnswer": { "@type": "Answer", "text": "Blast deposits ETH into Lido and stablecoins into MakerDAO's DSR on L1. Yield is passed back through auto-rebasing tokens. ETH earns ~4% and USDB earns ~5%." } },
                    { "@type": "Question", "name": "Can I use Ethernal as a Blastscan alternative?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Ethernal gives you a whitelabel explorer with your own domain, branding, and built-in OP Stack bridge monitoring." } },
                    { "@type": "Question", "name": "What is Blast's withdrawal period?", "acceptedAnswer": { "@type": "Answer", "text": "Blast uses a 14-day withdrawal challenge period. Ethernal tracks each phase of the withdrawal lifecycle in real time." } },
                    { "@type": "Question", "name": "Does Blast share gas revenue with developers?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Blast shares net gas revenue through the Blast precompile. Contracts configure gas mode and claim accumulated revenue. Ethernal decodes all gas transactions." } }
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

/* Balance mockup */
.balance-title { color: var(--text-primary); font-weight: 600; font-size: 14px; margin-bottom: 16px; }
.balance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.balance-card { display: flex; flex-direction: column; gap: 4px; padding: 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.balance-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.balance-value { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.balance-yield { color: #22C55E; font-size: 11px; font-weight: 500; }
.balance-meta { display: flex; flex-direction: column; gap: 8px; }
.meta-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.meta-key { color: var(--text-muted); font-size: 11px; }
.meta-val { color: var(--text-secondary); font-size: 11px; font-weight: 500; }
.meta-val.yield-auto { color: #22C55E; }

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
    .comp-row { grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr; font-size: 11px; padding: 10px 12px; }
    .step { min-width: 55px; }
    .step-label { font-size: 8px; }
    .step-line { width: 16px; }
    .balance-grid { grid-template-columns: 1fr; }
}
</style>
