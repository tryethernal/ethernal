<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">OP Stack Explorer</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Complete bridge monitoring for your OP Stack chain. Deposits, withdrawals, batches, and fault proofs, all in one place.
                </p>
            </div>
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cog-outline"
                    title="3-Field Setup"
                    description="Just 3 fields. Select your L1, paste two addresses, done. Ethernal starts monitoring your OptimismPortal and Batch Inbox automatically."
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
                                    explorer.yourchain.com/settings
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-settings">
                                    <div class="mock-settings-title">OP Stack Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L1 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Ethereum Mainnet</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">OptimismPortal Address</div>
                                        <div class="mock-field-input">0xbEb5Fc579115071764c7423A4f12eDde41f106Ed</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Batch Inbox Address</div>
                                        <div class="mock-field-input">0xFF00000000000000000000000000000000000010</div>
                                    </div>
                                    <div class="mock-settings-btn">Create Configuration</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>

                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-arrow-down-bold-circle-outline"
                    title="Deposit Monitoring"
                    description="TransactionDeposited events detected automatically on your OptimismPortal. Track every L1 to L2 deposit with full sender, recipient, and value details."
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
                                    explorer.yourchain.com/deposits
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header six-col">
                                        <span>L1 Block</span>
                                        <span>L2 Tx</span>
                                        <span>From</span>
                                        <span>To</span>
                                        <span>Value</span>
                                        <span>Status</span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">19,847,231</span>
                                        <span class="tbl-hash">0x8f22…1a22</span>
                                        <span class="tbl-addr">0x7a25…f832</span>
                                        <span class="tbl-addr">0xdac1…1ec7</span>
                                        <span class="tbl-num">0.5 ETH</span>
                                        <span><span class="status-chip relayed">Relayed</span></span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">19,847,198</span>
                                        <span class="tbl-hash">0x4e99…9f33</span>
                                        <span class="tbl-addr">0x4e99…9f33</span>
                                        <span class="tbl-addr">0x2b87…e451</span>
                                        <span class="tbl-num">1.2 ETH</span>
                                        <span><span class="status-chip relayed">Relayed</span></span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">19,847,155</span>
                                        <span class="tbl-hash">Pending</span>
                                        <span class="tbl-addr">0xf1d8…7a92</span>
                                        <span class="tbl-addr">0x9d23…b412</span>
                                        <span class="tbl-num">0.1 ETH</span>
                                        <span><span class="status-chip pending">Pending</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>

                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-arrow-up-bold-circle-outline"
                    title="Withdrawal Lifecycle"
                    description="Track every withdrawal through the full optimistic rollup lifecycle. From initiation through the 7-day challenge period to finalization."
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
                                    explorer.yourchain.com/withdrawal/8201
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-withdrawal">
                                    <div class="mock-stepper">
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">Initiated</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">State Proposed</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step active">
                                            <div class="step-dot active"></div>
                                            <div class="step-label">Challenge Period</div>
                                            <div class="step-sub">4d 12h remaining</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step">
                                            <div class="step-dot"></div>
                                            <div class="step-label">Proven</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step">
                                            <div class="step-dot"></div>
                                            <div class="step-label">Finalized</div>
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
                    icon="mdi-database-outline"
                    title="Batch & Blob Support"
                    description="Supports both legacy calldata and EIP-4844 blob batches. Monitor every batch your sequencer posts to L1."
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
                                    explorer.yourchain.com/batches
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header five-col">
                                        <span>Batch #</span>
                                        <span>L1 Block</span>
                                        <span>Data</span>
                                        <span>Status</span>
                                        <span>L1 Transaction</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-num">#12,847</span>
                                        <span class="tbl-num">19,847,302</span>
                                        <span><span class="data-chip blob">Blob</span></span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span class="tbl-hash">0x9d23…b412</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-num">#12,846</span>
                                        <span class="tbl-num">19,847,260</span>
                                        <span><span class="data-chip blob">Blob</span></span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span class="tbl-hash">0x1f98…4e23</span>
                                    </div>
                                    <div class="mock-tbl-row five-col">
                                        <span class="tbl-num">#12,845</span>
                                        <span class="tbl-num">19,847,215</span>
                                        <span><span class="data-chip calldata">Calldata</span></span>
                                        <span><span class="status-chip pending">Unfinalized</span></span>
                                        <span class="tbl-hash">0x7a25…f832</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>

                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-shield-check-outline"
                    title="Fault Proofs"
                    description="Full dispute game tracking for modern OP Stack chains. Monitor state outputs, proposers, and game statuses."
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
                                    explorer.yourchain.com/state-outputs
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-table">
                                    <div class="mock-tbl-header six-col">
                                        <span>Output #</span>
                                        <span>Output Root</span>
                                        <span>L2 Block</span>
                                        <span>Proposer</span>
                                        <span>Status</span>
                                        <span>Game Type</span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">#2,401</span>
                                        <span class="tbl-hash">0xab12…ef34</span>
                                        <span class="tbl-num">4,521,600</span>
                                        <span class="tbl-addr">0x7a25…f832</span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span><span class="data-chip game">Permissioned</span></span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">#2,400</span>
                                        <span class="tbl-hash">0xcd56…7890</span>
                                        <span class="tbl-num">4,520,400</span>
                                        <span class="tbl-addr">0x4e99…9f33</span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span><span class="data-chip game">Permissioned</span></span>
                                    </div>
                                    <div class="mock-tbl-row six-col">
                                        <span class="tbl-num">#2,399</span>
                                        <span class="tbl-hash">0xef78…1234</span>
                                        <span class="tbl-num">4,519,200</span>
                                        <span class="tbl-addr">0xdac1…1ec7</span>
                                        <span><span class="status-chip pending">Proposed</span></span>
                                        <span><span class="data-chip game">Cannon</span></span>
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
import { useHead } from '@vueuse/head';

