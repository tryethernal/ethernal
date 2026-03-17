<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">USE CASE</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Built for Developers</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    A visual debugger for your local chain. See every transaction, trace reverts, and interact with contracts without writing logging code.
                </p>
            </div>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-flash"
                title="Instant Setup"
                description="Connect any EVM chain with just an RPC URL. For Hardhat and Foundry, install the plugin and every transaction syncs automatically. No infrastructure to manage."
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
                                terminal
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">npm install hardhat-ethernal</span></div>
                            <div class="mt-3"><span class="t-comment">// hardhat.config.js</span></div>
                            <div><span class="t-cmd">require</span><span class="t-paren">(</span><span class="t-str">'hardhat-ethernal'</span><span class="t-paren">)</span><span class="t-cmd">;</span></div>
                            <div class="mt-3"><span class="t-prompt">$ </span><span class="t-cmd">npx hardhat node</span></div>
                            <div><span class="t-success">&#10003; Ethernal syncing automatically...</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-bug"
                title="Debug Failed Transactions"
                description="When a transaction reverts, see the full call trace with the exact revert reason. Stop guessing why your tests fail. See the complete execution path in one click."
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
                                explorer.yourchain.com/tx/0x1b14...
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-trace">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                    <span class="status-chip error">Reverted</span>
                                </div>
                                <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x7a25...f832</span><span class="trace-method">swap(uint256)</span></div>
                                <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x1f98...4e23</span><span class="trace-method">getReserves()</span></div>
                                <div class="trace-node indent"><span class="trace-op call">CALL</span><span class="trace-addr">0xdac1...1ec7</span><span class="trace-method">transfer(address,uint256)</span></div>
                                <div class="trace-node indent-2"><span class="trace-op revert">REVERT</span><span class="trace-reason">Insufficient balance</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-auto-fix"
                title="Automatic Contract Verification"
                description="Deploy a contract and Ethernal picks up the ABI and source code automatically. No manual verification step. Your contracts are immediately readable and interactive."
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
                                explorer.yourchain.com/address/0x5eF0...
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body">
                            <div class="mock-verified-banner">
                                <span class="mock-check">&#10003;</span>
                                Contract Source Code Verified
                            </div>
                            <div class="mock-interact-tabs">
                                <span class="mock-tab active">Read</span>
                                <span class="mock-tab">Write</span>
                            </div>
                            <div class="mock-fn-list">
                                <div class="mock-fn-item"><span class="fn-name">balanceOf</span><span class="fn-type">(address) &rarr; uint256</span></div>
                                <div class="mock-fn-item"><span class="fn-name">totalSupply</span><span class="fn-type">() &rarr; uint256</span></div>
                                <div class="mock-fn-item"><span class="fn-name">symbol</span><span class="fn-type">() &rarr; string</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection
                inline-icon
                compact
                icon="mdi-code-json"
                title="Full API Access"
                description="Query blocks, transactions, contracts, and token transfers programmatically. Etherscan-compatible API endpoints let you integrate explorer data into your own tools and scripts."
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
                                explorer.yourchain.com/api
                            </div>
                            <div style="width: 42px;"></div>
                        </div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">curl</span> <span class="t-str">explorer.yourchain.com/api</span> \</div>
                            <div>&nbsp;&nbsp;<span class="t-param">?module=</span><span class="t-str">contract</span>&amp;<span class="t-param">action=</span><span class="t-str">getabi</span></div>
                            <div class="mt-2"><span class="t-comment">// Response</span></div>
                            <div>{ <span class="t-param">"status"</span>: <span class="t-str">"1"</span>,</div>
                            <div>&nbsp;&nbsp;<span class="t-param">"result"</span>: <span class="t-str">"[{\"name\":\"transfer\"...}]"</span> }</div>
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
    title: 'For Developers — Ethernal Block Explorer',
    meta: [
        { name: 'description', content: 'Hardhat and Foundry integration, API access, WebSocket sync. Build faster with a block explorer that fits your dev workflow.' },
        { property: 'og:title', content: 'For Developers — Ethernal Block Explorer' },
        { property: 'og:description', content: 'Hardhat and Foundry integration, API access, WebSocket sync. Build faster with a block explorer that fits your dev workflow.' },
        { property: 'og:url', content: 'https://tryethernal.com/developers' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/developers' }
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

/* Terminal mock */
.terminal-mock { font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; }
.t-prompt { color: #58A6FF; }
.t-cmd { color: #E6EDF3; }
.t-comment { color: #484F58; }
.t-str { color: #A5D6FF; }
.t-paren { color: #CBD5E1; }
.t-param { color: #5DAAE0; }
.t-success { color: #22C55E; font-size: 11px; }

/* Trace */
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.trace-node.indent { padding-left: 20px; }
.trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.revert { background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; }
.trace-method { color: #CBD5E1; font-size: 11px; }
.trace-reason { color: #EF4444; font-size: 11px; font-weight: 500; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.error { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }

/* Contract verification */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-interact-tabs { display: flex; gap: 0; margin-bottom: 12px; }
.mock-tab { padding: 6px 16px; font-size: 11px; color: var(--text-muted); border-bottom: 2px solid transparent; cursor: pointer; }
.mock-tab.active { color: #5DAAE0; border-bottom-color: #5DAAE0; }
.mock-fn-list { display: flex; flex-direction: column; gap: 6px; }
.mock-fn-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; background: var(--glass-bg); border: 1px solid var(--drawer-divider); }
.fn-name { color: #5DAAE0; font-size: 12px; font-weight: 600; }
.fn-type { color: var(--text-muted); font-size: 11px; }
</style>
