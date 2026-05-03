<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <!-- Breadcrumb -->
            <div class="breadcrumb mb-2">
                <router-link to="/" class="breadcrumb-link">Home</router-link>
                <span class="breadcrumb-sep">/</span>
                <span>Tools</span>
                <span class="breadcrumb-sep">/</span>
                <span>Unit Converter</span>
            </div>

            <!-- Hero -->
            <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">FREE TOOL</div>
            <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Ethereum Unit Converter</h1>
            <p style="color: var(--text-secondary); max-width: 560px; line-height: 1.6; font-size: 0.95rem; margin-bottom: 40px;">
                Convert between Wei, Gwei, Ether, and all Ethereum denominations. Type in any field and the others update instantly. Runs entirely in your browser.
            </p>

            <!-- Two-column layout -->
            <v-row>
                <v-col cols="12" md="3" class="d-none d-md-block">
                    <ToolsSidebar active-tool="unit-converter" />
                </v-col>
                <v-col cols="12" class="d-md-none">
                    <ToolsSidebar active-tool="unit-converter" />
                </v-col>

                <v-col cols="12" md="9">
                    <div v-if="conversionError" class="tool-error mb-4">{{ conversionError }}</div>

                    <div class="unit-list">
                        <div v-for="unit in units" :key="unit.name" class="unit-row">
                            <div class="unit-meta">
                                <span class="unit-name">{{ unit.name }}</span>
                                <span class="unit-decimals">10<sup>{{ unit.decimals }}</sup></span>
                            </div>
                            <div class="unit-input-wrap">
                                <input
                                    :value="unit.displayValue"
                                    class="tool-input unit-input"
                                    :placeholder="unit.name === 'Ether' ? '1.0' : '0'"
                                    spellcheck="false"
                                    @input="handleInput(unit, $event)"
                                />
                                <button class="copy-btn copy-btn-inside" @click="copyToClipboard(unit.displayValue)" title="Copy value">
                                    <v-icon icon="mdi-content-copy" size="14" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Inline CTA -->
                    <div v-if="hasValue" class="inline-cta mt-8">
                        <p>View gas costs and token values in your block explorer. Try Ethernal free.</p>
                        <a :href="`${appUrl}/auth?flow=public&utm_source=tool&utm_medium=inline_cta&utm_campaign=unit_converter`" class="btn-primary btn-sm" @click="trackCta">Get Started</a>
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
import { ref, reactive, computed } from 'vue';
import { useHead } from '@vueuse/head';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';
import ToolsSidebar from '@/components/ToolsSidebar.vue';
import { ETH_UNITS, convertEthUnits } from '@/composables/useEvmTools.js';

const appUrl = __APP_URL__;

function trackCta() {
    window.posthog?.capture('landing:tool_cta_click', { tool: 'unit_converter' });
}

const units = reactive(ETH_UNITS.map(u => ({ ...u, displayValue: '' })));
const conversionError = ref('');
const hasValue = computed(() => units.some(u => u.displayValue !== ''));

let convertTimeout = null;
async function handleInput(sourceUnit, event) {
    const raw = event.target.value;
    conversionError.value = '';

    if (!raw.trim()) {
        for (const u of units) u.displayValue = '';
        return;
    }

    sourceUnit.displayValue = raw;

    clearTimeout(convertTimeout);
    convertTimeout = setTimeout(async () => {
        const trackProps = { tool: 'unit-converter', action: 'convert', success: false };
        try {
            const results = await convertEthUnits(raw.trim(), sourceUnit.decimals);
            for (const r of results) {
                const target = units.find(u => u.name === r.name);
                if (target && target.name !== sourceUnit.name) {
                    target.displayValue = trimTrailingZeros(r.value);
                }
            }
            trackProps.success = true;
        } catch (e) {
            conversionError.value = 'Invalid number. Enter a valid integer or decimal value.';
        }
        window.posthog?.capture('landing:tool_use', trackProps);
    }, 150);
}

function trimTrailingZeros(val) {
    if (!val.includes('.')) return val;
    return val.replace(/\.?0+$/, '');
}

async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); } catch {}
}

