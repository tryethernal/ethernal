<!--
    @fileoverview Explorer setup step for onboarding wizard (public path).
    Collects explorer name and RPC URL, validates RPC server-side.
    @component OnboardingExplorerSetup
    @emits explorer-info-ready - Emitted with { name, rpcServer, chainId, networkId }
    @emits back - Emitted when user clicks back
-->
<template>
    <div class="explorer-setup">
        <div class="step-label">Step 2 of 4</div>
        <h2 class="step-title">Set up your explorer</h2>
        <p class="step-subtitle">Enter your chain's RPC endpoint. We'll detect the network automatically.</p>

        <v-form @submit.prevent="validate" v-model="formValid">
            <div class="field-group">
                <label class="field-label">Explorer Name</label>
                <v-text-field
                    v-model="explorerName"
                    placeholder="e.g. My Chain Explorer"
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
                    placeholder="https://rpc.example.com"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    :rules="[v => !!v || 'RPC URL is required', v => isValidUrl(v) || 'Must be a valid URL']"
                    :disabled="loading"
                    :error-messages="rpcError"
                    bg-color="rgba(255,255,255,0.03)"
                    hide-details="auto"
                    style="font-family: monospace;"
                />
            </div>

            <v-slide-y-transition>
                <div v-if="chainInfo" class="chain-confirmed">
                    <v-icon size="16" color="#22C55E">mdi-check-circle</v-icon>
                    <span>Connected to chain {{ chainInfo.chainId }}</span>
                </div>
            </v-slide-y-transition>

            <div class="step-actions">
                <button type="button" class="back-btn" @click="$emit('back')" :disabled="loading">
                    <v-icon size="16">mdi-arrow-left</v-icon> Back
                </button>
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
        </v-form>
    </div>
</template>

<script setup>
import { ref, getCurrentInstance } from 'vue';

const props = defineProps({
    initialRpc: { type: String, default: '' },
    initialName: { type: String, default: '' }
});

const emit = defineEmits(['explorer-info-ready', 'back']);
const { proxy } = getCurrentInstance();

const explorerName = ref(props.initialName);
const rpcServer = ref(props.initialRpc);
const formValid = ref(false);
const loading = ref(false);
const rpcError = ref('');
const chainInfo = ref(null);

function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

async function validate() {
    if (!formValid.value) return;
    loading.value = true;
    rpcError.value = '';
    chainInfo.value = null;

    try {
        const { data } = await proxy.$server.validateRpc(rpcServer.value);
        chainInfo.value = data;

        if (window.posthog) {
            let rpcHost = '';
            try { rpcHost = new URL(rpcServer.value).hostname; } catch {}
            window.posthog.capture('onboarding:rpc_validated', {
                rpc_host: rpcHost,
                chain_id: data.chainId,
                success: true
            });
        }

        emit('explorer-info-ready', {
            name: explorerName.value,
            rpcServer: rpcServer.value,
            chainId: data.chainId,
            networkId: data.networkId
        });
    } catch (error) {
        const message = error.response?.data || error.message || 'Could not validate RPC.';
        rpcError.value = message;

        if (window.posthog) {
            let rpcHost = '';
            try { rpcHost = new URL(rpcServer.value).hostname; } catch {}
            window.posthog.capture('onboarding:rpc_validated', {
                rpc_host: rpcHost,
                chain_id: null,
                success: false
            });
        }
    } finally {
        loading.value = false;
    }
}
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

.step-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
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
</style>
