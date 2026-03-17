<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Anvil Block Explorer</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    A visual block explorer for Foundry's Anvil. See every transaction, trace calls, and inspect contracts from a clean web UI.
                </p>
            </div>

            <FeatureSection inline-icon compact icon="mdi-flash" title="Connect in Seconds" description="Start Anvil, paste the RPC URL into Ethernal, and you're exploring. No plugins, no config. Ethernal polls your node and syncs blocks automatically.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>terminal</div><div style="width: 42px;"></div></div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">anvil</span></div>
                            <div><span class="t-comment"># Listening on 127.0.0.1:8545</span></div>
                            <div class="mt-3"><span class="t-comment"># Paste http://127.0.0.1:8545 into Ethernal</span></div>
                            <div><span class="t-success">&#10003; Syncing blocks...</span></div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-file-tree" title="Full Trace Support" description="Anvil supports debug_traceTransaction natively. Ethernal shows complete call trees with gas costs, return values, and revert reasons for every transaction." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/tx/0x1b14…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-trace">
                                <div class="d-flex justify-space-between align-center mb-3">
                                    <span style="color: var(--text-primary); font-weight: 600; font-size: 13px;">Call Trace</span>
                                    <span class="status-chip success">Success</span>
                                </div>
                                <div class="trace-node"><span class="trace-op call">CALL</span><span class="trace-addr">0x7a25…f832</span><span class="trace-method">swap(uint256,address)</span><span class="trace-gas">45,230 gas</span></div>
                                <div class="trace-node indent"><span class="trace-op static">STATICCALL</span><span class="trace-addr">0x1f98…4e23</span><span class="trace-method">getReserves()</span><span class="trace-gas">2,100 gas</span></div>
                                <div class="trace-node indent"><span class="trace-op call">CALL</span><span class="trace-addr">0xdac1…1ec7</span><span class="trace-method">transfer(address,uint256)</span><span class="trace-gas">12,450 gas</span></div>
                                <div class="trace-node indent-2"><span class="trace-op log">LOG</span><span class="trace-method">Transfer(from, to, value)</span></div>
                            </div>
                        </div>
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-code-braces" title="Contract Interaction" description="Upload your ABI or verify your contract source, then read and write to any function directly from the explorer. Perfect for testing during development.">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>explorer.yourchain.com/address/0x7a25…</div><div style="width: 42px;"></div></div>
                        <div class="preview-body">
                            <div class="mock-interact">
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
                    </div>
                </template>
            </FeatureSection>

            <FeatureSection inline-icon compact icon="mdi-sync" title="Fork Mode Compatible" description="Using anvil --fork-url? Ethernal works seamlessly with forked chains. Inspect mainnet state alongside your local transactions in one unified view." :reverse="true">
                <template #visual>
                    <div class="browser-preview">
                        <div class="preview-header"><div class="d-flex align-center ga-2"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div><div class="preview-url-bar"><v-icon size="12" style="color: var(--text-muted);">mdi-lock</v-icon>terminal</div><div style="width: 42px;"></div></div>
                        <div class="preview-body terminal-mock">
                            <div><span class="t-prompt">$ </span><span class="t-cmd">anvil --fork-url https://eth.llamarpc.com</span></div>
                            <div><span class="t-comment"># Forking from block 19847231</span></div>
                            <div><span class="t-comment"># Listening on 127.0.0.1:8545</span></div>
                            <div class="mt-3"><span class="t-success">&#10003; Ethernal connected</span></div>
                            <div><span class="t-success">&#10003; Mainnet state + local txns visible</span></div>
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
    title: 'Anvil Block Explorer — Ethernal',
    meta: [
        { name: 'description', content: 'Real-time block explorer for Foundry Anvil. Decoded transactions, contract verification, and call traces for local dev.' },
        { property: 'og:title', content: 'Anvil Block Explorer — Ethernal' },
        { property: 'og:description', content: 'Real-time block explorer for Foundry Anvil. Decoded transactions, contract verification, and call traces for local dev.' },
        { property: 'og:url', content: 'https://tryethernal.com/anvil-block-explorer' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/anvil-block-explorer' }
    ]
});
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
.mock-trace { font-size: 12px; }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 5px 0; flex-wrap: wrap; } .trace-node.indent { padding-left: 20px; } .trace-node.indent-2 { padding-left: 40px; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }
.trace-op.call { background: rgba(61, 149, 206, 0.12); color: #3D95CE; border: 1px solid rgba(61, 149, 206, 0.25); }
.trace-op.static { background: rgba(167, 139, 250, 0.12); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.25); }
.trace-op.log { background: rgba(45, 212, 191, 0.12); color: #2DD4BF; border: 1px solid rgba(45, 212, 191, 0.25); }
.trace-addr { color: #5DAAE0; font-size: 11px; } .trace-method { color: #CBD5E1; font-size: 11px; } .trace-gas { color: var(--text-muted); font-size: 10px; margin-left: auto; }
.status-chip { padding: 2px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.status-chip.success { background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.mock-interact-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 1px solid var(--drawer-divider); }
.mock-tab { padding: 8px 16px; color: var(--text-muted); font-size: 12px; font-weight: 500; border-bottom: 2px solid transparent; } .mock-tab.active { color: #3D95CE; border-bottom-color: #3D95CE; }
.mock-fn { background: var(--glass-bg); border: 1px solid var(--drawer-divider); border-radius: 10px; padding: 14px; margin-bottom: 8px; }
.mock-fn.collapsed { padding: 10px 14px; }
.mock-fn-header { display: flex; align-items: center; gap: 6px; }
.mock-fn-idx { color: var(--text-muted); font-size: 11px; font-weight: 600; } .mock-fn-name { color: #5DAAE0; font-size: 12px; font-weight: 600; } .mock-fn-sig { color: var(--text-muted); font-size: 11px; }
.mock-fn-fields { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.mock-fn-field { display: flex; flex-direction: column; gap: 4px; }
.mock-fn-label { color: var(--text-muted); font-size: 10px; }
.mock-fn-input { padding: 8px 12px; border-radius: 6px; background: var(--glass-bg); border: 1px solid var(--border-subtle); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.mock-fn-btn { margin-top: 12px; display: inline-flex; padding: 6px 20px; border-radius: 6px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 11px; font-weight: 600; }
</style>
