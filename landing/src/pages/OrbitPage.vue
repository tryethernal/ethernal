<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">INTEGRATION</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Arbitrum Orbit Explorer</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Full bridge visibility for your Orbit chain. Track deposits, withdrawals, and batches with a visual UI. Set up in under 2 minutes.
                </p>
            </div>
                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-cog-outline"
                    title="Easy Configuration"
                    description="Paste your contract addresses. Ethernal handles the rest. Deposit detection, withdrawal tracking, and batch monitoring start automatically."
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
                                    <div class="mock-settings-title">Arbitrum Orbit Configuration</div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">L1 Parent Chain</div>
                                        <div class="mock-field-select">
                                            <span>Ethereum Mainnet</span>
                                            <v-icon size="14" style="color: var(--text-muted);">mdi-chevron-down</v-icon>
                                        </div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Rollup Contract</div>
                                        <div class="mock-field-input">0x5eF0D09d1E6204141B4d37530F6a22A5F6BC0d3d</div>
                                    </div>
                                    <div class="mock-field">
                                        <div class="mock-field-label">Inbox Contract</div>
                                        <div class="mock-field-input">0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6</div>
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
                    title="Deposit Tracking"
                    description="Every L1 to L2 deposit detected in real time via your Inbox contract. See message numbers, L2 transactions, and status, all in one place."
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
                                    <div class="mock-tbl-header">
                                        <span>L1 Block</span>
                                        <span>Message #</span>
                                        <span>L2 Transaction</span>
                                        <span>Status</span>
                                        <span>L1 Transaction</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">19,847,231</span>
                                        <span class="tbl-num">#14,502</span>
                                        <span class="tbl-hash">0x8f22…1a22</span>
                                        <span><span class="status-chip relayed">Relayed</span></span>
                                        <span class="tbl-hash">0x3c91…f4e1</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">19,847,198</span>
                                        <span class="tbl-num">#14,501</span>
                                        <span class="tbl-hash">0x4e99…9f33</span>
                                        <span><span class="status-chip relayed">Relayed</span></span>
                                        <span class="tbl-hash">0xa7b2…c823</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">19,847,155</span>
                                        <span class="tbl-num">#14,500</span>
                                        <span class="tbl-hash">Pending</span>
                                        <span><span class="status-chip pending">Pending</span></span>
                                        <span class="tbl-hash">0xf1d8…7a92</span>
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
                    title="Withdrawal Claims"
                    description="Your users can claim L2 to L1 withdrawals directly from the explorer. Track every step from initiation to finalization."
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
                                    explorer.yourchain.com/withdrawal/14502
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
                                            <div class="step-label">Proved</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step active">
                                            <div class="step-dot active"></div>
                                            <div class="step-label">Challenge Period</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step">
                                            <div class="step-dot"></div>
                                            <div class="step-label">Finalized</div>
                                        </div>
                                    </div>
                                    <div class="mock-claim-btn">Claim Withdrawal</div>
                                </div>
                            </div>
                        </div>
                    </template>
                </FeatureSection>

                <FeatureSection
                    inline-icon
                    compact
                    icon="mdi-package-variant-closed"
                    title="Batch Explorer"
                    description="Track every batch posted to L1 by your sequencer. See batch numbers, finality status, transaction counts, and L1 anchoring details."
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
                                    <div class="mock-tbl-header">
                                        <span>Batch #</span>
                                        <span>L1 Block</span>
                                        <span>Status</span>
                                        <span>Tx Count</span>
                                        <span>L1 Transaction</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">#8,421</span>
                                        <span class="tbl-num">19,847,302</span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span class="tbl-num">142</span>
                                        <span class="tbl-hash">0x9d23…b412</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">#8,420</span>
                                        <span class="tbl-num">19,847,260</span>
                                        <span><span class="status-chip relayed">Finalized</span></span>
                                        <span class="tbl-num">98</span>
                                        <span class="tbl-hash">0x1f98…4e23</span>
                                    </div>
                                    <div class="mock-tbl-row">
                                        <span class="tbl-num">#8,419</span>
                                        <span class="tbl-num">19,847,215</span>
                                        <span><span class="status-chip pending">Unfinalized</span></span>
                                        <span class="tbl-num">67</span>
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
                    icon="mdi-chart-timeline-variant"
                    title="Transaction Lifecycle"
                    description="Every transaction shows its full journey from L2 to L1 finality. Your users see exactly where their transaction is in the pipeline."
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
                                    explorer.yourchain.com/tx/0x8f22…
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="mock-lifecycle">
                                    <div class="lifecycle-title">Transaction Status</div>
                                    <div class="mock-stepper horizontal">
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">Processed on rollup</div>
                                        </div>
                                        <div class="step-line done"></div>
                                        <div class="step done">
                                            <div class="step-dot done">&#10003;</div>
                                            <div class="step-label">Sent to parent chain</div>
                                        </div>
                                        <div class="step-line"></div>
                                        <div class="step active">
                                            <div class="step-dot active"></div>
                                            <div class="step-label">Confirmed on parent chain</div>
                                        </div>
                                    </div>
                                    <div class="lifecycle-meta">
                                        <div class="lifecycle-row">
                                            <span class="lifecycle-key">L2 Block</span>
                                            <span class="lifecycle-val">#4,521,098</span>
                                        </div>
                                        <div class="lifecycle-row">
                                            <span class="lifecycle-key">L1 Batch</span>
                                            <span class="lifecycle-val">#8,421</span>
                                        </div>
                                        <div class="lifecycle-row">
                                            <span class="lifecycle-key">Finality</span>
                                            <span class="lifecycle-val pending">~15 min remaining</span>
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

