<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethernal + Chainstack</h1>
                <p style="color: #94A3B8; max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Connect your Chainstack-hosted node and get a full block explorer in minutes. Perfect for dedicated and elastic nodes.
                </p>
            </div>

            <FeatureSection inline-icon compact icon="mdi-server" title="Works with Any Chainstack Node" description="Whether you're running a dedicated node, elastic API, or a custom network on Chainstack, Ethernal connects via standard JSON-RPC. Just paste your endpoint URL.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>app.tryethernal.com/workspace/settings</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-settings">
                                <div class="mock-field"><div class="mock-field-label">RPC URL</div><div class="mock-field-input"><span class="mock-field-prefix"><v-icon size="12" style="color: #64748B;">mdi-link-variant</v-icon></span>https://nd-123-456-789.p2pify.com/abc123</div></div>
                                <div class="mock-field"><div class="mock-field-label">Node Type</div><div class="mock-node-types"><span class="node-type active">Dedicated</span><span class="node-type">Elastic</span><span class="node-type">Archive</span></div></div>
                                <div class="mock-status"><span class="status-dot connected"></span>Connected to Chainstack node</div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-palette" title="Branded Explorer" description="Custom domain, logo, and color scheme. Give your Chainstack-powered network a professional block explorer that matches your brand identity." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>app.tryethernal.com/explorer/branding</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-branding-setup">
                                <div class="mock-field"><div class="mock-field-label">Explorer Name</div><div class="mock-field-input">MyChain Explorer</div></div>
                                <div class="mock-field"><div class="mock-field-label">Custom Domain</div><div class="mock-field-input">explorer.mychain.io</div></div>
                                <div class="mock-color-row">
                                    <div class="mock-field" style="flex: 1;"><div class="mock-field-label">Primary Color</div><div class="mock-color-swatch"><span class="swatch" style="background: #6366F1;"></span>#6366F1</div></div>
                                    <div class="mock-field" style="flex: 1;"><div class="mock-field-label">Background</div><div class="mock-color-swatch"><span class="swatch" style="background: #0F172A;"></span>#0F172A</div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-swap-horizontal" title="Token & NFT Support" description="Full ERC-20, ERC-721, and ERC-1155 token tracking. Display transfers, balances, and holder lists without any additional configuration.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.mychain.io/token-transfers</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-table">
                                <div class="mock-tbl-header"><span>Txn Hash</span><span>Type</span><span>From</span><span>To</span><span>Amount</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0x3a91…bc12</span><span><span class="type-badge erc20">ERC-20</span></span><span class="tbl-addr">0x7a25…f832</span><span class="tbl-addr">0xdac1…1ec7</span><span class="tbl-num">10,000 MCT</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0x8f22…1a22</span><span><span class="type-badge nft">ERC-721</span></span><span class="tbl-addr">0x4e99…9f33</span><span class="tbl-addr">0x2b87…e451</span><span class="tbl-num">#1204</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0xc7f1…ee90</span><span><span class="type-badge erc1155">ERC-1155</span></span><span class="tbl-addr">0xdac1…1ec7</span><span class="tbl-addr">0x7a25…f832</span><span class="tbl-num">50x ID#3</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-shield-check" title="Production Ready" description="Real-time block syncing, contract verification, analytics dashboards, and WebSocket updates. Everything you need for a production-grade explorer." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.mychain.io</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-dashboard">
                                <div class="mock-dash-grid">
                                    <div class="mock-dash-card"><span class="mock-dash-label">Latest Block</span><span class="mock-dash-val">#4,291,847</span><span class="mock-dash-sub"><span class="live-dot"></span>Live</span></div>
                                    <div class="mock-dash-card"><span class="mock-dash-label">Total Txns</span><span class="mock-dash-val">18.4M</span></div>
                                    <div class="mock-dash-card"><span class="mock-dash-label">Verified Contracts</span><span class="mock-dash-val">1,247</span></div>
                                    <div class="mock-dash-card"><span class="mock-dash-label">Uptime</span><span class="mock-dash-val">99.97%</span></div>
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
.mock-node-types { display: flex; gap: 6px; }
.node-type { padding: 6px 14px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.08); color: #64748B; font-size: 11px; font-weight: 500; }
.node-type.active { background: rgba(61, 149, 206, 0.12); border-color: rgba(61, 149, 206, 0.3); color: #5DAAE0; }
.mock-status { display: flex; align-items: center; gap: 8px; color: #22C55E; font-size: 11px; font-weight: 500; margin-top: 4px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.connected { background: #22C55E; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }

/* Branding setup mock */
.mock-branding-setup { display: flex; flex-direction: column; gap: 12px; }
.mock-color-row { display: flex; gap: 10px; }
.mock-color-swatch { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 8px; }
.swatch { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }

/* Token table mock */
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; grid-template-columns: 1.2fr 0.7fr 1fr 1fr 1fr; gap: 4px; font-size: 11px; align-items: center; }
.mock-tbl-header { color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 4px; }
.mock-tbl-row { padding: 8px 0; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }
.tbl-hash { color: #5DAAE0; } .tbl-addr { color: #94A3B8; font-size: 11px; } .tbl-num { color: #F1F5F9; }
.type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.type-badge.erc20 { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.type-badge.nft { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }
.type-badge.erc1155 { background: rgba(251, 191, 36, 0.1); color: #FBBF24; border: 1px solid rgba(251, 191, 36, 0.2); }

/* Dashboard mock */
.mock-dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mock-dash-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-dash-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-dash-val { color: #F1F5F9; font-size: 16px; font-weight: 600; }
.mock-dash-sub { display: flex; align-items: center; gap: 6px; color: #22C55E; font-size: 10px; font-weight: 500; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
