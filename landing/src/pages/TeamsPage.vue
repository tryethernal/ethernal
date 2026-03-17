<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">USE CASE</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Built for Teams</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Give your whole team visibility into your blockchain with custom domains, shared access, and no ads.
                </p>
            </div>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-web"
                title="Custom Domains"
                description="Run your explorer on your own domain. SSL certificates are provisioned automatically. Your users get a branded, professional experience that builds trust."
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
                                explorer.yourchain.com
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-settings">
                                <div class="mock-field">
                                    <span class="mock-field-label">Domain</span>
                                    <div class="mock-field-input">explorer.yourchain.com</div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">SSL Status</span>
                                    <div class="d-flex align-center ga-2">
                                        <span class="status-chip success">Active</span>
                                        <span style="color: var(--text-muted); font-size: 11px;">Auto-provisioned</span>
                                    </div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Native Token</span>
                                    <div class="mock-field-input">MYT</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-account-group"
                title="Shared Access"
                description="Everyone on your team sees the same data. No more sharing screenshots or hex strings in Slack. Point your team to one URL and let them explore blocks, transactions, and contracts together."
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
                                explorer.yourchain.com/tx/0xab3f...
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Transaction Details</span>
                                <span class="status-chip success">Success</span>
                            </div>
                            <div class="mock-details">
                                <div class="mock-detail-row"><span class="mock-detail-label">Hash</span><span class="mock-detail-val hash">0xab3f...c912</span></div>
                                <div class="mock-detail-row"><span class="mock-detail-label">From</span><span class="mock-detail-val hash">0x71C7...656F</span></div>
                                <div class="mock-detail-row"><span class="mock-detail-label">To</span><span class="mock-detail-val hash">0xdac1...1ec7</span></div>
                                <div class="mock-detail-row"><span class="mock-detail-label">Method</span><span class="mock-detail-val"><span class="method-badge">transfer(address,uint256)</span></span></div>
                                <div class="mock-detail-row"><span class="mock-detail-label">Value</span><span class="mock-detail-val">0.5 MYT</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-eye-off"
                title="No Ads"
                description="Team plan removes all third-party ads from your explorer. Your users see a clean, distraction-free interface focused entirely on your chain data."
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
                                explorer.yourchain.com
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-clean-ui">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Latest Blocks</span>
                                    <span class="status-chip info">100k tx quota</span>
                                </div>
                                <div class="mock-block-list">
                                    <div class="mock-block"><span class="block-num">#1,204</span><span class="block-txns">3 txns</span><span class="block-time">just now</span></div>
                                    <div class="mock-block"><span class="block-num">#1,203</span><span class="block-txns">7 txns</span><span class="block-time">12s ago</span></div>
                                    <div class="mock-block"><span class="block-num">#1,202</span><span class="block-txns">2 txns</span><span class="block-time">24s ago</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-faucet"
                title="Built-in Testnet Faucet"
                description="Let your users claim test tokens directly from the explorer. Configure the amount and interval. No separate faucet infrastructure needed."
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
                                explorer.yourchain.com/faucet
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-settings">
                                <div style="color: var(--text-primary); font-weight: 600; font-size: 13px; margin-bottom: 12px;">Testnet Faucet</div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Your Address</span>
                                    <div class="mock-field-input">0x71C7...656F</div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Amount</span>
                                    <div class="mock-field-input">1.0 MYT</div>
                                </div>
                                <div class="mock-faucet-btn">Request Tokens</div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'For Teams — Ethernal Block Explorer',
    meta: [
        { name: 'description', content: 'Custom branding, team access controls, and dedicated support. Ethernal scales with your blockchain project.' },
        { property: 'og:title', content: 'For Teams — Ethernal Block Explorer' },
        { property: 'og:description', content: 'Custom branding, team access controls, and dedicated support. Ethernal scales with your blockchain project.' },
        { property: 'og:url', content: 'https://tryethernal.com/teams' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/teams' }
    ],
    script: [
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": "For Teams — Ethernal Block Explorer",
                "description": "Custom branding, team access controls, and dedicated support. Ethernal scales with your blockchain project.",
                "url": "https://tryethernal.com/teams"
            })
        },
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tryethernal.com/" },
                    { "@type": "ListItem", "position": 2, "name": "Teams", "item": "https://tryethernal.com/teams" }
                ]
            })
        }
    ]
});
</script>

<style scoped>
.page-title-bar {
    padding-bottom: 24px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--drawer-divider);
}
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Settings */
.mock-settings { display: flex; flex-direction: column; gap: 12px; }
.mock-field { display: flex; flex-direction: column; gap: 4px; }
.mock-field-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-field-input { padding: 8px 12px; border-radius: 6px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }

/* Transaction details */
.mock-details { display: flex; flex-direction: column; gap: 0; }
.mock-detail-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--drawer-divider); }
.mock-detail-label { color: var(--text-muted); font-size: 11px; min-width: 70px; }
.mock-detail-val { color: #CBD5E1; font-size: 11px; }
.mock-detail-val.hash { color: #5DAAE0; }
.method-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(61, 149, 206, 0.12); color: #5DAAE0; border: 1px solid rgba(61, 149, 206, 0.25); }

/* Block list */
.mock-block-list { display: flex; flex-direction: column; gap: 0; }
.mock-block { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--drawer-divider); }
.block-num { color: #5DAAE0; font-size: 12px; font-weight: 600; }
.block-txns { color: var(--text-secondary); font-size: 11px; }
.block-time { color: var(--text-muted); font-size: 11px; }

/* Status chips */
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-chip.info { background: rgba(61, 149, 206, 0.1); color: #5DAAE0; border: 1px solid rgba(61, 149, 206, 0.2); }

/* Faucet */
.mock-faucet-btn { padding: 10px 16px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: white; font-size: 12px; font-weight: 600; text-align: center; margin-top: 4px; }
</style>
