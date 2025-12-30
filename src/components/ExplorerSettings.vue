<template>
    <v-card v-if="currentExplorer">
        <v-card-text>
            <v-alert v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
            <v-alert v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>
            <v-form class="mt-4" @submit.prevent="updateExplorerSettings()" v-model="valid">
                <v-row>
                    <v-col class="pt-1">
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            v-model="currentExplorer.name"
                            label="Name"></v-text-field>
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            class="mb-4"
                            v-model="currentExplorer.rpcServer"
                            hint="This is the RPC server that will be exposed to end users (wallets, etc...)."
                            :persistent-hint="true"
                            label="Frontend RPC Server"></v-text-field>
                        <v-text-field
                            class="mb-4"
                            density="compact"
                            variant="outlined"
                            v-model="currentExplorer.slug"
                            :suffix="`.${envStore.mainDomain}`"
                            hint="Your explorer will always be reachable at this address"
                            persistent-hint
                            label="Ethernal Domain"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            :disabled="!capabilities.nativeToken"
                            :hint="capabilities.nativeToken ? '' : 'Upgrade your plan to customize your native token symbol.'"
                            v-model="currentExplorer.token"
                            persistent-hint
                            label="Native Token Symbol"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            type="number"
                            :disabled="!capabilities.totalSupply"
                            :hint="capabilities.totalSupply ? `In ether: ${formatTotalSupply()}` : 'Upgrade your plan to display a total supply.'"
                            persistent-hint
                            hide-details="auto"
                            v-model="currentExplorer.totalSupply"
                            label="Total Supply (in wei)"></v-text-field>
                    </v-col>
                </v-row>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" :disabled="!valid" variant="flat" type="submit">Update</v-btn>
                </v-card-actions>
            </v-form>
        </v-card-text>
    </v-card>
</template>

/**
 * @fileoverview Explorer settings form component.
 * Manages core explorer configuration including name, RPC server, slug, native token, and total supply.
 * @component ExplorerSettings
 *
 * @prop {Object} explorer - The explorer data object
 * @emits updated - Emitted when settings are saved
 */
<script setup>
import { ref, onMounted, inject } from 'vue';
import { useEnvStore } from '../stores/env';
import { formatNumber, isUrlValid } from '../lib/utils';

const props = defineProps({
    explorer: { type: Object, required: true }
});
const emit = defineEmits(['updated']);

const envStore = useEnvStore();
const $server = inject('$server');

const successMessage = ref(null);
const errorMessage = ref(null);
const valid = ref(false);
const loading = ref(false);
const capabilities = ref({});
const currentExplorer = ref(null);

onMounted(() => {
    currentExplorer.value = props.explorer;
    if (props.explorer.stripeSubscription) {
        capabilities.value = props.explorer.stripeSubscription.stripePlan.capabilities;
    }
});

function formatTotalSupply() {
    if (!currentExplorer.value.totalSupply) return 'N/A';
    return formatNumber(currentExplorer.value.totalSupply);
}

function updateExplorerSettings() {
    loading.value = true;
    successMessage.value = null;
    errorMessage.value = null;
    const settings = {
        name: currentExplorer.value.name,
        slug: currentExplorer.value.slug,
        rpcServer: currentExplorer.value.rpcServer
    };
    if (capabilities.value.nativeToken)
        settings['token'] = currentExplorer.value.token;
    if (capabilities.value.totalSupply)
        settings['totalSupply'] = currentExplorer.value.totalSupply;
    $server.updateExplorerSettings(currentExplorer.value.id, settings)
        .then(() => {
            successMessage.value = 'Settings updated.';
            emit('updated');
        })
        .catch(error => {
            errorMessage.value = error.response && error.response.data || 'Error while updating settings. Please retry.';
        })
        .finally(() => loading.value = false);
}
</script>
