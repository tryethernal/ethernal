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
                                v-model="selectedL1Type"
                                label="L1 Parent Chain (required)"
                                :items="l1ParentOptions"
                                item-title="name"
                                item-value="value"
                                :rules="networkRules"
                                :disabled="loading || loadingL1Parents || !!config.id"
                                :loading="loadingL1Parents"
                                hint="Select the L1 chain for your OP Stack rollup"
                                persistent-hint
                                no-data-text="No supported networks available."
                            />
                        </v-col>

                        <!-- Custom L1 fields (new custom L1) -->
                        <template v-if="selectedL1Type === 'custom-new'">
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="customL1Name"
                                    label="Custom L1 Name"
                                    required
                                    :disabled="loading"
                                    placeholder="My Private L1"
                                />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field
                                    v-model="customL1BackendRpc"
                                    label="Backend RPC Server (for syncing)"
                                    required
                                    :rules="urlRules"
                                    :disabled="loading"
                                    placeholder="https://my-private-l1.com/rpc"
                                    hint="Used by our servers to sync L1 data. OP Stack does not need a frontend RPC."
                                    persistent-hint
                                />
                            </v-col>
                        </template>
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
const loadingL1Parents = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const publicL1Parents = ref([]);
const customL1Parents = ref([]);
const availableNetworks = ref([]);
const isFormValid = ref(false);
const selectedL1Type = ref(null);
const customL1Name = ref('');
const customL1BackendRpc = ref('');

const config = ref({
    networkId: null,
    outputVersion: 0,
    l2ToL1MessagePasserAddress: '0x4200000000000000000000000000000000000016'
});

const l1ParentOptions = computed(() => {
    const options = [];

    // Add public L1 parents from the static list
    for (const network of availableNetworks.value) {
        const matchingPublicParent = publicL1Parents.value.find(p => String(p.networkId) === String(network.networkId));
        options.push({
            name: network.name,
            value: matchingPublicParent ? `public-${matchingPublicParent.id}` : `network-${network.networkId}`,
            networkId: network.networkId,
            id: matchingPublicParent ? matchingPublicParent.id : null
        });
    }

    // Add existing custom L1 parents
    for (const parent of customL1Parents.value) {
        options.push({
            name: `${parent.name} (Custom)`,
            value: `custom-${parent.id}`,
            id: parent.id,
            networkId: parent.networkId
        });
    }

    // Add option to create new custom L1
    options.push({
        name: 'Custom (Create New)',
        value: 'custom-new'
    });

    return options;
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

const urlRules = [
    v => !!v || 'RPC URL is required',
    v => {
        try {
            const url = new URL(v);
            return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || 'URL must use http, https, ws, or wss protocol';
        } catch {
            return 'Must be a valid URL';
        }
    }
];

const networkRules = [
    v => !!v || 'Network selection is required'
];

const isConfigured = computed(() => {
    // Base requirements
    const baseRequirements = !!(config.value.optimismPortalAddress && config.value.batchInboxAddress);

    // For existing configs, only need base requirements
    if (config.value.id) return baseRequirements;

    // For new configs, also need L1 selection
    if (!selectedL1Type.value) return false;

    // If creating new custom L1, need name and backend RPC
    if (selectedL1Type.value === 'custom-new') {
        return baseRequirements && !!customL1Name.value && !!customL1BackendRpc.value;
    }

    return baseRequirements;
});

function loadAvailableNetworks() {
    $server.getAvailableOpParents()
        .then(({ data }) => {
            availableNetworks.value = data.availableNetworks || [];
        })
        .catch(console.log);
}

function loadAvailableL1Parents() {
    loadingL1Parents.value = true;
    $server.getAvailableL1Parents()
        .then(({ data }) => {
            publicL1Parents.value = data.publicParents || [];
            customL1Parents.value = data.customParents || [];
            // Auto-select Ethereum Mainnet if available and no config yet
            if (!config.value.id && publicL1Parents.value.length > 0) {
                const mainnet = publicL1Parents.value.find(p => p.networkId === '1');
                if (mainnet) {
                    selectedL1Type.value = `public-${mainnet.id}`;
                }
            }
        })
        .catch(console.log)
        .finally(() => loadingL1Parents.value = false);
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
                // Determine which L1 parent type it's using
                if (data.opConfig.parentWorkspaceId) {
                    const publicMatch = publicL1Parents.value.find(p => p.id === data.opConfig.parentWorkspaceId);
                    const customMatch = customL1Parents.value.find(p => p.id === data.opConfig.parentWorkspaceId);
                    if (publicMatch) {
                        selectedL1Type.value = `public-${publicMatch.id}`;
                    } else if (customMatch) {
                        selectedL1Type.value = `custom-${customMatch.id}`;
                    }
                }
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

async function createConfig() {
    loading.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
        let configPayload = { ...config.value };

        // Handle L1 parent selection
        if (selectedL1Type.value === 'custom-new') {
            // Create new custom L1 parent inline
            configPayload.customL1 = {
                name: customL1Name.value,
                rpcServer: customL1BackendRpc.value
            };
        } else if (selectedL1Type.value && selectedL1Type.value.startsWith('custom-')) {
            // Use existing custom L1 parent
            const parentId = parseInt(selectedL1Type.value.replace('custom-', ''));
            configPayload.parentWorkspaceId = parentId;
        } else if (selectedL1Type.value && selectedL1Type.value.startsWith('public-')) {
            // Use public L1 parent
            const parentId = parseInt(selectedL1Type.value.replace('public-', ''));
            configPayload.parentWorkspaceId = parentId;
        } else if (selectedL1Type.value && selectedL1Type.value.startsWith('network-')) {
            // Use network ID (legacy fallback)
            const networkId = selectedL1Type.value.replace('network-', '');
            configPayload.networkId = networkId;
        }

        const { data: { config: newConfig } } = await $server.createOpConfig(props.explorerId, configPayload);
        config.value = {
            ...config.value,
            ...newConfig,
            networkId: newConfig.parentChainId
        };
        successMessage.value = 'OP Stack configuration created.';

        // Reload L1 parents to include the newly created custom one
        loadAvailableL1Parents();
    } catch (error) {
        errorMessage.value = error.response && error.response.data || 'Error while creating configuration. Please retry.';
    } finally {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loading.value = false;
    }
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
    loadAvailableL1Parents();
    loadConfig();
});
</script>
