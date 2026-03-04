<template>
    <section class="landing-section">
        <v-container style="max-width: 1200px;">
            <div class="text-center mb-14" style="max-width: 700px; margin: 0 auto;">
                <h2 class="font-heading mb-4" style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; color: #F1F5F9; letter-spacing: -0.02em;">
                    Everything you need to <span class="gradient-text">explore your chain</span>
                </h2>
                <p style="color: #94A3B8; max-width: 560px; margin: 0 auto; line-height: 1.7; font-size: 1.05rem;">
                    From transaction decoding to contract verification, Ethernal provides
                    a complete toolkit for understanding your blockchain.
                </p>
            </div>

            <div
                class="features-showcase"
                @mouseenter="pauseRotation"
                @mouseleave="resumeRotation"
            >
                <v-row>
                    <!-- Left: Feature list (two columns) -->
                    <v-col cols="12" md="5">
                        <div class="feature-list-grid">
                            <div class="feature-list">
                                <button
                                    v-for="(feature, i) in featuresLeft"
                                    :key="feature.title"
                                    class="feature-item"
                                    :class="{ active: activeIndex === i }"
                                    @click="setActive(i)"
                                >
                                    <div class="feature-item-indicator">
                                        <div
                                            class="feature-item-progress"
                                            :class="{ animating: activeIndex === i && !isPaused }"
                                            :style="activeIndex === i && isPaused ? { width: pausedProgress + '%' } : {}"
                                        ></div>
                                    </div>
                                    <div class="feature-item-content">
                                        <h3 class="feature-item-title">{{ feature.title }}</h3>
                                        <p
                                            class="feature-item-desc"
                                            :class="{ expanded: activeIndex === i }"
                                        >{{ feature.desc }}</p>
                                    </div>
                                </button>
                            </div>
                            <div class="feature-list">
                                <button
                                    v-for="(feature, i) in featuresRight"
                                    :key="feature.title"
                                    class="feature-item"
                                    :class="{ active: activeIndex === i + splitIndex }"
                                    @click="setActive(i + splitIndex)"
                                >
                                    <div class="feature-item-indicator">
                                        <div
                                            class="feature-item-progress"
                                            :class="{ animating: activeIndex === i + splitIndex && !isPaused }"
                                            :style="activeIndex === i + splitIndex && isPaused ? { width: pausedProgress + '%' } : {}"
                                        ></div>
                                    </div>
                                    <div class="feature-item-content">
                                        <h3 class="feature-item-title">{{ feature.title }}</h3>
                                        <p
                                            class="feature-item-desc"
                                            :class="{ expanded: activeIndex === i + splitIndex }"
                                        >{{ feature.desc }}</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </v-col>

                    <!-- Right: Visual preview -->
                    <v-col cols="12" md="7" class="d-flex align-center">
                        <div class="feature-preview-wrap">
                            <transition name="preview-fade" mode="out-in">
                                <div :key="activeIndex" class="feature-preview">
                                    <div class="preview-header">
                                        <div class="d-flex align-center ga-2">
                                            <span class="dot red"></span>
                                            <span class="dot yellow"></span>
                                            <span class="dot green"></span>
                                        </div>
                                        <div class="preview-url-bar">
                                            <v-icon size="12" style="color: #64748B;">mdi-lock</v-icon>
                                            {{ features[activeIndex].url }}
                                        </div>
                                        <div style="width: 42px;"></div>
                                    </div>
                                    <div class="preview-body">
                                        <component :is="features[activeIndex].component" />
                                    </div>
                                </div>
                            </transition>
                        </div>
                    </v-col>
                </v-row>
            </div>
        </v-container>
    </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, markRaw } from 'vue';

const ROTATION_INTERVAL = 6000;

const activeIndex = ref(0);
const isPaused = ref(false);
const pausedProgress = ref(0);
let timer = null;
let startTime = 0;

function setActive(i) {
    activeIndex.value = i;
    restartTimer();
}

function pauseRotation() {
    isPaused.value = true;
    const elapsed = Date.now() - startTime;
    pausedProgress.value = Math.min((elapsed / ROTATION_INTERVAL) * 100, 100);
    if (timer) clearInterval(timer);
}

function resumeRotation() {
    isPaused.value = false;
    pausedProgress.value = 0;
    restartTimer();
}

function restartTimer() {
    if (timer) clearInterval(timer);
    startTime = Date.now();
    timer = setInterval(() => {
        activeIndex.value = (activeIndex.value + 1) % features.length;
        startTime = Date.now();
    }, ROTATION_INTERVAL);
}

onMounted(() => restartTimer());
onUnmounted(() => { if (timer) clearInterval(timer); });

// --- Mockup sub-components ---

