<template>
    <div class="explorer-op-settings pa-4">
        <div class="mb-6">
            <h3 class="text-h5 mb-2">OP Stack Configuration</h3>
            <p class="text-body-2 text-medium-emphasis">
                Configure your OP Stack chain contracts to enable cross-chain transaction tracking.
                This allows you to monitor deposits, withdrawals, batches, and state outputs between L1 and L2.
            </p>
        </div>

        <v-alert class="mb-3" v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
        <v-alert class="mb-3" v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>

        <v-card>
            <v-card-title>
                <h4>L1 Parent Chain</h4>
            </v-card-title>

            <v-card-text>
                <v-form v-model="isConfigured" @submit.prevent="saveOrUpdateConfig">
                    <v-row>
                        <v-col cols="12">
                            <v-alert class="mb-3" variant="tonal" type="info" density="compact">
                                Configure the L1 parent chain details. This workspace should be your L2 OP Stack chain,
                                and you need to specify the L1 parent chain contracts and RPC.
                            </v-alert>
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.parentChainId"
                                label="L1 Chain ID (required)"
                                type="number"
                                required
                                :rules="chainIdRules"
                                :disabled="loading"
                                placeholder="1"
                                hint="e.g., 1 for Ethereum Mainnet, 11155111 for Sepolia"
                                persistent-hint
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="mb-4 mt-1" />

                    <h5 class="text-h6 mb-4">L1 Contracts</h5>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.optimismPortalAddress"
                                label="OptimismPortal Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                                hint="Handles deposits and withdrawal proofs/finalizations"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.batchInboxAddress"
                                label="Batch Inbox Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                                hint="EOA address that receives batch data (usually 0xff00...chainId)"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l2OutputOracleAddress"
                                label="L2OutputOracle Address (legacy, optional)"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                                hint="For legacy chains without fault proofs"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.disputeGameFactoryAddress"
                                label="DisputeGameFactory Address (modern, optional)"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                                hint="For chains using fault proofs"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.systemConfigAddress"
                                label="SystemConfig Address (optional)"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="mb-4 mt-1" />

                    <h5 class="text-h6 mb-4">L2 Contracts</h5>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l2ToL1MessagePasserAddress"
                                label="L2ToL1MessagePasser Address"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                                hint="Default: 0x4200000000000000000000000000000000000016"
                                placeholder="0x4200000000000000000000000000000000000016"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="mb-4 mt-1" />

                    <h5 class="text-h6 mb-4">Advanced Settings</h5>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="config.outputVersion"
                                label="Output Version"
                                :items="outputVersionOptions"
                                item-title="text"
                                item-value="value"
                                :disabled="loading"
                                hint="0 = Legacy (L2OutputOracle), 1 = Fault Proofs (DisputeGameFactory)"
                                persistent-hint
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.submissionInterval"
                                label="Submission Interval (blocks)"
                                type="number"
                                :disabled="loading"
                                hint="Number of L2 blocks between output submissions"
                                persistent-hint
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.challengePeriodSeconds"
                                label="Challenge Period (seconds)"
                                type="number"
                                :disabled="loading"
                                hint="Default: 604800 (7 days)"
                                persistent-hint
                                placeholder="604800"
                            />
                        </v-col>
                    </v-row>

                    <v-card-actions>
                        <v-spacer />
                        <v-btn
                            variant="flat"
                            color="primary"
                            :disabled="!isConfigured || loading"
                            :loading="loading"
                            type="submit"
                        >
                        {{ config.id ? 'Save Configuration' : 'Create Configuration' }}
                        </v-btn>
                    </v-card-actions>
                </v-form>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';

const props = defineProps({
    explorerId: {
        type: [String, Number],
        required: true
    },
    sso: {
        type: Boolean,
        default: false
    }
});

const $server = inject('$server');

const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const config = ref({
    outputVersion: 0,
    l2ToL1MessagePasserAddress: '0x4200000000000000000000000000000000000016'
});

const outputVersionOptions = [
    { text: 'Legacy (L2OutputOracle)', value: 0 },
    { text: 'Fault Proofs (DisputeGameFactory)', value: 1 }
];

const addressRules = [
    v => !!v || 'Address is required',
    v => /^0x[a-fA-F0-9]{40}$/.test(v) || 'Must be a valid Ethereum address'
];

const optionalAddressRules = [
    v => !v || /^0x[a-fA-F0-9]{40}$/.test(v) || 'Must be a valid Ethereum address'
];

const chainIdRules = [
    v => !!v || 'Chain ID is required',
    v => Number.isInteger(Number(v)) && Number(v) > 0 || 'Must be a positive integer'
];

const isConfigured = computed(() => {
    return !!(config.value.parentChainId &&
           config.value.optimismPortalAddress &&
           config.value.batchInboxAddress);
});

function loadConfig() {
    loading.value = true;
    $server.getOpConfig(props.explorerId)
        .then(({ data }) => {
            if (data.opConfig) {
                config.value = {
                    ...config.value,
                    ...data.opConfig
                };
            }
        })
        .catch(console.log)
        .finally(() => loading.value = false);
}

function saveOrUpdateConfig() {
    if (config.value.id) {
        updateConfig();
    } else {
        createConfig();
    }
}

function createConfig() {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    $server.createOpConfig(props.explorerId, config.value)
        .then(({ data: { config: newConfig } }) => {
            config.value = { ...config.value, ...newConfig };
            successMessage.value = 'OP Stack configuration created.';
        })
        .catch(error => errorMessage.value = error.response && error.response.data || 'Error while creating configuration. Please retry.')
        .finally(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loading.value = false;
        });
}

function updateConfig() {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    $server.updateOpConfig(props.explorerId, config.value)
        .then(({ data: { config: updatedConfig } }) => {
            config.value = { ...config.value, ...updatedConfig };
            successMessage.value = 'OP Stack configuration saved.';
        })
        .catch(error => errorMessage.value = error.response && error.response.data || 'Error while saving configuration. Please retry.')
        .finally(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loading.value = false;
        });
}

onMounted(async () => {
    loadConfig();
});
</script>
