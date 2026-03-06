<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FEATURES</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Everything you need to explore your chain</h1>
                <p style="color: #94A3B8; max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    From transaction decoding to contract verification, Ethernal provides a complete toolkit for understanding your blockchain.
                </p>
            </div>

            <!-- Real-time Updates -->
            <FeatureSection inline-icon compact icon="mdi-lightning-bolt" title="Real-time Updates" description="New blocks and transactions appear instantly via WebSocket. No manual refresh needed. Your explorer data is always current, whether you're monitoring a local dev chain or a live production network.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <span style="color: #F1F5F9; font-weight: 600; font-size: 13px;">Latest Blocks</span>
                                <span class="live-badge"><span class="live-dot-anim"></span>Live</span>
                            </div>
                            <div class="mock-block-list">
                                <div class="mock-block new-block"><span class="block-num">#4,291,848</span><span class="block-txns">3 txns</span><span class="block-time">just now</span></div>
                                <div class="mock-block"><span class="block-num">#4,291,847</span><span class="block-txns">7 txns</span><span class="block-time">12s ago</span></div>
                                <div class="mock-block"><span class="block-num">#4,291,846</span><span class="block-txns">2 txns</span><span class="block-time">24s ago</span></div>
                                <div class="mock-block"><span class="block-num">#4,291,845</span><span class="block-txns">5 txns</span><span class="block-time">36s ago</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Transaction Tracing -->
            <FeatureSection inline-icon compact icon="mdi-file-tree" title="Transaction Tracing" description="Debug transactions with full call traces, state diffs, and event logs. See exactly which function reverted, what parameters were passed, and where things went wrong. Supports debug_traceTransaction for compatible nodes." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/tx/0x1b14…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <span style="color: #F1F5F9; font-weight: 600; font-size: 13px;">Call Trace</span>
                                <span class="status-chip success">Success</span>
                            </div>
                            <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x7a25…f832</span><span class="trace-method">swap(uint256,address)</span><span class="trace-gas">45,230 gas</span></div>
                            <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x1f98…4e23</span><span class="trace-method">getReserves()</span><span class="trace-gas">2,100 gas</span></div>
                            <div class="trace-node indent"><span class="trace-op call">CALL</span><span class="trace-addr">0xdac1…1ec7</span><span class="trace-method">transfer(address,uint256)</span><span class="trace-gas">12,450 gas</span></div>
                            <div class="trace-node indent-2"><span class="trace-op log">LOG</span><span class="trace-method">Transfer(from, to, value)</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Contract Verification -->
            <FeatureSection inline-icon compact icon="mdi-check-decagram" title="Contract Verification" description="Verify and interact with smart contracts directly. Upload Solidity or Vyper source code and Ethernal matches it against deployed bytecode. Once verified, all transactions are decoded automatically.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/address/0x5eF0…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-verified-banner"><span class="mock-check">&#10003;</span>Contract Source Code Verified</div>
                            <div class="mock-meta-grid">
                                <div class="mock-meta-item"><span class="mock-meta-label">Contract Name</span><span class="mock-meta-val">SwapRouter</span></div>
                                <div class="mock-meta-item"><span class="mock-meta-label">Compiler</span><span class="mock-meta-val">v0.8.20</span></div>
                                <div class="mock-meta-item"><span class="mock-meta-label">Optimization</span><span class="mock-meta-val">Yes (200 runs)</span></div>
                                <div class="mock-meta-item"><span class="mock-meta-label">EVM Version</span><span class="mock-meta-val">paris</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Contract Interaction -->
            <FeatureSection inline-icon compact icon="mdi-code-braces" title="Contract Interaction" description="Read and write to verified contracts directly from the explorer. Connect your wallet and call any function with a simple form UI. No need to write scripts or use the CLI." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/address/0x7a25…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-interact-tabs"><span class="mock-tab">Read</span><span class="mock-tab active">Write</span></div>
                            <div class="mock-fn">
                                <div class="mock-fn-header"><span class="mock-fn-idx">1.</span><span class="mock-fn-name">transfer</span><span class="mock-fn-sig">(address, uint256)</span></div>
                                <div class="mock-fn-fields">
                                    <div class="mock-fn-field"><div class="mock-fn-label">recipient (address)</div><div class="mock-fn-input">0xdac1…1ec7</div></div>
                                    <div class="mock-fn-field"><div class="mock-fn-label">amount (uint256)</div><div class="mock-fn-input">1000000000000000000</div></div>
                                </div>
                                <div class="mock-fn-btn">Write</div>
                            </div>
                            <div class="mock-fn collapsed"><div class="mock-fn-header"><span class="mock-fn-idx">2.</span><span class="mock-fn-name">approve</span><span class="mock-fn-sig">(address, uint256)</span></div></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Analytics Dashboard -->
            <FeatureSection inline-icon compact icon="mdi-chart-line" title="Analytics Dashboard" description="Track gas usage trends, transaction volume, active addresses, and more. Built-in charts give you real-time visibility into your chain's health and activity patterns.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/analytics</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-analytics-row">
                                <div class="mock-analytics-card"><span class="mock-analytics-label">Avg Block Time</span><span class="mock-analytics-value">2.1s</span></div>
                                <div class="mock-analytics-card"><span class="mock-analytics-label">Tx / Day</span><span class="mock-analytics-value">12,847</span></div>
                                <div class="mock-analytics-card"><span class="mock-analytics-label">Avg Gas Price</span><span class="mock-analytics-value">0.1 gwei</span></div>
                            </div>
                            <div class="mock-chart">
                                <div class="mock-chart-label">Transactions (14d)</div>
                                <div class="mock-chart-bars">
                                    <div class="mock-bar" style="height: 30%;"></div>
                                    <div class="mock-bar" style="height: 45%;"></div>
                                    <div class="mock-bar" style="height: 60%;"></div>
                                    <div class="mock-bar" style="height: 40%;"></div>
                                    <div class="mock-bar" style="height: 75%;"></div>
                                    <div class="mock-bar" style="height: 55%;"></div>
                                    <div class="mock-bar" style="height: 85%;"></div>
                                    <div class="mock-bar" style="height: 70%;"></div>
                                    <div class="mock-bar" style="height: 50%;"></div>
                                    <div class="mock-bar" style="height: 90%;"></div>
                                    <div class="mock-bar" style="height: 65%;"></div>
                                    <div class="mock-bar" style="height: 80%;"></div>
                                    <div class="mock-bar" style="height: 95%;"></div>
                                    <div class="mock-bar" style="height: 75%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Custom Branding -->
            <FeatureSection inline-icon compact icon="mdi-palette" title="Custom Branding" description="Your logo, colors, domain, and theme. Make the explorer indistinguishable from a first-party product. Supports custom CSS for full control." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>app.ethernal.com/explorer/branding</div><div style="width: 42px;"></div></div>
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

            <!-- L2 Bridge Support -->
            <FeatureSection inline-icon compact icon="mdi-bridge" title="L2 Bridge Support" description="Full bridge visibility for Arbitrum Orbit and OP Stack chains. Track deposits, withdrawals, and batches with real-time status updates. Set up with just a few contract addresses.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/deposits</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div style="color: #F1F5F9; font-weight: 600; font-size: 13px; margin-bottom: 12px;">Recent Deposits</div>
                            <div class="mock-table">
                                <div class="mock-tbl-header"><span>L1 Block</span><span>L2 Tx</span><span>Value</span><span>Status</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">#19,847,231</span><span class="tbl-addr">0x1b14…25d5</span><span class="tbl-num">0.5 ETH</span><span><span class="status-chip success">Relayed</span></span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">#19,847,228</span><span class="tbl-addr">0x8f22…1a22</span><span class="tbl-num">1,000 USDC</span><span><span class="status-chip pending">Pending</span></span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">#19,847,225</span><span class="tbl-addr">0x4e99…9f33</span><span class="tbl-num">2.0 ETH</span><span><span class="status-chip success">Relayed</span></span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- NFT Gallery -->
            <FeatureSection inline-icon compact icon="mdi-image-multiple" title="NFT Gallery" description="Browse ERC-721 and ERC-1155 collections with visual galleries, metadata display, and ownership history. See token images, attributes, and transfer history at a glance." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/nft/collection</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-nft-grid">
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #6366F1, #A855F7);"></div><div class="mock-nft-info"><span class="mock-nft-name">#7804</span><span class="mock-nft-owner">0x7a25…f832</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #3D95CE, #22C55E);"></div><div class="mock-nft-info"><span class="mock-nft-name">#3100</span><span class="mock-nft-owner">0xdac1…1ec7</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #EF4444, #FBBF24);"></div><div class="mock-nft-info"><span class="mock-nft-name">#5217</span><span class="mock-nft-owner">0x4e99…9f33</span></div></div>
                                <div class="mock-nft"><div class="mock-nft-img" style="background: linear-gradient(135deg, #10B981, #3B82F6);"></div><div class="mock-nft-info"><span class="mock-nft-name">#8888</span><span class="mock-nft-owner">0x2b87…e451</span></div></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- Token Transfers -->
            <FeatureSection inline-icon compact icon="mdi-swap-horizontal" title="Token Transfers" description="Track ERC-20, ERC-721, and ERC-1155 transfers with full token metadata. Display sender, recipient, amount, and token details for every transfer on your chain.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>explorer.yourchain.com/token-transfers</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-table">
                                <div class="mock-tbl-header"><span>Txn Hash</span><span>Type</span><span>From</span><span>To</span><span>Amount</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0x1b14…25d5</span><span><span class="type-badge erc20">ERC-20</span></span><span class="tbl-addr">0x7a25…f832</span><span class="tbl-addr">0xdac1…1ec7</span><span class="tbl-num">1,500 USDC</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0x8f22…1a22</span><span><span class="type-badge nft">ERC-721</span></span><span class="tbl-addr">0x4e99…9f33</span><span class="tbl-addr">0x2b87…e451</span><span class="tbl-num">#7804</span></div>
                                <div class="mock-tbl-row"><span class="tbl-hash">0x4e99…9f33</span><span><span class="type-badge erc20">ERC-20</span></span><span class="tbl-addr">0xdac1…1ec7</span><span class="tbl-addr">0x7a25…f832</span><span class="tbl-num">0.842 WETH</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <!-- API Support -->
            <FeatureSection inline-icon compact icon="mdi-api" title="API Support" description="Create and manage explorers programmatically. Spin up a fully configured explorer with a single API call. Ideal for automated deployments and CI/CD pipelines." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>app.ethernal.com/api/explorers</div><div style="width: 42px;"></div></div>
                        <div class="preview-body terminal-mock">
                            <div class="code-line"><span class="t-comment">// Create an explorer via API</span></div>
                            <div class="code-line"><span class="t-cmd">POST</span> <span class="t-str">/api/explorers</span></div>
                            <div class="code-line mt-2"><span class="t-cmd">{</span></div>
                            <div class="code-line"><span class="t-param">  "name"</span><span class="t-cmd">:</span> <span class="t-str">"MyChain Explorer"</span><span class="t-cmd">,</span></div>
                            <div class="code-line"><span class="t-param">  "rpcUrl"</span><span class="t-cmd">:</span> <span class="t-str">"https://rpc.mychain.io"</span><span class="t-cmd">,</span></div>
                            <div class="code-line"><span class="t-param">  "chainId"</span><span class="t-cmd">:</span> <span class="t-num">42170</span></div>
                            <div class="code-line"><span class="t-cmd">}</span></div>
                            <div class="code-line mt-2"><span class="t-success">&#10003; 201 Created</span></div>
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

