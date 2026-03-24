<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Breadcrumb -->
            <div class="breadcrumb mb-2">
                <router-link to="/" class="breadcrumb-link">Home</router-link>
                <span class="breadcrumb-sep">/</span>
                <span>Tools</span>
                <span class="breadcrumb-sep">/</span>
                <span>Calldata Decoder</span>
            </div>

            <!-- Hero -->
            <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FREE TOOL</div>
            <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Calldata Decoder & ABI Encoder</h1>
            <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem; margin-bottom: 40px;">
                Decode raw Ethereum transaction calldata into human-readable function calls, or encode function signatures into calldata. Everything runs in your browser.
            </p>

            <!-- Two-column layout -->
            <v-row>
                <!-- Sidebar -->
                <v-col cols="12" md="3" class="d-none d-md-block">
                    <ToolsSidebar active-tool="calldata-decoder" />
                </v-col>
                <v-col cols="12" class="d-md-none">
                    <ToolsSidebar active-tool="calldata-decoder" />
                </v-col>

                <!-- Main tool area -->
                <v-col cols="12" md="9">
                    <!-- Tabs -->
                    <div class="tool-tabs mb-6">
                        <button
                            :class="['tool-tab', { active: activeTab === 'decode' }]"
                            @click="activeTab = 'decode'"
                        >Decode</button>
                        <button
                            :class="['tool-tab', { active: activeTab === 'encode' }]"
                            @click="activeTab = 'encode'"
                        >Encode</button>
                    </div>

                    <!-- DECODE TAB -->
                    <div v-if="activeTab === 'decode'">
                        <label class="tool-label">Calldata (hex)</label>
                        <textarea
                            v-model="calldataInput"
                            class="tool-input"
                            rows="4"
                            placeholder="0xa9059cbb000000000000000000000000..."
                            spellcheck="false"
                        ></textarea>
                        <div v-if="calldataError" class="tool-error">{{ calldataError }}</div>

                        <!-- Matching signatures -->
                        <div v-if="matchingSignatures.length" class="mt-4">
                            <label class="tool-label">Matching signatures</label>
                            <div class="d-flex flex-wrap ga-2">
                                <button
                                    v-for="(sig, i) in matchingSignatures"
                                    :key="i"
                                    :class="['signature-chip', { active: selectedSignature === sig.text_signature }]"
                                    @click="selectSignature(sig.text_signature)"
                                >{{ sig.text_signature }}</button>
                            </div>
                        </div>

                        <div v-if="signatureLookupLoading" class="tool-loading mt-4">
                            <v-progress-circular size="18" width="2" indeterminate color="#3D95CE" />
                            <span>Looking up signatures...</span>
                        </div>

                        <div v-if="signatureLookupError" class="tool-warning mt-4">
                            {{ signatureLookupError }} You can still decode with a custom ABI below.
                        </div>

                        <!-- Custom ABI -->
                        <div class="mt-4">
                            <button class="tool-collapse-toggle" @click="showCustomAbi = !showCustomAbi">
                                {{ showCustomAbi ? 'Hide' : 'Paste' }} custom ABI (optional)
                                <v-icon :icon="showCustomAbi ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
                            </button>
                            <textarea
                                v-if="showCustomAbi"
                                v-model="customAbiInput"
                                class="tool-input mt-2"
                                rows="4"
                                placeholder='[{"type":"function","name":"transfer","inputs":[...]}]'
                                spellcheck="false"
                            ></textarea>
                            <div v-if="abiError" class="tool-error">{{ abiError }}</div>
                        </div>

                        <button class="btn-primary mt-5" @click="handleDecode" :disabled="!calldataInput.trim()">
                            Decode
                        </button>

                        <!-- Decoded output -->
                        <div v-if="decodeResult" class="tool-output mt-6">
                            <div class="tool-output-header">
                                <span class="tool-output-label">Decoded Result</span>
                            </div>
                            <div class="tool-output-function mb-3">
                                {{ decodeResult.name }}({{ decodeResult.params.map(p => p.type).join(', ') }})
                            </div>
                            <table class="param-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Value</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="p in decodeResult.params" :key="p.index">
                                        <td>{{ p.index }}</td>
                                        <td>{{ p.name || '-' }}</td>
                                        <td><code>{{ p.type }}</code></td>
                                        <td class="param-value">{{ p.value }}</td>
                                        <td>
                                            <button class="copy-btn" @click="copyToClipboard(p.value)" title="Copy value">
                                                <v-icon icon="mdi-content-copy" size="14" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="decodeError" class="tool-error mt-4">{{ decodeError }}</div>
                    </div>

                    <!-- ENCODE TAB -->
                    <div v-if="activeTab === 'encode'">
                        <label class="tool-label">Function signature</label>
                        <input
                            v-model="encodeSignatureInput"
                            class="tool-input"
                            placeholder="transfer(address,uint256)"
                            spellcheck="false"
                        />
                        <div v-if="encodeSignatureError" class="tool-error">{{ encodeSignatureError }}</div>

                        <!-- Dynamic param inputs -->
                        <div v-if="encodeParsedTypes.length" class="mt-4">
                            <label class="tool-label">Parameters</label>
                            <div v-for="(type, i) in encodeParsedTypes" :key="i" class="encode-param-row">
                                <span class="encode-param-type">{{ type }}</span>
                                <input
                                    v-model="encodeParamValues[i]"
                                    class="tool-input encode-param-input"
                                    :placeholder="getPlaceholder(type)"
                                    spellcheck="false"
                                />
                            </div>
                        </div>

                        <button class="btn-primary mt-5" @click="handleEncode" :disabled="!encodeSignatureInput.trim()">
                            Encode
                        </button>

                        <!-- Encoded output -->
                        <div v-if="encodeResult" class="tool-output mt-6">
                            <div class="tool-output-header">
                                <span class="tool-output-label">Encoded Calldata</span>
                                <button class="copy-btn" @click="copyToClipboard(encodeResult)" title="Copy calldata">
                                    <v-icon icon="mdi-content-copy" size="14" />
                                </button>
                            </div>
                            <code class="tool-output-hex">{{ encodeResult }}</code>
                        </div>

                        <div v-if="encodeError" class="tool-error mt-4">{{ encodeError }}</div>
                    </div>

                    <!-- Inline CTA -->
                    <div v-if="decodeResult || encodeResult" class="inline-cta mt-8">
                        <p>Decode transactions automatically in your block explorer. Try Ethernal free.</p>
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
import {
    parseSignature, decodeCalldata, decodeCalldataWithAbi,
    encodeCalldata, lookup4byte
} from '@/composables/useEvmTools.js';

