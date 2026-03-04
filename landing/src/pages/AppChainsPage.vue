<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">USE CASE</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Built for App Chains</h1>
                <p style="color: #94A3B8; max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    White-label explorer for Orbit, OP Stack, or custom EVM chains. Full branding, bridge support, and status monitoring.
                </p>
            </div>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-palette"
                title="Full White-Label Branding"
                description="Custom logo, colors, fonts, domain, and page title. Your explorer is indistinguishable from a first-party product. Users see your brand, not ours."
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
                                <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                explorer.yourchain.com/settings
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-branding">
                                <div class="mock-field">
                                    <span class="mock-field-label">Explorer Name</span>
                                    <div class="mock-field-input">YourChain Explorer</div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Logo</span>
                                    <div class="mock-logo-upload">
                                        <span style="color: #22C55E; font-size: 11px;">&#10003; logo.svg uploaded</span>
                                    </div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Theme Colors</span>
                                    <div class="mock-color-row">
                                        <div class="mock-color-swatch"><span class="swatch" style="background: #6366F1;"></span>#6366F1</div>
                                        <div class="mock-color-swatch"><span class="swatch" style="background: #0F172A;"></span>#0F172A</div>
                                        <div class="mock-color-swatch"><span class="swatch" style="background: #22C55E;"></span>#22C55E</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-bridge"
                title="L2 Bridge Monitoring"
                description="Built-in support for Arbitrum Orbit and OP Stack bridges. Track deposits, withdrawals, batch submissions, and fault proofs between L1 and L2 with dedicated views."
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
                                <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                explorer.yourchain.com/deposits
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-table">
                                <div class="mock-tbl-header">
                                    <span>L1 Tx</span>
                                    <span>From</span>
                                    <span>Value</span>
                                    <span>Status</span>
                                </div>
                                <div class="mock-tbl-row">
                                    <span class="tbl-hash">0x8a12...f3e1</span>
                                    <span class="tbl-addr">0x71C7...656F</span>
                                    <span class="tbl-num">2.5 ETH</span>
                                    <span class="status-chip success">Relayed</span>
                                </div>
                                <div class="mock-tbl-row">
                                    <span class="tbl-hash">0x3b7c...a902</span>
                                    <span class="tbl-addr">0xdac1...1ec7</span>
                                    <span class="tbl-num">100 USDC</span>
                                    <span class="status-chip success">Relayed</span>
                                </div>
                                <div class="mock-tbl-row">
                                    <span class="tbl-hash">0xf291...8d04</span>
                                    <span class="tbl-addr">0x5eF0...c3A1</span>
                                    <span class="tbl-num">0.1 ETH</span>
                                    <span class="status-chip pending">Pending</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-chart-bar"
                title="Status Page & Total Supply"
                description="Public status page showing sync health and RPC uptime. Display your native token total supply directly on the explorer. Give your community real-time network visibility."
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
                                <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                explorer.yourchain.com/status
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-analytics-row">
                                <div class="mock-analytics-card">
                                    <span class="mock-analytics-label">Total Supply</span>
                                    <span class="mock-analytics-value">1,000,000 MYT</span>
                                </div>
                                <div class="mock-analytics-card">
                                    <span class="mock-analytics-label">Sync Status</span>
                                    <span class="mock-analytics-value" style="color: #22C55E;">Healthy</span>
                                </div>
                                <div class="mock-analytics-card">
                                    <span class="mock-analytics-label">RPC Uptime</span>
                                    <span class="mock-analytics-value">99.9%</span>
                                </div>
                            </div>
                            <div class="mock-chart">
                                <span class="mock-chart-label">Transactions (7d)</span>
                                <div class="mock-chart-bars">
                                    <div class="mock-bar" style="height: 65%;"></div>
                                    <div class="mock-bar" style="height: 80%;"></div>
                                    <div class="mock-bar" style="height: 45%;"></div>
                                    <div class="mock-bar" style="height: 90%;"></div>
                                    <div class="mock-bar" style="height: 70%;"></div>
                                    <div class="mock-bar" style="height: 55%;"></div>
                                    <div class="mock-bar" style="height: 100%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-image-multiple"
                title="NFT Gallery"
                description="Full ERC-721 and ERC-1155 support with rich media previews. Display collections, individual tokens, transfer history, and ownership out of the box."
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
                                <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                explorer.yourchain.com/token/0x3b7c...
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-nft-grid">
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #6366F1, #8B5CF6);"></div><div class="mock-nft-info"><span class="mock-nft-name">Founder #42</span><span class="mock-nft-owner">0x71C7...656F</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #3D95CE, #22C55E);"></div><div class="mock-nft-info"><span class="mock-nft-name">Founder #108</span><span class="mock-nft-owner">0xdac1...1ec7</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #EF4444, #FBBF24);"></div><div class="mock-nft-info"><span class="mock-nft-name">Founder #255</span><span class="mock-nft-owner">0x5eF0...c3A1</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #F59E0B, #10B981);"></div><div class="mock-nft-info"><span class="mock-nft-name">Founder #301</span><span class="mock-nft-owner">0x8a12...f3e1</span></div></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-flash"
                title="Ready in 5 Minutes"
                description="No complex infrastructure to provision. Ethernal needs just your RPC URL. Create an account, paste your endpoint, and your explorer is live. 5M transaction quota included on the App Chain plan."
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
                                <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                app.tryethernal.com/explorer/new
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-settings">
                                <div class="mock-field">
                                    <span class="mock-field-label">Chain Name</span>
                                    <div class="mock-field-input">YourChain Mainnet</div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">RPC URL</span>
                                    <div class="mock-field-input">https://rpc.yourchain.com</div>
                                </div>
                                <div class="mock-field">
                                    <span class="mock-field-label">Chain ID</span>
                                    <div class="mock-field-input">42170</div>
                                </div>
                                <div class="mock-create-btn">Create Explorer</div>
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
.page-title-bar {
    padding-bottom: 24px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(61, 149, 206, 0.1);
}
.browser-preview { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(61, 149, 206, 0.22); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4); }
.preview-header { background: #161B22; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(61, 149, 206, 0.12); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: rgba(11, 17, 32, 0.8); border-radius: 6px; padding: 4px 12px; color: #64748B; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }

/* Settings */
.mock-settings { display: flex; flex-direction: column; gap: 12px; }
.mock-field { display: flex; flex-direction: column; gap: 4px; }
.mock-field-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-field-input { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }

/* Branding */
.mock-branding { display: flex; flex-direction: column; gap: 12px; }
.mock-logo-upload { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(34, 197, 94, 0.15); }
.mock-color-row { display: flex; gap: 10px; }
.mock-color-swatch { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 8px; }
.swatch { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }

/* Table */
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; grid-template-columns: 1fr 1fr 0.8fr 0.8fr; gap: 4px; font-size: 11px; align-items: center; }
.mock-tbl-header { color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 4px; }
.mock-tbl-row { padding: 8px 0; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }
.tbl-hash { color: #5DAAE0; } .tbl-addr { color: #94A3B8; font-size: 11px; } .tbl-num { color: #F1F5F9; }

/* Status chips */
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-chip.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.2); }

/* Analytics */
.mock-analytics-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.mock-analytics-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-analytics-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-analytics-value { color: #F1F5F9; font-size: 16px; font-weight: 600; }
.mock-chart { padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-chart-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.mock-chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
.mock-bar { flex: 1; background: linear-gradient(180deg, #3D95CE, rgba(61, 149, 206, 0.3)); border-radius: 3px 3px 0 0; }

/* NFT gallery */
.mock-nft-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
.mock-nft { border-radius: 10px; overflow: hidden; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-nft-img { height: 80px; }
.mock-nft-info { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
.mock-nft-name { color: #F1F5F9; font-size: 11px; font-weight: 600; }
.mock-nft-owner { color: #64748B; font-size: 10px; }

/* Create button */
.mock-create-btn { padding: 10px 16px; border-radius: 8px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: white; font-size: 12px; font-weight: 600; text-align: center; margin-top: 4px; }
</style>
