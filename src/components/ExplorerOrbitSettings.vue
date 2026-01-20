<template>
    <div class="explorer-orbit-settings pa-4">
        <div class="mb-6">
            <h3 class="text-h5 mb-2">Orbit Chain Configuration</h3>
            <p class="text-body-2 text-medium-emphasis">
                Configure your Orbit chain contracts to enable advanced transaction state tracking.
                This allows you to monitor the complete lifecycle of transactions from submission to finalization.
            </p>
        </div>

        <v-alert class="mb-3" v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
        <v-alert class="mb-3" v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>

        <v-card>
            <v-card-title>
                <h4>L1 Chain</h4>
            </v-card-title>

            <v-card-text>
                <v-form v-model="isConfigured" @submit.prevent="saveOrUpdateConfig">
                    <v-row>
                        <v-col cols="12">
                            <v-select
                                v-model="selectedL1Type"
                                label="L1 Parent Chain (required)"
                                :items="l1ParentOptions"
                                item-title="name"
                                item-value="value"
                                :disabled="loading || loadingL1Parents || !!config.id"
                                :loading="loadingL1Parents"
                                hint="Select the L1 chain for your Orbit rollup"
                                persistent-hint
                            />
                        </v-col>

                        <!-- Custom L1 fields (new custom L1) -->
                        <template v-if="selectedL1Type === 'custom-new'">
                            <v-col cols="12">
                                <v-alert class="mb-3" variant="tonal" type="info" density="compact">
                                    Create a new custom L1 parent. The backend RPC will be used for syncing L1 data.
                                </v-alert>
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="customL1Name"
                                    label="Custom L1 Name"
                                    required
                                    :disabled="loading"
                                    placeholder="My Private L1"
                                />
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-text-field
                                    v-model="customL1BackendRpc"
                                    label="Backend RPC Server (for syncing)"
                                    required
                                    :rules="urlRules"
                                    :disabled="loading"
                                    placeholder="https://my-private-l1.com/rpc"
                                    hint="Used by our servers to sync L1 data"
                                    persistent-hint
                                />
                            </v-col>
                        </template>

                        <!-- Frontend RPC field (for all selections) -->
                        <v-col cols="12">
                            <v-alert class="mb-3" variant="tonal" type="info" density="compact">
                                This RPC will be exposed to end-users for sending withdrawal (L2 -> L1) claim transactions.
                            </v-alert>
                            <v-text-field
                                v-model="config.parentChainRpcServer"
                                label="L1 RPC Server (frontend)"
                                required
                                :rules="urlRules"
                                :disabled="loading"
                                placeholder="https://mainnet.infura.io/v3/YOUR_KEY"
                            />
                        </v-col>
                    </v-row>
                    
                    <v-divider class="mb-4 mt-1" />
                    
                    <h5 class="text-h6 mb-4">L1 Contracts</h5>
                    
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.rollupContract"
                                label="Rollup Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.bridgeContract"
                                label="Bridge Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.inboxContract"
                                label="Inbox Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.sequencerInboxContract"
                                label="Sequencer Inbox Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.outboxContract"
                                label="Outbox Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l1GatewayRouter"
                                label="L1 Gateway Router Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l1Erc20Gateway"
                                label="L1 ERC20 Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l1WethGateway"
                                label="L1 WETH Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l1CustomGateway"
                                label="L1 Custom Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.challengeManagerContract"
                                label="Challenge Manager Contract Address (optional)"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.validatorWalletCreatorContract"
                                label="Validator Wallet Creator Contract Address (optional)"
                                :rules="optionalAddressRules"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.stakeToken"
                                label="Stake Token Address (optional)"
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
                                v-model="config.l2GatewayRouter"
                                label="L2 Gateway Router Contract Address (required)"
                                :rules="addressRules"
                                required
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l2Erc20Gateway"
                                label="L2 ERC20 Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l2WethGateway"
                                label="L2 WETH Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                :disabled="loading"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.l2CustomGateway"
                                label="L2 Custom Gateway Contract Address (required)"
                                :rules="addressRules"
                                required
                                :disabled="loading"
                            />
                        </v-col>
                    </v-row>

                    <v-divider class="mb-4 mt-1" />

                    <h5 class="text-h6 mb-4">Advanced Settings</h5>
                    
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.parentMessageCountShift"
                                label="L1/L2 Message Count Shift (optional)"
                                type="number"
                                hint="Number of blocks to shift when counting messages"
                                persistent-hint
                                :disabled="loading"
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
import { ref, computed, onMounted, inject, watch } from 'vue';

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

const config = ref({});
const publicL1Parents = ref([]);
const customL1Parents = ref([]);
const selectedL1Type = ref(null);
const customL1Name = ref('');
const customL1BackendRpc = ref('');

const l1ParentOptions = computed(() => {
    const options = [];

    // Add public L1 parents
    for (const parent of publicL1Parents.value) {
        options.push({
            name: parent.name,
            value: `public-${parent.id}`,
            id: parent.id,
            networkId: parent.networkId
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

const isConfigured = computed(() => {
    // Base requirements
    const baseRequirements = !!(config.value.parentChainRpcServer &&
           config.value.rollupContract &&
           config.value.bridgeContract &&
           config.value.inboxContract &&
           config.value.sequencerInboxContract &&
           config.value.outboxContract &&
           config.value.l1GatewayRouter &&
           config.value.l1Erc20Gateway &&
           config.value.l1WethGateway &&
           config.value.l1CustomGateway &&
           config.value.l2GatewayRouter &&
           config.value.l2Erc20Gateway &&
           config.value.l2WethGateway &&
           config.value.l2CustomGateway);

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
    $server.getOrbitConfig(props.explorerId)
        .then(({ data }) => {
            config.value = data.orbitConfig || {};
            // If config exists, determine which L1 parent type it's using
            if (config.value.id && config.value.parentWorkspaceId) {
                // Check if it's a public or custom L1
                const publicMatch = publicL1Parents.value.find(p => p.id === config.value.parentWorkspaceId);
                const customMatch = customL1Parents.value.find(p => p.id === config.value.parentWorkspaceId);
                if (publicMatch) {
                    selectedL1Type.value = `public-${publicMatch.id}`;
                } else if (customMatch) {
                    selectedL1Type.value = `custom-${customMatch.id}`;
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
        }

        const { data: { config: newConfig } } = await $server.createOrbitConfig(props.explorerId, configPayload);
        config.value = newConfig || {};
        successMessage.value = 'Orbit configuration created.';

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
    
    $server.updateOrbitConfig(props.explorerId, config.value)
        .then(({ data: { config } }) => {
            config.value = config || {};
            successMessage.value = 'Orbit configuration saved.';
        })
        .catch(error => errorMessage.value = error.response && error.response.data || 'Error while saving configuration. Please retry.')
        .finally(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            loading.value = false;
        });
}

onMounted(async () => {
    loadAvailableL1Parents();
    loadConfig();
});
</script>