useHead({
    title: 'OP Stack Block Explorer — Ethernal',
    meta: [
        { name: 'description', content: 'Block explorer for OP Stack rollups. L2-to-L1 withdrawal tracking, transaction decoding, and contract verification.' },
        { property: 'og:title', content: 'OP Stack Block Explorer — Ethernal' },
        { property: 'og:description', content: 'Block explorer for OP Stack rollups. L2-to-L1 withdrawal tracking, transaction decoding, and contract verification.' },
        { property: 'og:url', content: 'https://tryethernal.com/op-stack' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/op-stack' }
    ]
});
import LandingLayout from '@/components/LandingLayout.vue';
import FeatureSection from '@/components/FeatureSection.vue';
import LandingCTA from '@/components/LandingCTA.vue';
</script>

<style scoped>
.page-title-bar {
    padding-bottom: 24px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--drawer-divider);
}

/* Browser preview frame */
.browser-preview {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-card);
}

.preview-header {
    background: var(--bg-surface);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-subtle);
}

.preview-url-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--glass-bg-strong);
    border-radius: 6px;
    padding: 4px 12px;
    color: var(--text-muted);
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
}

.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.preview-body {
    padding: 20px;
    font-family: 'JetBrains Mono', 'Roboto', sans-serif;
    font-size: 12px;
}

/* Settings mockup */
.mock-settings-title {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 16px;
}

.mock-field {
    margin-bottom: 14px;
}

.mock-field-label {
    color: var(--text-secondary);
    font-size: 11px;
    margin-bottom: 6px;
}

.mock-field-input,
.mock-field-select {
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--glass-bg);
    border: 1px solid var(--border-subtle);
    color: #CBD5E1;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
}

.mock-field-select {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-primary);
    font-family: 'Roboto', sans-serif;
}

.mock-settings-btn {
    display: inline-flex;
    padding: 8px 24px;
    border-radius: 8px;
    background: linear-gradient(90deg, #3D95CE, #5DAAE0);
    color: #FFF;
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
}

/* Table mockup */
.mock-table {
    width: 100%;
}

.mock-tbl-header,
.mock-tbl-row {
    display: grid;
    gap: 8px;
    align-items: center;
    font-size: 11px;
}

.mock-tbl-header {
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--drawer-divider);
    margin-bottom: 4px;
}

.mock-tbl-row {
    padding: 10px 0;
    border-bottom: 1px solid var(--drawer-divider);
}

.mock-tbl-header.five-col,
.mock-tbl-row.five-col {
    grid-template-columns: 0.8fr 1fr 0.8fr 0.8fr 1.2fr;
}

.mock-tbl-header.six-col,
.mock-tbl-row.six-col {
    grid-template-columns: 0.7fr 1fr 0.8fr 0.8fr 0.8fr 0.9fr;
}

.tbl-num { color: var(--text-primary); }
.tbl-hash { color: #5DAAE0; }
.tbl-addr { color: var(--text-secondary); }

.status-chip {
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
}

.status-chip.relayed {
    background: rgba(34, 197, 94, 0.1);
    color: #22C55E;
    border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-chip.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.2);
}

.data-chip {
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
}

.data-chip.blob {
    background: rgba(168, 85, 247, 0.1);
    color: #A78BFA;
    border: 1px solid rgba(168, 85, 247, 0.2);
}

.data-chip.calldata {
    background: rgba(61, 149, 206, 0.1);
    color: #5DAAE0;
    border: 1px solid rgba(61, 149, 206, 0.2);
}

.data-chip.game {
    background: rgba(45, 212, 191, 0.1);
    color: #2DD4BF;
    border: 1px solid rgba(45, 212, 191, 0.2);
}

/* Withdrawal stepper */
.mock-withdrawal {
    text-align: center;
}

.mock-stepper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 70px;
}

.step-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(61, 149, 206, 0.1);
    border: 2px solid rgba(61, 149, 206, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text-muted);
}

.step-dot.done {
    background: rgba(34, 197, 94, 0.15);
    border-color: #22C55E;
    color: #22C55E;
}

.step-dot.active {
    background: rgba(61, 149, 206, 0.15);
    border-color: #3D95CE;
    box-shadow: 0 0 12px rgba(61, 149, 206, 0.3);
}

.step-label {
    color: var(--text-secondary);
    font-size: 10px;
    white-space: nowrap;
}

.step-sub {
    color: #F59E0B;
    font-size: 9px;
    margin-top: -4px;
}

.step-line {
    width: 30px;
    height: 2px;
    background: rgba(61, 149, 206, 0.15);
    margin-bottom: 24px;
    flex-shrink: 0;
}

.step-line.done {
    background: #22C55E;
}

@media (max-width: 600px) {
    .mock-tbl-header.six-col,
    .mock-tbl-row.six-col {
        grid-template-columns: 1fr 1fr 1fr;
        font-size: 10px;
    }
    .mock-tbl-header.six-col span:nth-child(n+4),
    .mock-tbl-row.six-col span:nth-child(n+4) {
        display: none;
    }
    .mock-tbl-header.five-col,
    .mock-tbl-row.five-col {
        grid-template-columns: 1fr 1fr 1fr;
        font-size: 10px;
    }
    .mock-tbl-header.five-col span:nth-child(n+4),
    .mock-tbl-row.five-col span:nth-child(n+4) {
        display: none;
    }
    .step { min-width: 55px; }
    .step-label { font-size: 8px; }
    .step-line { width: 16px; }
}
</style>
