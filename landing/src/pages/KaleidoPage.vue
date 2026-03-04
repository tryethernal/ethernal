<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethernal + Kaleido</h1>
                <p style="color: #94A3B8; max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Add a public-facing block explorer to your Kaleido-managed blockchain. Just connect your Kaleido RPC endpoint.
                </p>
            </div>

            <FeatureSection inline-icon compact icon="mdi-link-variant" title="Connect Your Kaleido Node" description="Copy your Kaleido RPC URL from the console, paste it into Ethernal, and your explorer is live. Works with both public and permissioned Kaleido environments.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>app.ethernal.com/workspace/settings</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-settings">
                                <div class="mock-field"><div class="mock-field-label">RPC URL</div><div class="mock-field-input"><span class="mock-field-prefix"><v-icon size="12" style="color: #64748B;">mdi-link-variant</v-icon></span>https://u0xyz123-u0abc456-rpc.us0-aws.kaleido.io</div></div>
                                <div class="mock-field"><div class="mock-field-label">Chain ID</div><div class="mock-field-input">1337</div></div>
                                <div class="mock-status"><span class="status-dot connected"></span>Connected to Kaleido node</div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-web" title="Public Explorer for Your Network" description="Give your users and community a branded block explorer with your own domain, logo, and colors. Ethernal handles indexing, decoding, and presentation." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yournetwork.com</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-branding">
                                <div class="mock-brand-row"><span class="mock-brand-logo">YourChain</span><span class="mock-brand-badge">Custom Domain</span></div>
                                <div class="mock-brand-stats">
                                    <div class="mock-stat"><span class="mock-stat-label">Blocks</span><span class="mock-stat-val">142,847</span></div>
                                    <div class="mock-stat"><span class="mock-stat-label">Transactions</span><span class="mock-stat-val">1,203,581</span></div>
                                    <div class="mock-stat"><span class="mock-stat-label">Contracts</span><span class="mock-stat-val">2,941</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-check-decagram" title="Contract Verification & Interaction" description="Verify Solidity contracts and let users interact with them directly from the explorer. Read state, call functions, and track events with zero extra infrastructure.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yournetwork.com/address/0x5eF0…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-interact">
                                <div class="mock-verified-banner"><span class="mock-check">&#10003;</span>Contract Source Code Verified</div>
                                <div class="mock-interact-tabs"><span class="mock-tab active">Read</span><span class="mock-tab">Write</span></div>
                                <div class="mock-fn"><div class="mock-fn-header"><span class="mock-fn-idx">1.</span><span class="mock-fn-name">totalSupply</span><span class="mock-fn-sig">() → uint256</span></div><div class="mock-fn-result">1,000,000,000,000,000,000,000,000</div></div>
                                <div class="mock-fn"><div class="mock-fn-header"><span class="mock-fn-idx">2.</span><span class="mock-fn-name">symbol</span><span class="mock-fn-sig">() → string</span></div><div class="mock-fn-result">YCN</div></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-chart-line" title="Network Analytics" description="Monitor transaction throughput, gas usage, and block times. Get real-time visibility into your Kaleido network's health and activity." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yournetwork.com/analytics</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-analytics">
                                <div class="mock-analytics-row">
                                    <div class="mock-analytics-card"><span class="mock-analytics-label">Avg Block Time</span><span class="mock-analytics-value">2.1s</span><span class="mock-analytics-trend up">↓ 0.3s</span></div>
                                    <div class="mock-analytics-card"><span class="mock-analytics-label">Tx / Day</span><span class="mock-analytics-value">12,847</span><span class="mock-analytics-trend up">↑ 8.2%</span></div>
                                </div>
                                <div class="mock-chart">
                                    <div class="mock-chart-label">Transactions (7d)</div>
                                    <div class="mock-chart-bars">
                                        <div class="mock-bar" style="height: 40%;"></div>
                                        <div class="mock-bar" style="height: 55%;"></div>
                                        <div class="mock-bar" style="height: 70%;"></div>
                                        <div class="mock-bar" style="height: 45%;"></div>
                                        <div class="mock-bar" style="height: 80%;"></div>
                                        <div class="mock-bar" style="height: 65%;"></div>
                                        <div class="mock-bar" style="height: 90%;"></div>
                                    </div>
                                </div>
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
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); }
.browser-preview { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(61, 149, 206, 0.22); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4); }
.preview-header { background: #161B22; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(61, 149, 206, 0.12); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: rgba(11, 17, 32, 0.8); border-radius: 6px; padding: 4px 12px; color: #64748B; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; } .dot.red { background: #ff5f56; } .dot.yellow { background: #febc2e; } .dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Settings mock */
.mock-settings { display: flex; flex-direction: column; gap: 12px; }
.mock-field { display: flex; flex-direction: column; gap: 4px; }
.mock-field-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-field-input { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 6px; }
.mock-field-prefix { display: flex; align-items: center; }
.mock-status { display: flex; align-items: center; gap: 8px; color: #22C55E; font-size: 11px; font-weight: 500; margin-top: 4px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.connected { background: #22C55E; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

/* Branding mock */
.mock-branding { font-size: 12px; }
.mock-brand-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mock-brand-logo { color: #F1F5F9; font-weight: 700; font-size: 16px; font-family: 'Exo', sans-serif; }
.mock-brand-badge { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(61, 149, 206, 0.1); color: #5DAAE0; border: 1px solid rgba(61, 149, 206, 0.2); }
.mock-brand-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.mock-stat { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-stat-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-stat-val { color: #F1F5F9; font-size: 14px; font-weight: 600; }

/* Interact mock */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
.mock-check { font-size: 14px; }
.mock-interact-tabs { display: flex; gap: 0; margin-bottom: 12px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); }
.mock-tab { padding: 8px 16px; color: #64748B; font-size: 12px; font-weight: 500; border-bottom: 2px solid transparent; } .mock-tab.active { color: #3D95CE; border-bottom-color: #3D95CE; }
.mock-fn { background: rgba(11, 17, 32, 0.4); border: 1px solid rgba(61, 149, 206, 0.08); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
.mock-fn-header { display: flex; align-items: center; gap: 6px; }
.mock-fn-idx { color: #64748B; font-size: 11px; font-weight: 600; } .mock-fn-name { color: #5DAAE0; font-size: 12px; font-weight: 600; } .mock-fn-sig { color: #64748B; font-size: 11px; }
.mock-fn-result { margin-top: 8px; padding: 6px 10px; border-radius: 6px; background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.1); color: #22C55E; font-size: 11px; font-family: 'JetBrains Mono', monospace; }

/* Analytics mock */
.mock-analytics { font-size: 12px; }
.mock-analytics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.mock-analytics-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-analytics-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-analytics-value { color: #F1F5F9; font-size: 18px; font-weight: 600; }
.mock-analytics-trend { font-size: 10px; font-weight: 500; } .mock-analytics-trend.up { color: #22C55E; }
.mock-chart { padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-chart-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.mock-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 60px; }
.mock-bar { flex: 1; background: linear-gradient(180deg, #3D95CE, rgba(61, 149, 206, 0.3)); border-radius: 3px 3px 0 0; }
</style>
