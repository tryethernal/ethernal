<template>
    <section class="hero-section">
        <div class="hero-glow"></div>
        <v-container style="max-width: 1280px; position: relative; z-index: 1;">
            <v-row align="center" justify="center" class="py-8 py-lg-0">
                <v-col cols="12" lg="6" class="py-12">
                    <h1 class="hero-headline font-heading mb-5">
                        <span class="gradient-text">Etherscan</span> for your blockchain
                    </h1>

                    <p class="hero-subtitle mb-8">
                        Deploy a fully-featured block explorer in 5 minutes. Just paste your RPC URL.
                        Open source, self-hostable, works with any EVM chain.
                    </p>

                    <DemoExplorerForm />

                    <div class="d-flex align-center ga-6 mt-7 flex-wrap">
                        <div class="d-flex align-center">
                            <v-icon size="16" class="mr-2" color="#22C55E">mdi-check-circle</v-icon>
                            <span class="trust-text">No credit card required</span>
                        </div>
                        <div class="d-flex align-center">
                            <v-icon size="16" class="mr-2" color="#22C55E">mdi-check-circle</v-icon>
                            <span class="trust-text">7-day free trial</span>
                        </div>
                        <div class="d-flex align-center">
                            <v-icon size="16" class="mr-2" color="#22C55E">mdi-check-circle</v-icon>
                            <span class="trust-text">MIT licensed</span>
                        </div>
                    </div>
                </v-col>

                <v-col cols="12" lg="6" class="d-none d-lg-flex justify-center">
                    <div class="hero-preview-wrap">
                        <div class="hero-preview">
                            <div class="preview-header">
                                <div class="d-flex align-center ga-2">
                                    <span class="dot red"></span>
                                    <span class="dot yellow"></span>
                                    <span class="dot green"></span>
                                </div>
                                <div class="preview-url-bar">
                                    <v-icon size="12" :style="{ color: 'var(--text-muted)' }">mdi-lock</v-icon>
                                    explorer.yourchain.com
                                </div>
                                <div style="width: 42px;"></div>
                            </div>
                            <div class="preview-body">
                                <div class="txn-table">
                                    <div class="txn-header">
                                        <span>Txn Hash</span>
                                        <span>Method</span>
                                        <span class="text-right">Block</span>
                                    </div>
                                    <div
                                        v-for="tx in txns"
                                        :key="tx.hash"
                                        class="txn-row"
                                    >
                                        <span class="txn-hash">{{ tx.hash }}</span>
                                        <span>
                                            <span class="txn-method" :class="tx.methodClass">{{ tx.method }}</span>
                                        </span>
                                        <span class="text-right txn-block">{{ tx.block }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<script setup>
import DemoExplorerForm from './DemoExplorerForm.vue';

const txns = [
    { hash: '0x1b14b30d...25d55', method: 'Mint', methodClass: 'method-teal', block: '15798995' },
    { hash: '0x8f22a11c...11a22', method: 'Burn', methodClass: 'method-blue', block: '15798994' },
    { hash: '0x4e99b22e...99f33', method: 'Transfer', methodClass: 'method-blue', block: '15798993' },
];
</script>

<style scoped>
.hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding-top: 64px;
    position: relative;
    overflow: hidden;
}

.hero-glow {
    position: absolute;
    top: -20%;
    right: -10%;
    width: 700px;
    height: 700px;
    background: radial-gradient(circle, rgba(61, 149, 206, 0.15) 0%, rgba(11, 17, 32, 0) 70%);
    pointer-events: none;
}

.hero-headline {
    font-size: clamp(2.2rem, 5vw, 3.5rem);
    font-weight: 700;
    line-height: 1.08;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}

.hero-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    max-width: 520px;
    line-height: 1.7;
}

.trust-text {
    color: var(--text-secondary);
    font-size: 13px;
}

/* Browser preview with tilt */
.hero-preview-wrap {
    transform: rotate(-2deg);
    transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    max-width: 520px;
    width: 100%;
}

.hero-preview-wrap:hover {
    transform: rotate(0deg);
}

.hero-preview {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
}

.preview-header {
    background: var(--terminal-header);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--drawer-divider);
}

.preview-url-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--glass-bg-strong);
    border-radius: 6px;
    padding: 4px 12px;
    color: var(--text-muted);
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

/* Transaction table */
.preview-body {
    padding: 20px;
}

.txn-table {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
}

.txn-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    color: var(--text-muted);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--drawer-divider);
    margin-bottom: 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.txn-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    align-items: center;
    padding: 10px 8px;
    margin: 0 -8px;
    border-radius: 8px;
    transition: background 0.2s;
    cursor: pointer;
}

.txn-row:hover {
    background: rgba(61, 149, 206, 0.06);
}

.txn-hash {
    color: #5DAAE0;
}

.txn-method {
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 12px;
}

.method-teal {
    background: rgba(20, 184, 166, 0.1);
    color: #2DD4BF;
    border: 1px solid rgba(20, 184, 166, 0.2);
}

.method-blue {
    background: rgba(59, 130, 246, 0.1);
    color: #60A5FA;
    border: 1px solid rgba(59, 130, 246, 0.2);
}

.txn-block {
    color: var(--text-secondary);
}

.text-right {
    text-align: right;
}

@media (prefers-reduced-motion: reduce) {
    .hero-preview-wrap,
    .hero-preview-wrap:hover {
        transform: none;
    }
}
</style>