// --- FAQ ---
const openFaqs = ref([]);
const faqs = [
    {
        q: 'What is Wei?',
        a: 'Wei is the smallest denomination of Ether. 1 Ether = 10^18 Wei. The EVM internally represents all values in Wei. Named after Wei Dai, the cryptographer who created b-money.'
    },
    {
        q: 'What is Gwei?',
        a: 'Gwei (gigawei) equals 10^9 Wei, or 0.000000001 Ether. Gas prices on Ethereum are typically expressed in Gwei. A gas price of 20 Gwei means each unit of gas costs 20 billion Wei.'
    },
    {
        q: 'Why are there so many denominations?',
        a: 'Ethereum uses a range of denominations (Wei, Kwei, Mwei, Gwei, Szabo, Finney, Ether) to make different scales of value readable. Gas prices use Gwei, token amounts use Ether, and smart contracts work in Wei. This is similar to how traditional currencies use cents, dollars, and larger denominations.'
    },
    {
        q: 'How does precision work?',
        a: 'This converter uses arbitrary-precision arithmetic via ethers.js BigNumber, so there is no floating-point rounding error. All conversions are exact. The EVM itself only works with integers (Wei), so precision loss only occurs when displaying fractional Ether values.'
    },
    {
        q: 'Is my data sent to any server?',
        a: 'No. All conversions happen entirely in your browser using ethers.js. No data is sent to any server.'
    }
];

function toggleFaq(i) {
    const idx = openFaqs.value.indexOf(i);
    if (idx >= 0) openFaqs.value.splice(idx, 1);
    else openFaqs.value.push(i);
}

// --- SEO ---
const structuredData = [
    {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Ethereum Unit Converter',
        description: 'Free online tool to convert between Wei, Gwei, Ether, and all Ethereum denominations. Arbitrary-precision, runs in your browser.',
        url: 'https://tryethernal.com/tools/unit-converter',
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
            { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://tryethernal.com/tools/unit-converter' },
            { '@type': 'ListItem', position: 3, name: 'Unit Converter' }
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
    title: 'Ethereum Unit Converter - Wei, Gwei, ETH | Ethernal',
    meta: [
        { name: 'description', content: 'Free Ethereum unit converter. Convert between Wei, Gwei, Ether, Finney, Szabo, and all EVM denominations. Arbitrary-precision, runs in your browser.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Ethereum Unit Converter - Wei, Gwei, ETH | Ethernal' },
        { property: 'og:description', content: 'Convert between Wei, Gwei, Ether, and all Ethereum denominations. Free, runs in your browser.' },
        { property: 'og:url', content: 'https://tryethernal.com/tools/unit-converter' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link: [{ rel: 'canonical', href: 'https://tryethernal.com/tools/unit-converter' }],
    script: structuredData.map(d => ({ type: 'application/ld+json', children: JSON.stringify(d) }))
});
</script>

<style scoped>
/* Hero */
.breadcrumb { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
.breadcrumb-link { color: var(--text-muted); text-decoration: none; }
.breadcrumb-link:hover { color: var(--text-secondary); }
.breadcrumb-sep { opacity: 0.4; }

/* Unit list */
.unit-list { display: flex; flex-direction: column; gap: 8px; }
.unit-row { display: flex; align-items: center; gap: 16px; }
.unit-meta { min-width: 120px; display: flex; flex-direction: column; gap: 2px; }
.unit-name { color: var(--text-primary); font-size: 14px; font-weight: 600; }
.unit-decimals { color: var(--text-muted); font-size: 12px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; }
.unit-input-wrap { flex: 1; position: relative; }
.unit-input { padding-right: 36px !important; }
.copy-btn-inside { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); }

/* Labels & inputs */
.tool-input {
    width: 100%; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(30, 41, 59, 0.8);
    background: rgba(17, 24, 39, 0.6); color: var(--text-primary); font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
    font-size: 13px; outline: none; transition: border-color 0.2s; box-sizing: border-box;
}
.tool-input:focus { border-color: rgba(61,149,206,0.5); }
.tool-input::placeholder { color: var(--text-muted); opacity: 0.6; }
.tool-error { color: #ffb4ab; font-size: 13px; margin-top: 6px; }

/* Copy button */
.copy-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; }
.copy-btn:hover { color: var(--text-primary); background: rgba(61,149,206,0.1); }

/* Action button */
.btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; text-decoration: none; white-space: nowrap;
}

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
    .unit-row { flex-direction: column; align-items: stretch; gap: 4px; }
    .unit-meta { min-width: 0; flex-direction: row; align-items: baseline; gap: 8px; }
    .inline-cta { flex-direction: column; text-align: center; }
}
</style>
