<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ganache Block Explorer</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    A full-featured block explorer for Ganache. Browse blocks, decode transactions, and inspect contracts on your local chain.
                </p>
            </div>

            <FeatureSection inline-icon compact icon="mdi-connection" title="Just Paste Your RPC" description="Start Ganache CLI or the desktop app, copy the RPC URL, and paste it into Ethernal. Blocks sync automatically. No plugins, no setup scripts.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>terminal</div><div style="width: 42px;"></div></div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">ganache-cli</span></div>
                            <div><span class="t-comment"># Listening on 127.0.0.1:8545</span></div>
                            <div class="mt-3"><span class="t-comment"># Paste http://127.0.0.1:8545 into Ethernal</span></div>
                            <div><span class="t-success">&#10003; Syncing blocks...</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-magnify" title="Decoded Transactions" description="Stop reading raw hex. Ethernal decodes function calls and event logs using known ABIs. If you've verified a contract, every interaction is human-readable." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/tx/0x8f22…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-decoded">
                                <div class="decoded-header">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Function Call</span>
                                    <span class="status-chip success">Decoded</span>
                                </div>
                                <div class="decoded-fn">transfer(address to, uint256 amount)</div>
                                <div class="decoded-params">
                                    <div class="decoded-param"><span class="param-name">to</span><span class="param-val">0xdac1…1ec7</span></div>
                                    <div class="decoded-param"><span class="param-name">amount</span><span class="param-val">1,500,000,000 (1,500 USDC)</span></div>
                                </div>
                                <div class="decoded-events-label">Events (1)</div>
                                <div class="decoded-event"><span class="event-name">Transfer</span><span class="event-args">from: 0x7a25…, to: 0xdac1…, value: 1500000000</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-check-decagram" title="Contract Verification" description="Upload Solidity source and verify contracts deployed on Ganache. Once verified, you can read state variables, call functions, and send transactions from the explorer.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/address/0x5eF0…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-verification">
                                <div class="mock-verified-banner"><span class="mock-check">&#10003;</span>Contract Source Code Verified</div>
                                <div class="mock-code">
                                    <div class="code-line"><span class="line-num">1</span><span class="code-comment">// SPDX-License-Identifier: MIT</span></div>
                                    <div class="code-line"><span class="line-num">2</span><span class="code-text">pragma solidity ^0.8.20;</span></div>
                                    <div class="code-line"><span class="line-num">3</span><span class="code-text"></span></div>
                                    <div class="code-line"><span class="line-num">4</span><span class="code-text">contract Token {</span></div>
                                    <div class="code-line"><span class="line-num">5</span><span class="code-text">    mapping(address => uint256) balances;</span></div>
                                    <div class="code-line"><span class="line-num">6</span><span class="code-text">    function transfer(address to, uint256 amt)</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-swap-horizontal" title="Token Transfer Tracking" description="Developing an ERC-20 or NFT? Ethernal detects and displays all token transfers with sender, recipient, amount, and token metadata." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/token-transfers</div><div style="width: 42px;"></div></div>
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
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';

useHead({
    title: 'Ganache Block Explorer — Ethernal',
    meta: [
        { name: 'description', content: 'Visual block explorer for Ganache. Decoded transactions, contract state, and event logs for Truffle development.' },
        { property: 'og:title', content: 'Ganache Block Explorer — Ethernal' },
        { property: 'og:description', content: 'Visual block explorer for Ganache. Decoded transactions, contract state, and event logs for Truffle development.' },
        { property: 'og:url', content: 'https://tryethernal.com/ganache-block-explorer' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/ganache-block-explorer' }
    ]
});
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }
.browser-preview { background: var(--glass-bg); backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-card); }
.preview-header { background: var(--bg-surface); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }
.preview-url-bar { display: flex; align-items: center; gap: 6px; background: var(--glass-bg-strong); border-radius: 6px; padding: 4px 12px; color: var(--text-muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.dot { width: 10px; height: 10px; border-radius: 50%; } .dot.red { background: #ff5f56; } .dot.yellow { background: #febc2e; } .dot.green { background: #28c840; }
.preview-body { padding: 20px; font-family: 'JetBrains Mono', 'Roboto', sans-serif; font-size: 12px; }
.terminal-mock { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; }
.t-prompt { color: #58A6FF; } .t-cmd { color: #E6EDF3; } .t-comment { color: #484F58; } .t-success { color: #22C55E; font-size: 11px; }
.mock-decoded { font-size: 12px; }
.decoded-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.decoded-fn { padding: 10px 14px; border-radius: 8px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #5DAAE0; font-size: 12px; font-family: 'JetBrains Mono', monospace; margin-bottom: 12px; }
.decoded-params { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.decoded-param { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--drawer-divider); }
.param-name { color: var(--text-muted); font-size: 11px; min-width: 60px; }
.param-val { color: #CBD5E1; font-size: 11px; }
.decoded-events-label { color: var(--text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.decoded-event { padding: 8px 12px; border-radius: 8px; background: rgba(45, 212, 191, 0.06); border: 1px solid rgba(45, 212, 191, 0.12); }
.event-name { color: #2DD4BF; font-size: 11px; font-weight: 600; margin-right: 10px; }
.event-args { color: var(--text-secondary); font-size: 10px; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-code { background: var(--bg-base); border-radius: 8px; padding: 12px 0; border: 1px solid var(--drawer-divider); }
.code-line { display: flex; gap: 16px; padding: 1px 16px; line-height: 1.7; }
.line-num { color: #334155; font-size: 11px; user-select: none; min-width: 16px; text-align: right; }
.code-text { color: #E6EDF3; font-size: 11px; } .code-comment { color: #484F58; font-size: 11px; }
.mock-table { width: 100%; }
.mock-tbl-header, .mock-tbl-row { display: grid; grid-template-columns: 1.2fr 0.7fr 1fr 1fr 1fr; gap: 4px; font-size: 11px; align-items: center; }
.mock-tbl-header { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--drawer-divider); margin-bottom: 4px; }
.mock-tbl-row { padding: 8px 0; border-bottom: 1px solid var(--drawer-divider); }
.tbl-hash { color: #5DAAE0; } .tbl-addr { color: var(--text-secondary); font-size: 11px; } .tbl-num { color: var(--text-primary); }
.type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.type-badge.erc20 { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.type-badge.nft { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border: 1px solid rgba(168, 85, 247, 0.2); }
</style>
