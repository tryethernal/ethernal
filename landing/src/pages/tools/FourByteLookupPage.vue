<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Breadcrumb -->
            <div class="breadcrumb mb-2">
                <router-link to="/" class="breadcrumb-link">Home</router-link>
                <span class="breadcrumb-sep">/</span>
                <span>Tools</span>
                <span class="breadcrumb-sep">/</span>
                <span>4byte Lookup</span>
            </div>

            <!-- Hero -->
            <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FREE TOOL</div>
            <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">4byte Function Signature Lookup</h1>
            <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem; margin-bottom: 40px;">
                Look up Ethereum function signatures by their 4-byte selector, or search signatures by name. Uses the 4byte.directory database and client-side keccak256 hashing.
            </p>

            <!-- Two-column layout -->
            <v-row>
                <v-col cols="12" md="3" class="d-none d-md-block">
                    <ToolsSidebar active-tool="4byte-lookup" />
                </v-col>
                <v-col cols="12" class="d-md-none">
                    <ToolsSidebar active-tool="4byte-lookup" />
                </v-col>

                <v-col cols="12" md="9">
                    <!-- Tabs -->
                    <div class="tool-tabs mb-6">
                        <button :class="['tool-tab', { active: activeTab === 'lookup' }]" @click="activeTab = 'lookup'">Lookup by Selector</button>
                        <button :class="['tool-tab', { active: activeTab === 'search' }]" @click="activeTab = 'search'">Search by Name</button>
                    </div>

                    <!-- LOOKUP TAB -->
                    <div v-if="activeTab === 'lookup'">
                        <label class="tool-label">Function selector or signature</label>
                        <input
                            v-model="selectorInput"
                            class="tool-input"
                            placeholder="0xa9059cbb or transfer(address,uint256)"
                            spellcheck="false"
                        />
                        <div v-if="selectorError" class="tool-error">{{ selectorError }}</div>

                        <div v-if="lookupLoading" class="tool-loading mt-4">
                            <v-progress-circular size="18" width="2" indeterminate color="#3D95CE" />
                            <span>Looking up signatures...</span>
                        </div>

                        <div v-if="lookupError" class="tool-warning mt-4">{{ lookupError }}</div>

                        <!-- Computed selector (when user types a signature) -->
                        <div v-if="computedSelector" class="tool-output mt-6">
                            <div class="tool-output-header">
                                <span class="tool-output-label">Computed Selector</span>
                                <button class="copy-btn" @click="copyToClipboard(computedSelector)" title="Copy selector">
                                    <v-icon icon="mdi-content-copy" size="14" />
                                </button>
                            </div>
                            <code class="tool-output-hex">{{ computedSelector }}</code>
                        </div>

                        <!-- API results -->
                        <div v-if="lookupResults.length" class="mt-6">
                            <label class="tool-label">Matching signatures ({{ lookupResults.length }})</label>
                            <div class="results-list">
                                <div v-for="(sig, i) in lookupResults" :key="i" class="result-item">
                                    <code class="result-signature">{{ sig.text_signature }}</code>
                                    <button class="copy-btn" @click="copyToClipboard(sig.text_signature)" title="Copy signature">
                                        <v-icon icon="mdi-content-copy" size="14" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div v-if="lookupEmpty" class="tool-empty mt-6">No signatures found for this selector.</div>
                    </div>

                    <!-- SEARCH TAB -->
                    <div v-if="activeTab === 'search'">
                        <label class="tool-label">Function name</label>
                        <input
                            v-model="searchInput"
                            class="tool-input"
                            placeholder="transfer"
                            spellcheck="false"
                        />

                        <div v-if="searchLoading" class="tool-loading mt-4">
                            <v-progress-circular size="18" width="2" indeterminate color="#3D95CE" />
                            <span>Searching...</span>
                        </div>

                        <div v-if="searchError" class="tool-warning mt-4">{{ searchError }}</div>

                        <div v-if="searchResults.length" class="mt-6">
                            <label class="tool-label">Results ({{ searchResults.length }})</label>
                            <div class="results-list">
                                <div v-for="(sig, i) in searchResults" :key="i" class="result-item">
                                    <code class="result-signature">{{ sig.text_signature }}</code>
                                    <span v-if="sig.hex_signature" class="result-selector">{{ sig.hex_signature }}</span>
                                    <button class="copy-btn" @click="copyToClipboard(sig.text_signature)" title="Copy signature">
                                        <v-icon icon="mdi-content-copy" size="14" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div v-if="searchEmpty" class="tool-empty mt-6">No signatures found matching "{{ searchInput }}".</div>
                    </div>

                    <!-- Inline CTA -->
                    <div v-if="lookupResults.length || searchResults.length || computedSelector" class="inline-cta mt-8">
                        <p>See decoded function calls in real-time. Try Ethernal's block explorer.</p>
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
import { ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';
import ToolsSidebar from '@/components/ToolsSidebar.vue';
import { computeSelector, parseSignature, lookup4byte, search4byte } from '@/composables/useEvmTools.js';

const appUrl = __APP_URL__;

// --- Lookup tab state ---
const activeTab = ref('lookup');
const selectorInput = ref('');
const selectorError = ref('');
const lookupLoading = ref(false);
const lookupError = ref('');
const lookupResults = ref([]);
const lookupEmpty = ref(false);
const computedSelector = ref('');

// --- Search tab state ---
const searchInput = ref('');
const searchLoading = ref(false);
const searchError = ref('');
const searchResults = ref([]);
const searchEmpty = ref(false);

// --- FAQ ---
const openFaqs = ref([]);

const faqs = [
    {
        q: 'What is a 4-byte function selector?',
        a: 'A 4-byte function selector is the first 4 bytes of the keccak256 hash of a function\'s canonical signature. For example, transfer(address,uint256) hashes to 0xa9059cbb. EVM transactions use this selector to identify which function to call on a contract.'
    },
    {
        q: 'Where does the signature data come from?',
        a: 'Function signatures are looked up from 4byte.directory, an open community database of Ethereum function signatures. Additionally, this tool computes keccak256 hashes client-side when you type a full function signature.'
    },
    {
        q: 'Can multiple functions have the same selector?',
        a: 'Yes. Since selectors are only 4 bytes (2^32 possibilities), hash collisions can occur. Different function signatures can produce the same 4-byte selector. This tool shows all known matching signatures so you can identify the correct one.'
    },
    {
        q: 'How do I compute a selector for my own function?',
        a: 'Just type your function signature in the lookup field (e.g., "myFunction(address,uint256)"). The tool detects it\'s a signature rather than a hex selector and computes the keccak256 hash to give you the 4-byte selector.'
    }
];

function toggleFaq(i) {
    const idx = openFaqs.value.indexOf(i);
    if (idx >= 0) openFaqs.value.splice(idx, 1);
    else openFaqs.value.push(i);
}

// --- Lookup logic ---
function isSelector(val) {
    return /^(0x)?[0-9a-fA-F]{8}$/.test(val.trim());
}

function isSignature(val) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*\(.*\)$/.test(val.trim());
}