const PreviewTracing = markRaw({
    render() {
        return h('div', { class: 'mock-tracing' }, [
            h('div', { class: 'mock-trace-header' }, [
                h('span', { class: 'mock-label' }, 'Call Trace'),
                h('span', { class: 'mock-badge success' }, 'Success'),
            ]),
            h('div', { class: 'mock-trace-tree' }, [
                traceNode('CALL', '0x7a25…f832', 'swap(uint256,address)', '0.5 ETH', 0),
                traceNode('STATICCALL', '0x1f98…4e23', 'getReserves()', '', 1),
                traceNode('CALL', '0xdac1…1ec7', 'transfer(address,uint256)', '', 1),
                traceNode('LOG', '', 'Transfer(from, to, value)', '', 2),
            ]),
        ]);
    }
});

function traceNode(op, addr, method, value, depth) {
    const opColors = { CALL: '#3D95CE', STATICCALL: '#A78BFA', LOG: '#2DD4BF' };
    return h('div', {
        class: 'trace-node',
        style: { paddingLeft: (depth * 20 + 8) + 'px' }
    }, [
        depth > 0 ? h('span', { class: 'trace-indent' }, '├─ ') : null,
        h('span', {
            class: 'trace-op',
            style: { background: (opColors[op] || '#3D95CE') + '18', color: opColors[op] || '#3D95CE', border: '1px solid ' + (opColors[op] || '#3D95CE') + '33' }
        }, op),
        addr ? h('span', { class: 'trace-addr' }, addr) : null,
        h('span', { class: 'trace-method' }, method),
        value ? h('span', { class: 'trace-value' }, value) : null,
    ]);
}

const PreviewVerification = markRaw({
    render() {
        return h('div', { class: 'mock-verification' }, [
            h('div', { class: 'mock-verified-banner' }, [
                h('span', { class: 'mock-check' }, '\u2713'),
                'Contract Source Code Verified',
            ]),
            h('div', { class: 'mock-contract-meta' }, [
                metaRow('Contract Name', 'SwapRouter'),
                metaRow('Compiler', 'v0.8.20+commit.a1b79de6'),
                metaRow('Optimization', 'Yes (200 runs)'),
                metaRow('EVM Version', 'paris'),
            ]),
            h('div', { class: 'mock-code' }, [
                codeLine(1, '// SPDX-License-Identifier: GPL-2.0', true),
                codeLine(2, 'pragma solidity ^0.8.20;', false),
                codeLine(3, '', false),
                codeLine(4, 'contract SwapRouter {', false),
                codeLine(5, '    function swap(', false),
                codeLine(6, '        uint256 amount', false),
                codeLine(7, '    ) external payable {', false),
            ]),
        ]);
    }
});

function metaRow(label, value) {
    return h('div', { class: 'meta-row' }, [
        h('span', { class: 'meta-label' }, label),
        h('span', { class: 'meta-value' }, value),
    ]);
}

function codeLine(num, text, isComment) {
    return h('div', { class: 'code-line' }, [
        h('span', { class: 'line-num' }, String(num)),
        h('span', { class: isComment ? 'code-comment' : 'code-text' }, text),
    ]);
}

const PreviewAnalytics = markRaw({
    render() {
        return h('div', { class: 'mock-analytics' }, [
            h('div', { class: 'mock-analytics-header' }, [
                h('span', { style: 'color: #F1F5F9; font-weight: 600; font-size: 13px;' }, 'Network Analytics'),
                h('span', { class: 'mock-date-badge' }, 'Last 30 days'),
            ]),
            h('div', { class: 'mock-charts-grid' }, [
                chartCard('Transactions', '12,847', chartPath1, '#3D95CE'),
                chartCard('Active Wallets', '1,234', chartPath2, '#2DD4BF'),
                chartCard('Gas Price', '2.4 gwei', chartPath3, '#A78BFA'),
                chartCard('Contracts', '89', chartPath4, '#F59E0B'),
            ]),
        ]);
    }
});

const chartPath1 = 'M0,40 L15,35 L30,38 L45,25 L60,28 L75,15 L90,18 L105,10 L120,12';
const chartPath2 = 'M0,35 L15,30 L30,32 L45,20 L60,25 L75,18 L90,22 L105,15 L120,8';
const chartPath3 = 'M0,20 L15,25 L30,15 L45,30 L60,22 L75,35 L90,28 L105,32 L120,25';
const chartPath4 = 'M0,38 L15,36 L30,34 L45,30 L60,28 L75,24 L90,20 L105,16 L120,10';

