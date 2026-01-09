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
                <v-form v-model="isFormValid" @submit.prevent="saveOrUpdateConfig">
                    <v-row>
                        <v-col cols="12">
                            <v-alert class="mb-3" variant="tonal" type="info" density="compact">
                                Configure the L1 parent chain details. This workspace should be your L2 OP Stack chain,
                                and you need to specify the L1 parent chain contracts.
                            </v-alert>
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-select
                                v-model="config.networkId"
                                label="L1 Parent Network (required)"
                                :items="availableNetworks"
                                item-title="name"
                                item-value="networkId"
                                :rules="networkRules"
                                :disabled="loading || loadingNetworks || !!config.id"
                                :loading="loadingNetworks"
                                hint="Select the L1 chain for your OP Stack rollup"
                                persistent-hint
                                no-data-text="No supported networks available."
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
const loadingNetworks = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const availableNetworks = ref([]);
const isFormValid = ref(false);

const config = ref({
    networkId: null,
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

const networkRules = [
    v => !!v || 'Network selection is required'
];

const isConfigured = computed(() => {
    return !!(config.value.networkId &&
           config.value.optimismPortalAddress &&
           config.value.batchInboxAddress);
});

function loadAvailableNetworks() {
    loadingNetworks.value = true;
    $server.getAvailableOpParents()
        .then(({ data }) => {
            availableNetworks.value = data.availableNetworks || [];
            // Auto-select if only one network available and no config yet
            if (availableNetworks.value.length === 1 && !config.value.networkId && !config.value.id) {
                config.value.networkId = availableNetworks.value[0].networkId;
            }
        })
        .catch(console.log)
        .finally(() => loadingNetworks.value = false);
}

function loadConfig() {
    loading.value = true;
    $server.getOpConfig(props.explorerId)
        .then(({ data }) => {
            if (data.opConfig) {
                config.value = {
                    ...config.value,
                    ...data.opConfig,
                    // Map parentChainId to networkId for the form
                    networkId: data.opConfig.parentChainId
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
            config.value = {
                ...config.value,
                ...newConfig,
                networkId: newConfig.parentChainId
            };
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

    // Don't send networkId on updates - it can't be changed
    const updatePayload = { ...config.value };
    delete updatePayload.networkId;

    $server.updateOpConfig(props.explorerId, updatePayload)
        .then(({ data: { config: updatedConfig } }) => {
            config.value = {
                ...config.value,
                ...updatedConfig,
                networkId: updatedConfig.parentChainId
            };
            successMessage.value = 'OP Stack configuration saved.';
        })
        .catch(error => errorMessage.value = error.response && error.response.data || 'Error while saving configuration. Please retry.')
        .finally(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loading.value = false;
        });
}

onMounted(async () => {
    loadAvailableNetworks();
    loadConfig();
});
</script>