const appUrl = __APP_URL__;

// --- Decode state ---
const activeTab = ref('decode');
const calldataInput = ref('');
const calldataError = ref('');
const matchingSignatures = ref([]);
const selectedSignature = ref('');
const signatureLookupLoading = ref(false);
const signatureLookupError = ref('');
const showCustomAbi = ref(false);
const customAbiInput = ref('');
const abiError = ref('');
const decodeResult = ref(null);
const decodeError = ref('');

// --- Encode state ---
const encodeSignatureInput = ref('');
const encodeSignatureError = ref('');
const encodeParsedTypes = ref([]);
const encodeParamValues = ref([]);
const encodeResult = ref(null);
const encodeError = ref('');

// --- FAQ state ---
const openFaqs = ref([]);

const faqs = [
    {
        q: 'What is calldata?',
        a: 'Calldata is the encoded data sent with an Ethereum transaction to call a smart contract function. It contains a 4-byte function selector followed by ABI-encoded parameters. This tool decodes that data back into human-readable function names and parameter values.'
    },
    {
        q: 'How does the 4-byte signature matching work?',
        a: 'The first 4 bytes of calldata are the function selector, computed as the first 4 bytes of the keccak256 hash of the function signature. This tool looks up that selector in the 4byte.directory database to find matching function signatures.'
    },
    {
        q: 'Can I decode calldata without an ABI?',
        a: 'Yes, but with limitations. Without an ABI, the tool uses 4byte.directory to identify the function signature. This gives you parameter types and decoded values, but not parameter names. For full decoding with parameter names, paste the contract ABI.'
    },
    {
        q: 'What encoding does this support?',
        a: 'This tool supports standard Solidity ABI encoding as defined in the Solidity specification. It does not support non-standard packed encoding (abi.encodePacked) or custom encoding schemes.'
    },
    {
        q: 'Is my data sent to any server?',
        a: 'Decoding and encoding happen entirely in your browser using JavaScript. The only external request is to 4byte.directory to look up function signatures by selector. No transaction data is sent to any server.'
    }
];