function chartCard(label, value, path, color) {
    return h('div', { class: 'chart-card' }, [
        h('div', { class: 'chart-label' }, label),
        h('div', { class: 'chart-value', style: { color } }, value),
        h('svg', { viewBox: '0 0 120 45', class: 'chart-svg' }, [
            h('path', { d: path + ' L120,45 L0,45 Z', fill: color + '15', stroke: 'none' }),
            h('path', { d: path, fill: 'none', stroke: color, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ]),
    ]);
}

const PreviewBranding = markRaw({
    render() {
        return h('div', { class: 'mock-branding' }, [
            h('div', { class: 'mock-brand-section' }, [
                h('div', { class: 'mock-brand-label' }, 'Theme Colors'),
                h('div', { class: 'mock-color-grid' }, [
                    colorSwatch('Primary', '#3D95CE'),
                    colorSwatch('Secondary', '#5DAAE0'),
                    colorSwatch('Accent', '#29648E'),
                    colorSwatch('Background', '#0B1120'),
                ]),
            ]),
            h('div', { class: 'mock-brand-section' }, [
                h('div', { class: 'mock-brand-label' }, 'Logo & Identity'),
                h('div', { class: 'mock-brand-row' }, [
                    h('div', { class: 'mock-logo-box' }, [
                        h('div', { style: 'font-family: Exo, sans-serif; font-weight: 600; color: #F1F5F9; font-size: 16px;' }, 'YourChain'),
                        h('div', { style: 'color: #64748B; font-size: 10px; margin-top: 2px;' }, 'logo.svg'),
                    ]),
                    h('div', { class: 'mock-font-box' }, [
                        h('div', { style: 'color: #94A3B8; font-size: 10px; margin-bottom: 4px;' }, 'Font'),
                        h('div', { style: 'color: #F1F5F9; font-size: 14px; font-weight: 600;' }, 'Inter'),
                    ]),
                ]),
            ]),
            h('div', { class: 'mock-brand-section' }, [
                h('div', { class: 'mock-brand-label' }, 'Custom Domain'),
                h('div', { class: 'mock-domain-input' }, 'explorer.yourchain.com'),
            ]),
        ]);
    }
});

function colorSwatch(name, hex) {
    return h('div', { class: 'color-swatch' }, [
        h('div', { class: 'swatch-circle', style: { background: hex } }),
        h('div', { class: 'swatch-info' }, [
            h('span', { class: 'swatch-name' }, name),
            h('span', { class: 'swatch-hex' }, hex),
        ]),
    ]);
}

const PreviewTokens = markRaw({
    render() {
        const tokens = [
            { hash: '0x1b14…25d5', type: 'ERC-20', from: '0x7a25…f832', to: '0xdac1…1ec7', token: 'USDC', amount: '1,500.00' },
            { hash: '0x8f22…1a22', type: 'ERC-721', from: '0x4e99…9f33', to: '0x2b87…e451', token: 'CryptoPunk #7804', amount: '1' },
            { hash: '0x4e99…9f33', type: 'ERC-20', from: '0xdac1…1ec7', to: '0x7a25…f832', token: 'WETH', amount: '0.842' },
        ];
        return h('div', { class: 'mock-tokens' }, [
            h('div', { class: 'mock-table-header' }, [
                h('span', {}, 'Txn Hash'),
                h('span', {}, 'Type'),
                h('span', {}, 'From'),
                h('span', {}, 'To'),
                h('span', {}, 'Token'),
                h('span', { class: 'text-right' }, 'Amount'),
            ]),
            ...tokens.map(tx =>
                h('div', { class: 'mock-table-row' }, [
                    h('span', { class: 'mock-hash' }, tx.hash),
                    h('span', {}, [h('span', { class: 'mock-type-badge' + (tx.type === 'ERC-721' ? ' nft' : '') }, tx.type)]),
                    h('span', { class: 'mock-addr' }, tx.from),
                    h('span', { class: 'mock-addr' }, tx.to),
                    h('span', { class: 'mock-token-name' }, tx.token),
                    h('span', { class: 'text-right', style: 'color: #F1F5F9;' }, tx.amount),
                ])
            ),
            h('div', { class: 'mock-pagination' }, [
                h('span', { style: 'color: #64748B; font-size: 11px;' }, 'Showing 1-3 of 12,847'),
                h('div', { class: 'mock-page-btns' }, [
                    h('span', { class: 'mock-page-btn' }, '\u2039'),
                    h('span', { class: 'mock-page-btn active' }, '1'),
                    h('span', { class: 'mock-page-btn' }, '2'),
                    h('span', { class: 'mock-page-btn' }, '3'),
                    h('span', { class: 'mock-page-btn' }, '\u203A'),
                ]),
            ]),
        ]);
    }
});

const PreviewRealtime = markRaw({
    render() {
        return h('div', { class: 'mock-realtime' }, [
            h('div', { class: 'mock-rt-header' }, [
                h('span', { style: 'color: #F1F5F9; font-weight: 600; font-size: 13px;' }, 'Latest Blocks'),
                h('div', { class: 'mock-live-badge' }, [
                    h('span', { class: 'pulse-dot' }),
                    'Live',
                ]),
            ]),
            h('div', { class: 'mock-blocks' }, [
                blockRow('15,798,997', '3 txns', '0.042 ETH', true),
                blockRow('15,798,996', '12 txns', '0.187 ETH', false),
                blockRow('15,798,995', '7 txns', '0.093 ETH', false),
                blockRow('15,798,994', '5 txns', '0.061 ETH', false),
            ]),
        ]);
    }
});

function blockRow(num, txns, reward, isNew) {
    return h('div', { class: 'mock-block-row' + (isNew ? ' new-block' : '') }, [
        h('div', { class: 'mock-block-icon' }, [
            h('span', { style: 'font-size: 11px; color: #64748B;' }, 'Bk'),
        ]),
        h('div', { class: 'mock-block-info' }, [
            h('span', { class: 'mock-block-num' }, num),
            h('span', { class: 'mock-block-txns' }, txns),
        ]),
        h('span', { style: 'color: #94A3B8; font-size: 12px; margin-left: auto;' }, reward),
        isNew ? h('span', { class: 'mock-new-tag' }, 'Just now') : h('span', { style: 'color: #475569; font-size: 11px;' }, '12s ago'),
    ]);
}

const PreviewL2Bridge = markRaw({
    render() {
        return h('div', { class: 'mock-l2-bridge' }, [
            h('div', { class: 'mock-l2-section' }, [
                h('div', { class: 'mock-l2-section-header' }, [
                    h('span', { style: 'color: #F1F5F9; font-weight: 600; font-size: 13px;' }, 'Deposits (L1 → L2)'),
                    h('span', { class: 'mock-l2-count' }, '3 deposits'),
                ]),
                h('div', { class: 'mock-l2-table' }, [
                    h('div', { class: 'mock-l2-tbl-header' }, [
                        h('span', {}, 'L1 Block'),
                        h('span', {}, 'From'),
                        h('span', {}, 'Value'),
                        h('span', {}, 'Status'),
                    ]),
                    l2Row('19,847,231', '0x7a25…f832', '0.5 ETH', 'Relayed', true),
                    l2Row('19,847,198', '0x4e99…9f33', '1.2 ETH', 'Relayed', true),
                    l2Row('19,847,155', '0xf1d8…7a92', '0.1 ETH', 'Pending', false),
                ]),
            ]),
            h('div', { class: 'mock-l2-section', style: 'margin-top: 16px;' }, [
                h('div', { class: 'mock-l2-section-header' }, [
                    h('span', { style: 'color: #F1F5F9; font-weight: 600; font-size: 13px;' }, 'Withdrawals (L2 → L1)'),
                    h('span', { class: 'mock-l2-count' }, '2 withdrawals'),
                ]),
                h('div', { class: 'mock-l2-table' }, [
                    h('div', { class: 'mock-l2-tbl-header' }, [
                        h('span', {}, 'L2 Block'),
                        h('span', {}, 'From'),
                        h('span', {}, 'Value'),
                        h('span', {}, 'Stage'),
                    ]),
                    l2Row('4,521,098', '0xdac1…1ec7', '2.0 ETH', 'Finalized', true),
                    l2Row('4,520,841', '0x2b87…e451', '0.8 ETH', 'Challenge', false),
                ]),
            ]),
        ]);
    }
});

function l2Row(block, from, value, status, success) {
    const statusColors = success
        ? { bg: 'rgba(34, 197, 94, 0.1)', color: '#22C55E', border: 'rgba(34, 197, 94, 0.2)' }
        : { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' };
    return h('div', { class: 'mock-l2-tbl-row' }, [
        h('span', { style: 'color: #F1F5F9;' }, block),
        h('span', { style: 'color: #5DAAE0;' }, from),
        h('span', { style: 'color: #F1F5F9;' }, value),
        h('span', {}, [
            h('span', {
                style: {
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    background: statusColors.bg,
                    color: statusColors.color,
                    border: '1px solid ' + statusColors.border,
                }
            }, status),
        ]),
    ]);
}

const PreviewNFTGallery = markRaw({
    render() {
        const nfts = [
            { id: '#7804', collection: 'CryptoFunks', img: '/nft/punk1.png' },
            { id: '#3100', collection: 'Bored Ape Brunch Club', img: '/nft/ape1.png' },
            { id: '#8857', collection: 'Kazuki', img: '/nft/anime1.png' },
            { id: '#1234', collection: 'CryptoFunks', img: '/nft/alien1.png' },
            { id: '#5621', collection: 'Noodles', img: '/nft/doodle1.png' },
            { id: '#9901', collection: 'Bored Ape Brunch Club', img: '/nft/ape2.png' },
        ];
        return h('div', { class: 'mock-nft-gallery' }, [
            h('div', { class: 'mock-nft-header' }, [
                h('span', { style: 'color: #F1F5F9; font-weight: 600; font-size: 13px;' }, 'NFT Collection'),
                h('span', { class: 'mock-nft-count' }, '2,847 items'),
            ]),
            h('div', { class: 'mock-nft-grid' }, nfts.map(nft =>
                h('div', { class: 'mock-nft-card' }, [
                    h('div', { class: 'mock-nft-image' }, [
                        h('img', { src: nft.img, alt: nft.collection + ' ' + nft.id, class: 'mock-nft-img' }),
                    ]),
                    h('div', { class: 'mock-nft-info' }, [
                        h('span', { class: 'mock-nft-name' }, nft.collection + ' ' + nft.id),
                        h('span', { class: 'mock-nft-owner' }, '0x7a25…f832'),
                    ]),
                ])
            )),
        ]);
    }
});

const PreviewContractInteraction = markRaw({
    render() {
        return h('div', { class: 'mock-interact' }, [
            h('div', { class: 'mock-interact-tabs' }, [
                h('span', { class: 'mock-interact-tab' }, 'Read'),
                h('span', { class: 'mock-interact-tab active' }, 'Write'),
            ]),
            h('div', { class: 'mock-interact-fn' }, [
                h('div', { class: 'mock-fn-header' }, [
                    h('span', { class: 'mock-fn-index' }, '1.'),
                    h('span', { class: 'mock-fn-name' }, 'transfer'),
                    h('span', { class: 'mock-fn-sig' }, '(address, uint256)'),
                ]),
                h('div', { class: 'mock-fn-inputs' }, [
                    h('div', { class: 'mock-fn-field' }, [
                        h('div', { class: 'mock-fn-label' }, 'recipient (address)'),
                        h('div', { class: 'mock-fn-input' }, '0xdac1…1ec7'),
                    ]),
                    h('div', { class: 'mock-fn-field' }, [
                        h('div', { class: 'mock-fn-label' }, 'amount (uint256)'),
                        h('div', { class: 'mock-fn-input' }, '1000000000000000000'),
                    ]),
                ]),
                h('div', { class: 'mock-fn-btn' }, 'Write'),
            ]),
            h('div', { class: 'mock-interact-fn collapsed' }, [
                h('div', { class: 'mock-fn-header' }, [
                    h('span', { class: 'mock-fn-index' }, '2.'),
                    h('span', { class: 'mock-fn-name' }, 'approve'),
                    h('span', { class: 'mock-fn-sig' }, '(address, uint256)'),
                ]),
            ]),
            h('div', { class: 'mock-interact-fn collapsed' }, [
                h('div', { class: 'mock-fn-header' }, [
                    h('span', { class: 'mock-fn-index' }, '3.'),
                    h('span', { class: 'mock-fn-name' }, 'transferFrom'),
                    h('span', { class: 'mock-fn-sig' }, '(address, address, uint256)'),
                ]),
            ]),
        ]);
    }
});

const PreviewAPI = markRaw({
    render() {
        return h('div', { class: 'mock-api' }, [
            h('div', { class: 'mock-api-header' }, [
                h('span', { class: 'mock-api-method' }, 'POST'),
                h('span', { class: 'mock-api-endpoint' }, '/api/explorers'),
            ]),
            h('div', { class: 'mock-api-code' }, [
                codeLine(1, 'curl -X POST https://app.ethernal.com/api/explorers \\', false),
                codeLine(2, '  -H "Authorization: Bearer sk_live_..." \\', false),
                codeLine(3, '  -H "Content-Type: application/json" \\', false),
                codeLine(4, '  -d \'{', false),
                codeLine(5, '    "name": "My Chain Explorer",', true),
                codeLine(6, '    "rpcServer": "https://rpc.mychain.com",', true),
                codeLine(7, '    "domain": "explorer.mychain.com"', true),
                codeLine(8, '  }\'', false),
            ]),
            h('div', { class: 'mock-api-response' }, [
                h('div', { class: 'mock-api-resp-header' }, [
                    h('span', { style: 'color: #22C55E; font-size: 11px; font-weight: 600;' }, '201 Created'),
                    h('span', { style: 'color: #64748B; font-size: 10px;' }, '142ms'),
                ]),
                h('div', { class: 'mock-api-resp-body' }, [
                    codeLine(1, '{', false),
                    codeLine(2, '  "id": 4521,', true),
                    codeLine(3, '  "slug": "my-chain-explorer",', true),
                    codeLine(4, '  "status": "syncing"', true),
                    codeLine(5, '}', false),
                ]),
            ]),
        ]);
    }
});

const features = [
    {
        title: 'Real-time Updates',
        desc: 'New blocks and transactions appear instantly via WebSocket. No refresh needed — your data is always current.',
        url: 'explorer.yourchain.com',
        component: PreviewRealtime,
    },
    {
        title: 'Transaction Tracing',
        desc: 'Debug transactions with full call traces, state diffs, and event logs. See exactly what happened at every step.',
        url: 'explorer.yourchain.com/tx/0x1b14…',
        component: PreviewTracing,
    },
    {
        title: 'Contract Verification',
        desc: 'Verify and interact with smart contracts directly. Supports Solidity and Vyper with full source code display.',
        url: 'explorer.yourchain.com/address/0x7a25…',
        component: PreviewVerification,
    },
    {
        title: 'Contract Interaction',
        desc: 'Call read and write functions directly from the explorer. Connect your wallet and interact with any verified contract.',
        url: 'explorer.yourchain.com/address/0x7a25…',
        component: PreviewContractInteraction,
    },
    {
        title: 'Analytics Dashboard',
        desc: 'Track gas usage, transaction volume, and network health with real-time charts and historical data.',
        url: 'explorer.yourchain.com/analytics',
        component: PreviewAnalytics,
    },
    {
        title: 'Custom Branding',
        desc: 'Your logo, colors, domain, and theme. Make the explorer indistinguishable from a first-party product.',
        url: 'explorer.yourchain.com/settings',
        component: PreviewBranding,
    },
    {
        title: 'L2 Bridge Support',
        desc: 'Full bridge visibility for Arbitrum Orbit and OP Stack chains. Track deposits, withdrawals, and batches with real-time status updates.',
        url: 'explorer.yourchain.com/deposits',
        component: PreviewL2Bridge,
    },
    {
        title: 'NFT Gallery',
        desc: 'Browse ERC-721 and ERC-1155 collections with visual galleries, metadata display, and ownership history.',
        url: 'explorer.yourchain.com/nft/cryptopunks',
        component: PreviewNFTGallery,
    },
    {
        title: 'Token Transfers',
        desc: 'Track ERC-20, ERC-721, and ERC-1155 transfers with full token metadata and ownership history.',
        url: 'explorer.yourchain.com/token-transfers',
        component: PreviewTokens,
    },
    {
        title: 'API Support',
        desc: 'Create and manage explorers programmatically. Spin up a fully configured explorer with a single API call.',
        url: 'app.ethernal.com/api/explorers',
        component: PreviewAPI,
    },
];

const splitIndex = Math.ceil(features.length / 2);
const featuresLeft = computed(() => features.slice(0, splitIndex));
const featuresRight = computed(() => features.slice(splitIndex));
</script>

<style scoped>
/* Layout */
.features-showcase {
    position: relative;
}

.feature-list-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
}

.feature-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.feature-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    border-radius: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
    width: 100%;
}

.feature-item:hover {
    background: rgba(61, 149, 206, 0.04);
}

.feature-item.active {
    background: rgba(61, 149, 206, 0.06);
}

/* Progress indicator */
.feature-item-indicator {
    width: 3px;
    border-radius: 3px;
    background: rgba(61, 149, 206, 0.12);
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
}

.feature-item-progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    background: #3D95CE;
    border-radius: 3px;
}