/* Live badge */
.live-badge { display: inline-flex; align-items: center; gap: 6px; color: #22C55E; font-size: 11px; font-weight: 500; }
.live-dot-anim { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* Block list */
.mock-block-list { display: flex; flex-direction: column; gap: 2px; }
.mock-block { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }
.mock-block.new-block { background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.12); }
.block-num { color: #5DAAE0; font-size: 12px; font-weight: 500; }
.block-txns { color: #94A3B8; font-size: 11px; }
.block-time { color: #64748B; font-size: 10px; }

/* Trace */
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; flex-wrap: wrap; } .trace-node.indent { padding-left: 20px; } .trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.log { background: rgba(45, 212, 191, 0.12); color: #2DD4BF; border: 1px solid rgba(45, 212, 191, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; } .trace-method { color: #CBD5E1; font-size: 11px; } .trace-gas { color: #64748B; font-size: 10px; margin-left: auto; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.status-chip.pending { background: rgba(251, 191, 36, 0.1); color: #FBBF24; border: 1px solid rgba(251, 191, 36, 0.2); }

/* Verification meta */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
.mock-check { font-size: 14px; }
.mock-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mock-meta-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-meta-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-meta-val { color: #CBD5E1; font-size: 12px; }

/* Contract interaction */
.mock-interact-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); }
.mock-tab { padding: 8px 16px; color: #64748B; font-size: 12px; font-weight: 500; border-bottom: 2px solid transparent; } .mock-tab.active { color: #3D95CE; border-bottom-color: #3D95CE; }
.mock-fn { background: rgba(11, 17, 32, 0.4); border: 1px solid rgba(61, 149, 206, 0.08); border-radius: 10px; padding: 14px; margin-bottom: 8px; }
.mock-fn.collapsed { padding: 10px 14px; }
.mock-fn-header { display: flex; align-items: center; gap: 6px; }
.mock-fn-idx { color: #64748B; font-size: 11px; font-weight: 600; } .mock-fn-name { color: #5DAAE0; font-size: 12px; font-weight: 600; } .mock-fn-sig { color: #64748B; font-size: 11px; }
.mock-fn-fields { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.mock-fn-field { display: flex; flex-direction: column; gap: 4px; }
.mock-fn-label { color: #64748B; font-size: 10px; }
.mock-fn-input { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.mock-fn-btn { margin-top: 12px; display: inline-flex; padding: 6px 20px; border-radius: 6px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 11px; font-weight: 600; }

/* Analytics */
.mock-analytics-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.mock-analytics-card { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-analytics-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-analytics-value { color: #F1F5F9; font-size: 16px; font-weight: 600; }
.mock-chart { padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-chart-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.mock-chart-bars { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
.mock-bar { flex: 1; background: linear-gradient(180deg, #3D95CE, rgba(61, 149, 206, 0.3)); border-radius: 3px 3px 0 0; }

/* Branding */
.mock-branding-setup { display: flex; flex-direction: column; gap: 12px; }
.mock-field { display: flex; flex-direction: column; gap: 4px; }
.mock-field-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.mock-field-input { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.mock-color-row { display: flex; gap: 10px; }
.mock-color-swatch { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 8px; }
.swatch { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }

/* Deposits table */
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; grid-template-columns: 1fr 1fr 1fr 0.8fr; gap: 4px; font-size: 11px; align-items: center; }
.mock-tbl-header { color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 4px; }
.mock-tbl-row { padding: 8px 0; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }
.tbl-hash { color: #5DAAE0; } .tbl-addr { color: #94A3B8; font-size: 11px; } .tbl-num { color: #F1F5F9; }

/* Token table (5 cols) */
.mock-tbl-header:has(span:nth-child(5)), .mock-tbl-row:has(span:nth-child(5)) { grid-template-columns: 1.2fr 0.7fr 1fr 1fr 1fr; }

/* Type badges */
.type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.type-badge.erc20 { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.type-badge.nft { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }

/* NFT gallery */
.mock-nft-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
.mock-nft { border-radius: 10px; overflow: hidden; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-nft-img { height: 80px; }
.mock-nft-info { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
.mock-nft-name { color: #F1F5F9; font-size: 11px; font-weight: 600; }
.mock-nft-owner { color: #64748B; font-size: 10px; }

/* API terminal */
.terminal-mock { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; }
.code-line { padding: 0 4px; }
.t-comment { color: #484F58; } .t-cmd { color: #E6EDF3; } .t-str { color: #A5D6FF; } .t-param { color: #5DAAE0; } .t-num { color: #FBBF24; } .t-success { color: #22C55E; font-size: 11px; }
</style>