function toggleFaq(i) {
    const idx = openFaqs.value.indexOf(i);
    if (idx >= 0) openFaqs.value.splice(idx, 1);
    else openFaqs.value.push(i);
}

// --- Decode logic ---
let lookupTimeout = null;
watch(calldataInput, (val) => {
    clearTimeout(lookupTimeout);
    calldataError.value = '';
    matchingSignatures.value = [];
    selectedSignature.value = '';
    signatureLookupError.value = '';
    decodeResult.value = null;
    decodeError.value = '';

    const hex = val.trim();
    if (!hex) return;

    if (!/^(0x)?[0-9a-fA-F]+$/.test(hex)) {
        calldataError.value = 'Invalid hex string';
        return;
    }
    const normalized = hex.startsWith('0x') ? hex : `0x${hex}`;
    if (normalized.length < 10) return;
    lookupTimeout = setTimeout(async () => {
        const selector = normalized.slice(0, 10);
        signatureLookupLoading.value = true;
        try {
            const results = await lookup4byte(selector);
            const valid = [];
            for (const sig of results) {
                try {
                    const fragment = parseSignature(sig.text_signature);
                    await decodeCalldata(normalized, fragment);
                    valid.push(sig);
                } catch {}
            }
            matchingSignatures.value = valid.sort((a, b) => a.text_signature.length - b.text_signature.length);
        } catch (e) {
            signatureLookupError.value = 'Could not reach signature database.';
        } finally {
            signatureLookupLoading.value = false;
        }
    }, 300);
});

async function selectSignature(sig) {
    selectedSignature.value = sig;
    await handleDecode();
}

async function handleDecode() {
    decodeError.value = '';
    decodeResult.value = null;
    abiError.value = '';

    const hex = calldataInput.value.trim();
    if (!hex) return;

    const trackProps = { tool: 'calldata-decoder', action: 'decode', success: false };

    try {
        if (customAbiInput.value.trim()) {
            const abi = JSON.parse(customAbiInput.value.trim());
            const result = await decodeCalldataWithAbi(hex, abi);
            decodeResult.value = result;
        } else if (selectedSignature.value) {
            const fragment = parseSignature(selectedSignature.value);
            const result = await decodeCalldata(hex, fragment);
            decodeResult.value = result;
        } else if (matchingSignatures.value.length === 1) {
            const sig = matchingSignatures.value[0].text_signature;
            selectedSignature.value = sig;
            const fragment = parseSignature(sig);
            const result = await decodeCalldata(hex, fragment);
            decodeResult.value = result;
        } else {
            decodeError.value = 'Select a matching signature above or paste a custom ABI.';
            window.posthog?.capture('landing:tool_use', trackProps);
            return;
        }
        trackProps.success = true;
    } catch (e) {
        if (e.message.includes('parse')) abiError.value = e.message;
        else decodeError.value = e.message || 'Failed to decode calldata';
    }
    window.posthog?.capture('landing:tool_use', trackProps);
}

// --- Encode logic ---
let parseTimeout = null;
watch(encodeSignatureInput, (val) => {
    encodeSignatureError.value = '';
    encodeParsedTypes.value = [];
    encodeParamValues.value = [];
    encodeResult.value = null;
    encodeError.value = '';

    if (!val.trim()) return;

    clearTimeout(parseTimeout);
    parseTimeout = setTimeout(() => {
        try {
            const { types } = parseSignature(val.trim());
            encodeParsedTypes.value = types;
            encodeParamValues.value = new Array(types.length).fill('');
        } catch (e) {
            encodeSignatureError.value = e.message;
        }
    }, 500);
});

async function handleEncode() {
    encodeError.value = '';
    encodeResult.value = null;
    const trackProps = { tool: 'calldata-decoder', action: 'encode', success: false };

    try {
        const result = await encodeCalldata(encodeSignatureInput.value.trim(), encodeParamValues.value);
        encodeResult.value = result;
        trackProps.success = true;
    } catch (e) {
        encodeError.value = e.message || 'Failed to encode calldata';
    }
    window.posthog?.capture('landing:tool_use', trackProps);
}

function getPlaceholder(type) {
    if (type === 'address') return '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
    if (type.startsWith('uint') || type.startsWith('int')) return '1000000';
    if (type === 'bool') return 'true';
    if (type === 'string') return 'hello';
    if (type.startsWith('bytes')) return '0x...';
    return '';
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
}