.feature-item.active .feature-item-progress {
    height: 100%;
    width: 100%;
}

.feature-item.active .feature-item-progress.animating {
    height: 0;
    animation: progress-fill 6s linear forwards;
}

@keyframes progress-fill {
    from { height: 0; }
    to { height: 100%; }
}

.feature-item-content {
    flex: 1;
    min-width: 0;
}

.feature-item-title {
    font-family: 'Exo', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #64748B;
    margin: 0;
    transition: color 0.2s;
}

.feature-item.active .feature-item-title {
    color: #F1F5F9;
}

.feature-item-desc {
    font-size: 13px;
    color: #94A3B8;
    line-height: 1.6;
    margin: 0;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.35s ease, opacity 0.25s ease, margin 0.35s ease;
}

.feature-item-desc.expanded {
    max-height: 80px;
    opacity: 1;
    margin-top: 6px;
}

/* Preview */
.feature-preview-wrap {
    width: 100%;
}

.feature-preview {
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(61, 149, 206, 0.22);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
}

.preview-header {
    background: #161B22;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(61, 149, 206, 0.12);
}

.preview-url-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(11, 17, 32, 0.8);
    border-radius: 6px;
    padding: 4px 12px;
    color: #64748B;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
}

.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.red { background: #ff5f56; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.preview-body {
    padding: 20px;
    min-height: 300px;
    font-family: 'JetBrains Mono', 'Roboto', sans-serif;
    font-size: 12px;
}

