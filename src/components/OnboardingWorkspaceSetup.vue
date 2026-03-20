<!--
    @fileoverview Workspace setup step for onboarding wizard (private path).
    Collects workspace name, RPC URL, and chain. Validates RPC from browser.
    @component OnboardingWorkspaceSetup
    @emits workspace-info-ready - Emitted with { name, rpcServer, chain, networkId }
    @emits back - Emitted when user clicks back
-->
<template>
    <div class="workspace-setup">
        <div class="step-label">Step 2 of 4</div>
        <h2 class="step-title">Set up your workspace</h2>
        <p class="step-subtitle">Connect to your local or remote node. We'll detect the network automatically.</p>

        <v-alert type="warning" class="mb-4 safari-warning" v-if="isUsingSafari" density="compact">
            Safari blocks CORS requests to localhost. Use another browser to connect to a local chain.
        </v-alert>

        <div class="detect-row" v-if="!chainInfo">
            <a href="#" class="detect-link" @click.prevent="detectNetwork">Detect Networks</a>
            <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                    <v-icon size="14" color="#64748b" v-bind="props">mdi-help-circle-outline</v-icon>
                </template>
                Sends RPC requests to 127.0.0.1 on http/ws ports 7545, 8545, 9545.
            </v-tooltip>
        </div>
        <ul v-if="detectedNetworks.length" class="detected-list">
            <li v-for="(address, idx) in detectedNetworks" :key="idx">
                {{ address }} <a href="#" class="detect-link" @click.prevent="rpcServer = address">Use</a>
            </li>
        </ul>
        <div v-if="noNetworks" class="no-networks">
            No networks detected. Make sure your node is running on port 7545, 8545, or 9545.
        </div>

        <v-form @submit.prevent="validate" v-model="formValid">
            <div class="field-group">
                <label class="field-label">Workspace Name</label>
                <v-text-field
                    v-model="workspaceName"
                    placeholder="e.g. My Dev Workspace"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'Name is required']"
                    :disabled="loading"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <div class="field-group">
                <label class="field-label">RPC Server URL</label>
                <v-text-field
                    v-model="rpcServer"
                    placeholder="ws://localhost:8545"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'RPC URL is required', v => isUrlValid(v) || 'Must be a valid URL']"
                    :disabled="loading"
                    :error-messages="rpcError"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <div class="field-group">
                <label class="field-label">Chain</label>
                <v-select
                    v-model="chain"
                    :items="availableChains"
                    item-title="name"
                    item-value="slug"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                />
            </div>

            <v-slide-y-transition>
                <div v-if="chainInfo" class="chain-confirmed">
                    <v-icon size="16" color="#22C55E">mdi-check-circle</v-icon>
                    <span>Connected — Network ID: {{ chainInfo.networkId }}</span>
                </div>
            </v-slide-y-transition>

            <v-slide-y-transition>
                <div v-if="corsWarning" class="cors-warning">
                    <v-icon size="16" color="#F59E0B">mdi-alert</v-icon>
                    <span>We couldn't validate this RPC — this may be due to CORS restrictions. You can continue anyway.</span>
                </div>
            </v-slide-y-transition>

            <div class="step-actions">
                <button type="button" class="back-btn" @click="$emit('back')" :disabled="loading">
                    <v-icon size="16">mdi-arrow-left</v-icon> Back
                </button>
                <div class="action-btns">
                    <v-btn
                        v-if="corsWarning"
                        variant="outlined"
                        color="#64748b"
                        size="large"
                        rounded="lg"
                        class="continue-btn"
                        @click="continueAnyway"
                    >
                        Continue Anyway
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                    <v-btn
                        color="#3D95CE"
                        size="large"
                        rounded="lg"
                        type="submit"
                        :loading="loading"
                        :disabled="!formValid"
                        class="continue-btn"
                    >
                        Continue
                        <v-icon end>mdi-arrow-right</v-icon>
                    </v-btn>
                </div>
            </div>
        </v-form>
        <div class="setup-footer">
            Already have an account? <a href="#" class="wizard-link" @click.prevent="$emit('signin')">Sign in</a>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useEnvStore } from '@/stores/env';