.mock-tbl-header {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr 0.8fr 1.2fr;
    gap: 8px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--drawer-divider);
    margin-bottom: 4px;
}

.mock-tbl-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr 0.8fr 1.2fr;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--drawer-divider);
    align-items: center;
    font-size: 11px;
}

.tbl-num { color: var(--text-primary); }
.tbl-hash { color: #5DAAE0; }

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
}

.mock-stepper.horizontal {
    margin-bottom: 20px;
}

.step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 80px;
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

.step-line {
    width: 40px;
    height: 2px;
    background: rgba(61, 149, 206, 0.15);
    margin-bottom: 24px;
    flex-shrink: 0;
}

.step-line.done {
    background: #22C55E;
}

.mock-claim-btn {
    display: inline-flex;
    padding: 10px 28px;
    border-radius: 8px;
    background: linear-gradient(90deg, #3D95CE, #5DAAE0);
    color: #FFF;
    font-size: 13px;
    font-weight: 600;
}

/* Lifecycle */
.lifecycle-title {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 20px;
}

.lifecycle-meta {
    background: var(--glass-bg);
    border: 1px solid var(--drawer-divider);
    border-radius: 10px;
    padding: 14px;
}

.lifecycle-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
}

.lifecycle-row:not(:last-child) {
    border-bottom: 1px solid var(--drawer-divider);
}

.lifecycle-key {
    color: var(--text-muted);
    font-size: 11px;
}

.lifecycle-val {
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
}

.lifecycle-val.pending {
    color: #F59E0B;
}

@media (max-width: 600px) {
    .mock-tbl-header,
    .mock-tbl-row {
        grid-template-columns: 1fr 1fr 1fr;
        font-size: 10px;
    }
    .mock-tbl-header span:nth-child(4),
    .mock-tbl-header span:nth-child(5),
    .mock-tbl-row span:nth-child(4),
    .mock-tbl-row span:nth-child(5) {
        display: none;
    }
    .step { min-width: 60px; }
    .step-label { font-size: 9px; }
    .step-line { width: 20px; }
}
</style>