/* Transition */
.preview-fade-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.preview-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.preview-fade-enter-from { opacity: 0; transform: translateY(8px); }
.preview-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Mobile: stack */
@media (max-width: 960px) {
    .feature-list-grid {
        grid-template-columns: 1fr;
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        gap: 0;
        margin-bottom: 24px;
        -webkit-overflow-scrolling: touch;
    }
    .feature-list {
        flex-direction: row;
        overflow-x: auto;
        gap: 0;
        -webkit-overflow-scrolling: touch;
    }
    .feature-item {
        flex-direction: column;
        gap: 8px;
        min-width: 140px;
        padding: 12px;
    }
    .feature-item-indicator {
        width: 100%;
        height: 3px;
    }
    .feature-item-progress.animating {
        animation-name: progress-fill-horizontal;
    }
    @keyframes progress-fill-horizontal {
        from { width: 0; height: 100%; }
        to { width: 100%; height: 100%; }
    }
    .feature-item.active .feature-item-progress {
        width: 100%;
        height: 100%;
    }
    .feature-item-desc {
        display: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .feature-item-progress.animating {
        animation: none;
    }
}
</style>

<style>
/* Mockup styles — unscoped because render() components don't get scoped attrs */

/* Tracing */
.mock-trace-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mock-label { color: #F1F5F9; font-weight: 600; font-size: 13px; }
.mock-badge { padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.mock-badge.success { background: rgba(34, 197, 94, 0.12); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.trace-node { display: flex; align-items: center; gap: 8px; padding: 6px 0; flex-wrap: wrap; }
.trace-indent { color: #334155; font-family: monospace; user-select: none; }
.trace-op { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; flex-shrink: 0; }
.trace-addr { color: #5DAAE0; font-size: 11px; }
.trace-method { color: #CBD5E1; font-size: 11px; }
.trace-value { color: #F59E0B; font-size: 11px; font-weight: 600; margin-left: auto; }

/* Verification */
.mock-verified-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
.mock-check { font-size: 14px; }
.mock-contract-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.meta-row { display: flex; flex-direction: column; gap: 2px; }
.meta-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
.meta-value { color: #CBD5E1; font-size: 11px; }
.mock-code { background: #0d1117; border-radius: 8px; padding: 12px 0; border: 1px solid rgba(61, 149, 206, 0.1); }
.code-line { display: flex; gap: 16px; padding: 1px 16px; line-height: 1.7; }
.line-num { color: #334155; font-size: 11px; user-select: none; min-width: 16px; text-align: right; }
.code-text { color: #E6EDF3; font-size: 11px; }
.code-comment { color: #484F58; font-size: 11px; }

/* Analytics */
.mock-analytics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mock-date-badge { padding: 4px 10px; border-radius: 6px; background: rgba(61, 149, 206, 0.08); border: 1px solid rgba(61, 149, 206, 0.15); color: #5DAAE0; font-size: 11px; font-weight: 500; }
.mock-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chart-card { background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.1); border-radius: 10px; padding: 12px 14px 8px; }
.chart-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.chart-value { font-size: 18px; font-weight: 700; font-family: 'Exo', sans-serif; margin-bottom: 8px; }
.chart-svg { width: 100%; height: 40px; display: block; }

/* Branding */
.mock-brand-section { margin-bottom: 16px; }
.mock-brand-section:last-child { margin-bottom: 0; }
.mock-brand-label { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.mock-color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.color-swatch { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.swatch-circle { width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0; }
.swatch-info { display: flex; flex-direction: column; }
.swatch-name { color: #CBD5E1; font-size: 11px; }
.swatch-hex { color: #64748B; font-size: 10px; font-family: 'JetBrains Mono', monospace; }
.mock-brand-row { display: flex; gap: 10px; }
.mock-logo-box, .mock-font-box { flex: 1; padding: 12px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-domain-input { padding: 10px 14px; border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.12); color: #5DAAE0; font-size: 12px; font-family: 'JetBrains Mono', monospace; }

/* Tokens */
.mock-table-header, .mock-table-row { display: grid; grid-template-columns: 1.2fr 0.8fr 1.2fr 1.2fr 1.2fr 0.8fr; align-items: center; gap: 4px; font-size: 11px; }
.mock-table-header { color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 4px; }
.mock-table-row { padding: 8px 0; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }
.mock-hash { color: #5DAAE0; }
.mock-addr { color: #94A3B8; font-size: 11px; }
.mock-token-name { color: #F1F5F9; font-weight: 500; }
.mock-type-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background: rgba(34, 197, 94, 0.1); color: #22C55E; border: 1px solid rgba(34, 197, 94, 0.2); }
.mock-type-badge.nft { background: rgba(168, 85, 247, 0.1); color: #A78BFA; border-color: rgba(168, 85, 247, 0.2); }
.mock-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(61, 149, 206, 0.08); }
.mock-page-btns { display: flex; gap: 4px; }
.mock-page-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 11px; color: #64748B; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); }
.mock-page-btn.active { background: rgba(61, 149, 206, 0.15); color: #5DAAE0; border-color: rgba(61, 149, 206, 0.3); }

/* Real-time */
.mock-rt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mock-live-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 100px; background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 11px; font-weight: 600; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { opacity: 0.6; box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
}
.mock-blocks { display: flex; flex-direction: column; gap: 6px; }
.mock-block-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(11, 17, 32, 0.4); border: 1px solid rgba(61, 149, 206, 0.06); transition: background 0.3s, border-color 0.3s; }
.mock-block-row.new-block { background: rgba(61, 149, 206, 0.06); border-color: rgba(61, 149, 206, 0.15); }
.mock-block-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(61, 149, 206, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mock-block-info { display: flex; flex-direction: column; }
.mock-block-num { color: #5DAAE0; font-size: 12px; font-weight: 600; }
.mock-block-txns { color: #64748B; font-size: 11px; }
.mock-new-tag { font-size: 10px; font-weight: 600; color: #22C55E; background: rgba(34, 197, 94, 0.08); padding: 2px 8px; border-radius: 4px; }

/* NFT Gallery */
.mock-nft-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.mock-nft-count { padding: 4px 10px; border-radius: 6px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.15); color: #A78BFA; font-size: 11px; font-weight: 500; }
.mock-nft-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.mock-nft-card { border-radius: 10px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(61, 149, 206, 0.08); overflow: hidden; }
.mock-nft-image { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.mock-nft-img { width: 100%; height: 100%; object-fit: cover; }
.mock-nft-info { padding: 8px 10px; }
.mock-nft-name { display: block; color: #F1F5F9; font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mock-nft-owner { display: block; color: #64748B; font-size: 9px; margin-top: 2px; }

/* Contract Interaction */
.mock-interact-tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); }
.mock-interact-tab { padding: 8px 16px; color: #64748B; font-size: 12px; font-weight: 500; cursor: default; border-bottom: 2px solid transparent; }
.mock-interact-tab.active { color: #3D95CE; border-bottom-color: #3D95CE; }
.mock-interact-fn { background: rgba(11, 17, 32, 0.4); border: 1px solid rgba(61, 149, 206, 0.08); border-radius: 10px; padding: 14px; margin-bottom: 8px; }
.mock-interact-fn.collapsed { padding: 10px 14px; }
.mock-fn-header { display: flex; align-items: center; gap: 6px; }
.mock-fn-index { color: #64748B; font-size: 11px; font-weight: 600; }
.mock-fn-name { color: #5DAAE0; font-size: 12px; font-weight: 600; }
.mock-fn-sig { color: #64748B; font-size: 11px; }
.mock-fn-inputs { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.mock-fn-field { display: flex; flex-direction: column; gap: 4px; }
.mock-fn-label { color: #64748B; font-size: 10px; }
.mock-fn-input { padding: 8px 12px; border-radius: 6px; background: rgba(11, 17, 32, 0.6); border: 1px solid rgba(61, 149, 206, 0.12); color: #CBD5E1; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
.mock-fn-btn { margin-top: 12px; display: inline-flex; padding: 6px 20px; border-radius: 6px; background: linear-gradient(90deg, #3D95CE, #5DAAE0); color: #FFF; font-size: 11px; font-weight: 600; }

/* API */
.mock-api-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.mock-api-method { padding: 3px 10px; border-radius: 4px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; font-size: 11px; font-weight: 700; }
.mock-api-endpoint { color: #CBD5E1; font-size: 12px; }
.mock-api-code { background: #0d1117; border-radius: 8px; padding: 12px 0; border: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 14px; }
.mock-api-code .code-text { color: #CBD5E1; }
.mock-api-code .code-comment { color: #5DAAE0; }
.mock-api-response { border-radius: 8px; background: rgba(11, 17, 32, 0.5); border: 1px solid rgba(34, 197, 94, 0.12); overflow: hidden; }
.mock-api-resp-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid rgba(61, 149, 206, 0.08); }
.mock-api-resp-body { padding: 10px 0; }
.mock-api-resp-body .code-text { color: #CBD5E1; }
.mock-api-resp-body .code-comment { color: #5DAAE0; }

/* L2 Bridge */
.mock-l2-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.mock-l2-count { padding: 3px 10px; border-radius: 6px; background: rgba(61, 149, 206, 0.08); border: 1px solid rgba(61, 149, 206, 0.15); color: #5DAAE0; font-size: 11px; font-weight: 500; }
.mock-l2-tbl-header, .mock-l2-tbl-row { display: grid; grid-template-columns: 1.2fr 1.2fr 0.8fr 0.8fr; gap: 4px; font-size: 11px; align-items: center; }
.mock-l2-tbl-header { color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(61, 149, 206, 0.1); margin-bottom: 4px; }
.mock-l2-tbl-row { padding: 7px 0; border-bottom: 1px solid rgba(61, 149, 206, 0.05); }

@media (prefers-reduced-motion: reduce) {
    .pulse-dot { animation: none; }
}
</style>
