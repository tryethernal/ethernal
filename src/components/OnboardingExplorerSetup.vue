<!--
    @fileoverview OnboardingExplorerSetup component — step 2 of the onboarding wizard (public path).
    Collects explorer name and RPC URL, validates the RPC server-side, then emits explorer details.
    @component OnboardingExplorerSetup
    @prop {String} initialRpc - Pre-filled RPC URL value.
    @prop {String} initialName - Pre-filled explorer name value.
    @emits explorer-info-ready - Emitted with { name, rpcServer, chainId, networkId } on successful validation.
    @emits back - Emitted when the user clicks the Back button.
-->
<template>
    <div class="explorer-setup">
        <h2 class="text-h5 font-weight-bold mb-2">Set up your explorer</h2>
        <p class="text-body-2 text-medium-emphasis mb-8">Enter your chain's RPC endpoint to get started.</p>

        <v-form @submit.prevent="validate" v-model="formValid" style="max-width: 500px; margin: 0 auto;">
            <v-text-field
                v-model="explorerName"
                label="Explorer Name"
                placeholder="e.g. My Chain Explorer"
                variant="outlined"
                rounded="lg"
                :rules="[v => !!v || 'Name is required']"
                class="mb-4"
                :disabled="loading"
            />
            <v-text-field
                v-model="rpcServer"
                label="RPC Server URL"
                placeholder="https://rpc.example.com"
                variant="outlined"
                rounded="lg"
                :rules="[v => !!v || 'RPC URL is required', v => isValidUrl(v) || 'Must be a valid URL']"
                class="mb-2"
                :disabled="loading"
                :error-messages="rpcError"
            />

            <v-slide-y-transition>
                <v-alert
                    v-if="chainInfo"
                    type="success"
                    variant="tonal"
                    rounded="lg"
                    class="mb-4"
                    density="compact"
                >
                    Connected to chain {{ chainInfo.chainId }}
                </v-alert>
            </v-slide-y-transition>

            <div class="d-flex justify-space-between mt-6">
                <v-btn variant="text" @click="$emit('back')" :disabled="loading">
                    <v-icon start>mdi-arrow-left</v-icon>
                    Back
                </v-btn>
                <v-btn
                    color="primary"
                    size="large"
                    rounded="xl"
                    type="submit"
                    :loading="loading"
                    :disabled="!formValid"
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

/**
 * @type {Object} props
 * @property {String} initialRpc - Pre-filled RPC URL.
 * @property {String} initialName - Pre-filled explorer name.
 */
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

/**
 * Validates that a string is a valid HTTP/HTTPS/WS/WSS URL.
 * @param {String} url - The URL string to validate.
 * @returns {Boolean} True if valid, false otherwise.
 */
function isValidUrl(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Submits the form: validates the RPC URL server-side, captures PostHog events,
 * and emits explorer details on success or an error message on failure.
 * @returns {Promise<void>}
 */
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
