<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Breadcrumb -->
            <div class="breadcrumb mb-2">
                <router-link to="/" class="breadcrumb-link">Home</router-link>
                <span class="breadcrumb-sep">/</span>
                <span>Tools</span>
                <span class="breadcrumb-sep">/</span>
                <span>Block Date Converter</span>
            </div>

            <!-- Hero -->
            <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FREE TOOL</div>
            <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Block Number / Date Converter</h1>
            <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem; margin-bottom: 40px;">
                Convert between block numbers and dates on any EVM chain. Look up when a block was mined, or find the block closest to a specific date. Queries your chosen RPC directly.
            </p>

            <!-- Two-column layout -->
            <v-row>
                <v-col cols="12" md="3" class="d-none d-md-block">
                    <ToolsSidebar active-tool="block-date-converter" />
                </v-col>
                <v-col cols="12" class="d-md-none">
                    <ToolsSidebar active-tool="block-date-converter" />
                </v-col>

                <v-col cols="12" md="9">
                    <!-- Chain quick-select -->
                    <label class="tool-label">Chain</label>
                    <div class="chain-badges mb-3">
                        <button
                            v-for="chain in chains"
                            :key="chain.slug"
                            :class="['chain-badge', { active: activeChain === chain.slug }]"
                            @click="selectChain(chain)"
                        >
                            <img
                                v-if="chain.logo"
                                :src="`/images/chains/${chain.logo}`"
                                :alt="chain.name"
                                class="chain-badge-logo"
                            />
                            {{ chain.name }}
                        </button>
                    </div>

                    <label class="tool-label">RPC URL</label>
                    <input
                        v-model="rpcUrl"
                        class="tool-input mb-6"
                        placeholder="https://ethereum-rpc.publicnode.com"
                        spellcheck="false"
                        @input="onRpcManualEdit"
                    />

                    <!-- Tabs -->
                    <div class="tool-tabs mb-6">
                        <button :class="['tool-tab', { active: activeTab === 'date-to-block' }]" @click="activeTab = 'date-to-block'">Date to Block</button>
                        <button :class="['tool-tab', { active: activeTab === 'block-to-date' }]" @click="activeTab = 'block-to-date'">Block to Date</button>
                    </div>

                    <!-- DATE TO BLOCK TAB -->
                    <div v-if="activeTab === 'date-to-block'">
                        <label class="tool-label">Date and time (UTC)</label>
                        <input
                            v-model="dateInput"
                            class="tool-input"
                            type="datetime-local"
                        />

                        <button class="btn-primary mt-5" @click="handleDateToBlock" :disabled="!dateInput || !rpcUrl.trim() || dateToBlockLoading">
                            {{ dateToBlockLoading ? 'Searching...' : 'Find Block' }}
                        </button>

                        <div v-if="dateToBlockLoading" class="tool-loading mt-4">
                            <v-progress-circular size="18" width="2" indeterminate color="#3D95CE" />
                            <span>Binary searching blocks... ({{ searchProgress }})</span>
                        </div>

                        <div v-if="dateToBlockResult" class="tool-output mt-6">
                            <div class="tool-output-header">
                                <span class="tool-output-label">Nearest Block</span>
                            </div>
                            <div class="result-grid">
                                <div class="result-row">
                                    <span class="result-key">Block</span>
                                    <a v-if="explorerBlockUrl(dateToBlockResult.number)" :href="explorerBlockUrl(dateToBlockResult.number)" target="_blank" rel="noopener noreferrer" class="result-value mono block-link">{{ dateToBlockResult.number }} <v-icon icon="mdi-open-in-new" size="12" /></a>
                                    <span v-else class="result-value mono">{{ dateToBlockResult.number }}</span>
                                    <button class="copy-btn" @click="copyToClipboard(String(dateToBlockResult.number))"><v-icon icon="mdi-content-copy" size="14" /></button>
                                </div>
                                <div class="result-row">
                                    <span class="result-key">Timestamp</span>
                                    <span class="result-value">{{ dateToBlockResult.utc }}</span>
                                </div>
                                <div class="result-row">
                                    <span class="result-key">Offset</span>
                                    <span class="result-value">{{ dateToBlockResult.offset }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="dateToBlockError" class="tool-error mt-4">{{ dateToBlockError }}</div>
                    </div>

                    <!-- BLOCK TO DATE TAB -->
                    <div v-if="activeTab === 'block-to-date'">
                        <label class="tool-label">Block number</label>
                        <input
                            v-model="blockNumberInput"
                            class="tool-input"
                            placeholder="17000000"
                            spellcheck="false"
                            type="text"
                            inputmode="numeric"
                        />

                        <button class="btn-primary mt-5" @click="handleBlockToDate" :disabled="!blockNumberInput.trim() || !rpcUrl.trim() || blockToDateLoading">
                            {{ blockToDateLoading ? 'Querying...' : 'Look Up' }}
                        </button>

                        <div v-if="blockToDateLoading" class="tool-loading mt-4">
                            <v-progress-circular size="18" width="2" indeterminate color="#3D95CE" />
                            <span>Fetching block from RPC...</span>
                        </div>

                        <div v-if="blockToDateResult" class="tool-output mt-6">
                            <div class="tool-output-header">
                                <a v-if="explorerBlockUrl(blockToDateResult.number)" :href="explorerBlockUrl(blockToDateResult.number)" target="_blank" rel="noopener noreferrer" class="tool-output-label block-link">Block #{{ blockToDateResult.number }} <v-icon icon="mdi-open-in-new" size="12" /></a>
                                <span v-else class="tool-output-label">Block #{{ blockToDateResult.number }}</span>
                            </div>
                            <div class="result-grid">
                                <div class="result-row">
                                    <span class="result-key">UTC</span>
                                    <span class="result-value">{{ blockToDateResult.utc }}</span>
                                    <button class="copy-btn" @click="copyToClipboard(blockToDateResult.utc)"><v-icon icon="mdi-content-copy" size="14" /></button>
                                </div>
                                <div class="result-row">
                                    <span class="result-key">Local</span>
                                    <span class="result-value">{{ blockToDateResult.local }}</span>
                                </div>
                                <div class="result-row">
                                    <span class="result-key">Unix</span>
                                    <span class="result-value mono">{{ blockToDateResult.unix }}</span>
                                    <button class="copy-btn" @click="copyToClipboard(String(blockToDateResult.unix))"><v-icon icon="mdi-content-copy" size="14" /></button>
                                </div>
                                <div class="result-row">
                                    <span class="result-key">Relative</span>
                                    <span class="result-value">{{ blockToDateResult.relative }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="blockToDateError" class="tool-error mt-4">{{ blockToDateError }}</div>
                    </div>

                    <!-- Inline CTA -->
                    <div v-if="blockToDateResult || dateToBlockResult" class="inline-cta mt-8">
                        <p>Browse blocks, transactions, and logs in your block explorer. Try Ethernal free.</p>
                        <a :href="`${appUrl}/auth?flow=public`" class="btn-primary btn-sm">Get Started</a>
                    </div>
                </v-col>
            </v-row>

            <!-- FAQ -->
            <div class="my-16">
                <h2 class="font-heading text-center mb-8" style="font-size: 1.8rem; color: var(--text-primary);">
                    Technical FAQ
                </h2>
                <div class="faq-list">
                    <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
                        <div class="faq-question">
                            <span>{{ faq.q }}</span>
                            <v-icon :icon="openFaqs.includes(i) ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
                        </div>
                        <div v-if="openFaqs.includes(i)" class="faq-answer">{{ faq.a }}</div>
                    </div>
                </div>
            </div>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';
import ToolsSidebar from '@/components/ToolsSidebar.vue';

const appUrl = __APP_URL__;

const chains = [
    { slug: 'ethereum', name: 'Ethereum', logo: 'ethereum.svg', rpc: 'https://ethereum-rpc.publicnode.com', explorer: 'https://etherscan.io/block/' },
    { slug: 'base', name: 'Base', logo: 'base.svg', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org/block/' },
    { slug: 'optimism', name: 'Optimism', logo: 'optimism.svg', rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io/block/' },
    { slug: 'arbitrum', name: 'Arbitrum One', logo: 'arbitrum.svg', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io/block/' },
    { slug: 'polygon', name: 'Polygon PoS', logo: 'polygon.svg', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com/block/' },
    { slug: 'bnb', name: 'BNB Chain', logo: 'bnb.svg', rpc: 'https://bsc-dataseed.binance.org', explorer: 'https://bscscan.com/block/' }
];

const activeChain = ref('ethereum');
const rpcUrl = ref('https://ethereum-rpc.publicnode.com');
const activeTab = ref('date-to-block');

const currentExplorerBase = computed(() => {
    const chain = chains.find(c => c.slug === activeChain.value);
    return chain ? chain.explorer : null;
});

function explorerBlockUrl(blockNumber) {
    return currentExplorerBase.value ? `${currentExplorerBase.value}${blockNumber}` : null;
}

// --- Block to Date ---
const blockNumberInput = ref('');
const blockToDateResult = ref(null);
const blockToDateError = ref('');
const blockToDateLoading = ref(false);

// --- Date to Block ---
const dateInput = ref('');
const dateToBlockResult = ref(null);
const dateToBlockError = ref('');
const dateToBlockLoading = ref(false);
const searchProgress = ref('');

// --- FAQ ---
const openFaqs = ref([]);

const faqs = [
    {
        q: 'How does block-to-date conversion work?',
        a: 'The tool sends an eth_getBlockByNumber JSON-RPC call to the selected RPC endpoint and reads the timestamp field from the block header. The timestamp is a Unix epoch value set by the block producer.'
    },
    {
        q: 'How does date-to-block search work?',
        a: 'The tool performs a binary search across the chain\'s block range. It starts with block 0 and the latest block, checks the midpoint\'s timestamp, and narrows the range until it finds the block closest to your target date. This typically takes 20-30 RPC calls.'
    },
    {
        q: 'Does this work with any EVM chain?',
        a: 'Yes. Any chain that supports the standard eth_getBlockByNumber and eth_blockNumber JSON-RPC methods will work. Type any RPC URL in the input field, or use the chain quick-select badges for popular chains.'
    },
    {
        q: 'Why might the timestamp be slightly off from my target date?',
        a: 'Block timestamps are set by block producers and are only guaranteed to be greater than the parent block\'s timestamp. Blocks are not mined at exact intervals, so the closest block to a given date may be a few seconds or minutes off.'
    },
    {
        q: 'Is my RPC URL or data sent to Ethernal?',
        a: 'No. All RPC calls are made directly from your browser to the RPC endpoint you specify. No data passes through Ethernal servers.'
    }
];

function toggleFaq(i) {
    const idx = openFaqs.value.indexOf(i);
    if (idx >= 0) openFaqs.value.splice(idx, 1);
    else openFaqs.value.push(i);
}

function selectChain(chain) {
    activeChain.value = chain.slug;
    rpcUrl.value = chain.rpc;
}

function onRpcManualEdit() {
    const match = chains.find(c => c.rpc === rpcUrl.value.trim());
    activeChain.value = match ? match.slug : '';
}

async function rpcCall(method, params) {
    const res = await fetch(rpcUrl.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'RPC error');
    return data.result;
}

async function getBlockTimestamp(blockNum) {
    const hex = '0x' + blockNum.toString(16);
    const block = await rpcCall('eth_getBlockByNumber', [hex, false]);
    if (!block) throw new Error(`Block ${blockNum} not found`);
    return { number: blockNum, timestamp: parseInt(block.timestamp, 16) };
}

function formatBlockResult(number, timestamp) {
    const date = new Date(timestamp * 1000);
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    let relative;
    if (diff < 0) relative = 'in the future';
    else if (diff < 60) relative = 'just now';
    else if (diff < 3600) relative = `${Math.floor(diff / 60)} minutes ago`;
    else if (diff < 86400) relative = `${Math.floor(diff / 3600)} hours ago`;
    else relative = `${Math.floor(diff / 86400)} days ago`;

    return {
        number,
        utc: date.toUTCString(),
        local: date.toLocaleString(),
        unix: timestamp,
        relative
    };
}

async function handleBlockToDate() {
    blockToDateError.value = '';
    blockToDateResult.value = null;
    const num = parseInt(blockNumberInput.value.trim(), 10);
    if (isNaN(num) || num < 0) {
        blockToDateError.value = 'Enter a valid block number (non-negative integer).';
        return;
    }

    blockToDateLoading.value = true;
    const trackProps = { tool: 'block-date-converter', action: 'block-to-date', success: false };
    try {
        const { number, timestamp } = await getBlockTimestamp(num);
        blockToDateResult.value = formatBlockResult(number, timestamp);
        trackProps.success = true;
    } catch (e) {
        blockToDateError.value = e.message || 'Failed to fetch block. Check the RPC URL and block number.';
    } finally {
        blockToDateLoading.value = false;
    }
    window.posthog?.capture('landing:tool_use', trackProps);
}

async function handleDateToBlock() {
    dateToBlockError.value = '';
    dateToBlockResult.value = null;

    const targetTs = Math.floor(new Date(dateInput.value).getTime() / 1000);
    if (isNaN(targetTs)) {
        dateToBlockError.value = 'Select a valid date.';
        return;
    }

    dateToBlockLoading.value = true;
    searchProgress.value = 'starting...';
    const trackProps = { tool: 'block-date-converter', action: 'date-to-block', success: false };

    try {
        const latestBlock = await rpcCall('eth_blockNumber', []);
        let high = parseInt(latestBlock, 16);
        let low = 0;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            searchProgress.value = `checking block ${mid.toLocaleString()}`;
            const { timestamp } = await getBlockTimestamp(mid);
            if (timestamp < targetTs) low = mid + 1;
            else high = mid;
        }

        const { timestamp } = await getBlockTimestamp(low);
        const diff = timestamp - targetTs;
        let offset;
        if (Math.abs(diff) < 60) offset = `${Math.abs(diff)} seconds ${diff >= 0 ? 'after' : 'before'} target`;
        else if (Math.abs(diff) < 3600) offset = `${Math.floor(Math.abs(diff) / 60)} minutes ${diff >= 0 ? 'after' : 'before'} target`;
        else offset = `${Math.floor(Math.abs(diff) / 3600)} hours ${diff >= 0 ? 'after' : 'before'} target`;

        dateToBlockResult.value = {
            number: low,
            utc: new Date(timestamp * 1000).toUTCString(),
            offset
        };
        trackProps.success = true;
    } catch (e) {
        dateToBlockError.value = e.message || 'Failed to search blocks. Check the RPC URL.';
    } finally {
        dateToBlockLoading.value = false;
    }
    window.posthog?.capture('landing:tool_use', trackProps);
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
}

// --- SEO ---
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Block Number / Date Converter',
        description: 'Free tool to convert between Ethereum block numbers and dates. Look up block timestamps or find the block closest to a date. Works with any EVM chain.',
        url: 'https://tryethernal.com/tools/block-date-converter',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        creator: { '@type': 'Organization', name: 'Ethernal', url: 'https://tryethernal.com' }
    },
    {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryethernal.com/' },
            { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://tryethernal.com/tools/block-date-converter' },
            { '@type': 'ListItem', position: 3, name: 'Block Date Converter' }
        ]
    },
    {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
    }
];

useHead({
    title: 'Block Number / Date Converter | Ethernal',
    meta: [
        { name: 'description', content: 'Free tool to convert between Ethereum block numbers and dates. Look up when a block was mined or find the nearest block to a date. Works with any EVM chain.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Block Number / Date Converter | Ethernal' },
        { property: 'og:description', content: 'Convert between block numbers and dates on any EVM chain. Free, runs in your browser.' },
        { property: 'og:url', content: 'https://tryethernal.com/tools/block-date-converter' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/tools/block-date-converter' }],
    script: structuredData.map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) }))
});
</script>

<style scoped>
/* Hero */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.breadcrumb-link { color: var(--text-muted); text-decoration: none; }
.breadcrumb-link:hover { color: var(--text-secondary); }
.breadcrumb-sep { opacity: 0.4; }

/* Chain badges */
.chain-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.chain-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(30, 41, 59, 0.8);
    background: rgba(17, 24, 39, 0.6); color: var(--text-secondary); cursor: pointer;
    font-size: 13px; transition: all 0.2s;
}
.chain-badge:hover { border-color: rgba(61,149,206,0.4); color: var(--text-primary); }
.chain-badge.active { background: rgba(61,149,206,0.18); border-color: rgba(61,149,206,0.5); color: #fff; }
.chain-badge-logo { width: 18px; height: 18px; border-radius: 50%; }

/* Tabs */
.tool-tabs { display: flex; gap: 2px; background: rgba(17, 24, 39, 0.5); border-radius: 10px; padding: 3px; border: 1px solid rgba(30, 41, 59, 0.5); width: fit-content; }
.tool-tab {
    padding: 8px 22px; border-radius: 8px; border: none;
    background: transparent; color: var(--text-muted); cursor: pointer; font-size: 14px; font-weight: 500;
    transition: all 0.2s;
}
.tool-tab:hover { color: var(--text-secondary); }
.tool-tab.active { background: rgba(61,149,206,0.18); color: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

/* Labels & inputs */
.tool-label { color: var(--text-muted); font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; display: block; }
.tool-input {
    width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(30, 41, 59, 0.8);
    background: rgba(17, 24, 39, 0.6); color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 13px; outline: none; transition: border-color 0.2s; box-sizing: border-box;
}
.tool-input:focus { border-color: rgba(61,149,206,0.5); }
.tool-input::placeholder { color: var(--text-muted); opacity: 0.6; }
.tool-error { color: #ffb4ab; font-size: 13px; margin-top: 6px; }
.tool-loading { color: var(--text-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }

/* Output */
.tool-output {
    background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(16px);
    border: 1px solid rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 20px 24px;
}
.tool-output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tool-output-label { color: var(--text-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }

/* Result grid */
.result-grid { display: flex; flex-direction: column; gap: 8px; }
.result-row { display: flex; align-items: center; gap: 12px; }
.result-key { color: var(--text-muted); font-size: 12px; font-weight: 600; text-transform: uppercase; min-width: 70px; }
.result-value { color: var(--text-primary); font-size: 14px; flex: 1; }
.result-value.mono { font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; }
.block-link { color: #5DAAE0; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.block-link:hover { color: #8ecdff; text-decoration: underline; }

/* Action button */
.btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Copy button */
.copy-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
.copy-btn:hover { color: var(--text-primary); background: rgba(61,149,206,0.1); }

/* Inline CTA */
.inline-cta {
    background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle); border-radius: 12px;
    padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.inline-cta p { color: var(--text-secondary); font-size: 14px; margin: 0; }
.btn-sm { padding: 8px 18px !important; font-size: 13px !important; white-space: nowrap; }

/* FAQ */
.faq-list { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; }
.faq-item { background: rgba(17, 24, 39, 0.4); border: 1px solid rgba(30, 41, 59, 0.5); border-radius: 10px; padding: 16px 20px; cursor: pointer; transition: border-color 0.2s; }
.faq-item:hover { border-color: rgba(61,149,206,0.3); }
.faq-question { display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); font-size: 15px; font-weight: 500; }
.faq-answer { color: var(--text-secondary); font-size: 14px; line-height: 1.7; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(30,41,59,0.5); }

/* Date input styling */
input[type="datetime-local"] {
    color-scheme: dark;
}

@media (max-width: 600px) {
    .inline-cta { flex-direction: column; text-align: center; }
    .chain-badges { gap: 6px; }
    .chain-badge { font-size: 12px; padding: 5px 10px; }
}
</style>