// --- SEO ---
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Calldata Decoder & ABI Encoder',
        description: 'Free online tool to decode Ethereum transaction calldata into human-readable function calls, or encode function signatures into calldata.',
        url: 'https://tryethernal.com/tools/calldata-decoder',
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
            { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://tryethernal.com/tools/calldata-decoder' },
            { '@type': 'ListItem', position: 3, name: 'Calldata Decoder' }
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
    title: 'Calldata Decoder & ABI Encoder | Ethernal',
    meta: [
        { name: 'description', content: 'Free online tool to decode Ethereum calldata and encode ABI function calls. Supports auto signature lookup and custom ABIs. No server, runs in your browser.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Calldata Decoder & ABI Encoder | Ethernal' },
        { property: 'og:description', content: 'Decode raw Ethereum calldata into human-readable function calls. Free, open-source, runs in your browser.' },
        { property: 'og:url', content: 'https://tryethernal.com/tools/calldata-decoder' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/tools/calldata-decoder' }],
    script: structuredData.map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) }))
});
</script>

<style scoped>
/* Hero */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.breadcrumb-link { color: var(--text-muted); text-decoration: none; }
.breadcrumb-link:hover { color: var(--text-secondary); }
.breadcrumb-sep { opacity: 0.4; }
.tool-title { font-size: clamp(1.5rem, 3vw, 2.2rem); color: var(--text-primary); line-height: 1.2; font-weight: 700; letter-spacing: -0.02em; }
.tool-description { color: var(--text-secondary); font-size: 0.95rem; max-width: 560px; line-height: 1.6; }

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
    font-size: 13px; resize: vertical; outline: none; transition: border-color 0.2s; box-sizing: border-box;
}
.tool-input:focus { border-color: rgba(61,149,206,0.5); }
.tool-input::placeholder { color: var(--text-muted); opacity: 0.6; }
.tool-error { color: #ffb4ab; font-size: 13px; margin-top: 6px; }
.tool-warning { color: #ffba50; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.tool-loading { color: var(--text-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }

/* Signature chips */
.signature-chip {
    padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(61, 149, 206, 0.3);
    background: rgba(61, 149, 206, 0.08); color: #e2e8f0; cursor: pointer; font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; transition: all 0.2s;
}
.signature-chip:hover { border-color: rgba(61,149,206,0.5); background: rgba(61,149,206,0.15); color: #fff; }
.signature-chip.active { background: rgba(61,149,206,0.25); border-color: rgba(61,149,206,0.6); color: #fff; }

/* Collapse toggle */
.tool-collapse-toggle {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    font-size: 13px; display: flex; align-items: center; gap: 4px; padding: 0;
}
.tool-collapse-toggle:hover { color: var(--text-secondary); }

/* Output */
.tool-output {
    background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(16px);
    border: 1px solid rgba(30, 41, 59, 0.6); border-radius: 12px; padding: 20px 24px;
}
.tool-output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tool-output-label { color: var(--text-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.tool-output-function { color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 14px; }
.tool-output-hex { color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 13px; word-break: break-all; display: block; margin-top: 8px; line-height: 1.6; }

/* Param table */
.param-table { width: 100%; border-collapse: collapse; }
.param-table th { color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; padding: 8px 12px; border-bottom: 1px solid rgba(30,41,59,0.6); }
.param-table td { color: var(--text-secondary); font-size: 13px; padding: 10px 12px; border-bottom: 1px solid rgba(30,41,59,0.3); vertical-align: top; }
.param-table code { color: #8ecdff; font-size: 12px; }
.param-value { font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; word-break: break-all; max-width: 340px; }

/* Action button base (btn-primary is global but lacks padding/radius for non-Vuetify elements) */
.btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* Copy button */
.copy-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
.copy-btn:hover { color: var(--text-primary); background: rgba(61,149,206,0.1); }

/* Encode params */
.encode-param-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.encode-param-type { color: #8ecdff; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 13px; min-width: 100px; flex-shrink: 0; }
.encode-param-input { flex: 1; }

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
    .tool-title { font-size: 1.5rem; }
    .inline-cta { flex-direction: column; text-align: center; }
    .encode-param-row { flex-direction: column; align-items: stretch; gap: 4px; }
    .encode-param-type { min-width: 0; }
}
</style>