let lookupTimeout = null;
watch(selectorInput, (val) => {
    selectorError.value = '';
    lookupResults.value = [];
    lookupEmpty.value = false;
    lookupError.value = '';
    computedSelector.value = '';

    const trimmed = val.trim();
    if (!trimmed) return;

    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(async () => {
        const trackProps = { tool: '4byte-lookup', action: 'lookup', success: false };

        if (isSignature(trimmed)) {
            try {
                const sel = await computeSelector(trimmed);
                computedSelector.value = sel;
                const results = await lookup4byte(sel);
                lookupResults.value = results;
                lookupEmpty.value = results.length === 0;
                trackProps.success = true;
            } catch (e) {
                if (e.message.includes('parse')) selectorError.value = e.message;
                else lookupError.value = 'Could not reach signature database.';
            }
            window.posthog?.capture('landing:tool_use', trackProps);
        } else if (isSelector(trimmed)) {
            lookupLoading.value = true;
            try {
                const hex = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
                const results = await lookup4byte(hex);
                lookupResults.value = results;
                lookupEmpty.value = results.length === 0;
                trackProps.success = results.length > 0;
            } catch (e) {
                lookupError.value = 'Could not reach signature database.';
            } finally {
                lookupLoading.value = false;
            }
            window.posthog?.capture('landing:tool_use', trackProps);
        } else if (trimmed.length >= 10 && /^(0x)?[0-9a-fA-F]+$/.test(trimmed)) {
            selectorError.value = 'Selector must be exactly 4 bytes (0x + 8 hex chars)';
        }
    }, 300);
});