import ipaddr from 'ipaddr.js';

const props = defineProps({
    initialName: { type: String, default: '' },
    initialRpc: { type: String, default: '' }
});

const emit = defineEmits(['workspace-info-ready', 'back', 'signin']);

const envStore = useEnvStore();
const $server = inject('$server');

const workspaceName = ref(props.initialName);
const rpcServer = ref(props.initialRpc);
const chain = ref('ethereum');
const formValid = ref(false);
const loading = ref(false);
const rpcError = ref('');
const chainInfo = ref(null);
const corsWarning = ref(false);
const localNetwork = ref(false);
const detectedNetworks = ref([]);
const noNetworks = ref(false);
const availableChains = ref([]);

onMounted(() => {
    availableChains.value = Object.values(envStore.chains).map((c) => ({
        name: c.name,
        slug: c.slug
    }));
});

const isUsingSafari = computed(() => !!window.GestureEvent);

function isUrlValid(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function detectNetwork() {
    noNetworks.value = false;
    $server.searchForLocalChains().then((res) => {
        detectedNetworks.value = res;
        if (!res.length) noNetworks.value = true;
    });
}

async function validate() {
    if (!formValid.value) return;
    loading.value = true;
    rpcError.value = '';
    chainInfo.value = null;
    corsWarning.value = false;

    try {
        const data = await $server.initRpcServer({ rpcServer: rpcServer.value });
        chainInfo.value = data;

        emit('workspace-info-ready', {
            name: workspaceName.value,
            rpcServer: rpcServer.value,
            chain: chain.value,
            networkId: data.networkId || null
        });
    } catch (error) {
        corsWarning.value = true;
        if (localNetwork.value && (rpcServer.value.startsWith('http://') || rpcServer.value.startsWith('ws://'))) {
            rpcError.value = '';
        } else {
            rpcError.value = '';
        }
    } finally {
        loading.value = false;
    }
}

function continueAnyway() {
    emit('workspace-info-ready', {
        name: workspaceName.value,
        rpcServer: rpcServer.value,
        chain: chain.value,
        networkId: null
    });
}

watch(rpcServer, (newVal) => {
    corsWarning.value = false;
    try {
        if (!isUrlValid(newVal)) return;
        const hostname = new URL(newVal).hostname;
        const localStrings = ['private', 'linkLocal', 'loopback', 'carrierGradeNat', 'localhost'];
        if (hostname === 'localhost') {
            localNetwork.value = true;
        } else {
            localNetwork.value = ipaddr.isValid(hostname) && localStrings.indexOf(ipaddr.parse(hostname).range()) > -1;
        }
    } catch {
        // ignore
    }
});
</script>

<style scoped>
.step-label {
    font-size: 12px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
}

.step-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
}

.step-subtitle {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 28px;
}

.detect-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
}

.detect-link {
    color: #3D95CE;
    font-size: 13px;
    text-decoration: none;
}

.detect-link:hover {
    text-decoration: underline;
}

.detected-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    font-size: 13px;
    color: #94a3b8;
}

.detected-list li {
    padding: 4px 0;
}

.no-networks {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 16px;
}

.field-group {
    margin-bottom: 20px;
}

.field-label {
    font-size: 13px;
    color: #94a3b8;
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
}

.chain-confirmed {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #22C55E;
    font-size: 13px;
    font-weight: 500;
}

.cors-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 8px;
    margin-bottom: 20px;
    color: #F59E0B;
    font-size: 13px;
    font-weight: 500;
}

.step-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
}

.action-btns {
    display: flex;
    gap: 8px;
}

.back-btn {
    background: none;
    border: none;
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 0;
    transition: color 0.2s;
}

.back-btn:hover:not(:disabled) {
    color: #94a3b8;
}

.back-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.continue-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}

.setup-footer {
    font-size: 13px;
    color: #475569;
    margin-top: 24px;
    text-align: center;
}

.wizard-link {
    color: #3D95CE;
    text-decoration: none;
}

.wizard-link:hover {
    text-decoration: underline;
}
</style>