// --- Search logic ---
let searchTimeout = null;
watch(searchInput, (val) => {
    searchError.value = '';
    searchResults.value = [];
    searchEmpty.value = false;

    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 2) return;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        searchLoading.value = true;
        const trackProps = { tool: '4byte-lookup', action: 'search', success: false };
        try {
            const results = await search4byte(trimmed);
            searchResults.value = results;
            searchEmpty.value = results.length === 0;
            trackProps.success = results.length > 0;
        } catch (e) {
            searchError.value = 'Could not reach signature database.';
        } finally {
            searchLoading.value = false;
        }
        window.posthog?.capture('landing:tool_use', trackProps);
    }, 300);
});

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
}

// --- SEO ---
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '4byte Function Signature Lookup',
        description: 'Free tool to look up Ethereum function signatures by 4-byte selector or search by name. Uses 4byte.directory and client-side keccak256.',
        url: 'https://tryethernal.com/tools/4byte-lookup',
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
            { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://tryethernal.com/tools/4byte-lookup' },
            { '@type': 'ListItem', position: 3, name: '4byte Lookup' }
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
    title: '4byte Function Signature Lookup | Ethernal',
    meta: [
        { name: 'description', content: 'Free online tool to look up Ethereum function signatures by 4-byte selector or search by name. Client-side keccak256 hashing. No server required.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: '4byte Function Signature Lookup | Ethernal' },
        { property: 'og:description', content: 'Look up Ethereum function signatures by selector or search by name. Free, runs in your browser.' },
        { property: 'og:url', content: 'https://tryethernal.com/tools/4byte-lookup' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/tools/4byte-lookup' }],
    script: structuredData.map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) }))
});
</script>

<style scoped>
/* Hero */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.breadcrumb-link { color: var(--text-muted); text-decoration: none; }
.breadcrumb-link:hover { color: var(--text-secondary); }
.breadcrumb-sep { opacity: 0.4; }

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
.tool-warning { color: #ffba50; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.tool-loading { color: var(--text-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }
.tool-empty { color: var(--text-muted); font-size: 14px; font-style: italic; }

/* Output */
.tool-output {
    background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(16px);
    border: 1px solid rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 20px 24px;
}
.tool-output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tool-output-label { color: var(--text-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.tool-output-hex { color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 14px; display: block; margin-top: 4px; }

/* Results list */
.results-list { display: flex; flex-direction: column; gap: 4px; }
.result-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 14px;
    background: rgba(17,24,39,0.4); border: 1px solid rgba(30,41,59,0.5);
    border-radius: 8px; transition: border-color 0.2s;
}
.result-item:hover { border-color: rgba(61,149,206,0.3); }
.result-signature { color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 13px; flex: 1; }
.result-selector { color: var(--text-muted); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 12px; }

/* Action button base */
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

@media (max-width: 600px) {
    .inline-cta { flex-direction: column; text-align: center; }
}
</style>
