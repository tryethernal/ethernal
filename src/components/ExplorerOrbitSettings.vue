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
                            <v-alert class="mb-3" variant="tonal" type="warning" density="compact">
                                Only Ethereum Mainnet and Arbitrum One are supported as L1 for Orbit rollups at the moment. If you need support for another L1, please reach out.
                            </v-alert>
                           
                            <v-alert class="mb-6" variant="tonal" type="info" density="compact">
                                This RPC will be exposed to end-users, we'll only use it to validate your configuration and send withdrawal (L2 -> L1) claim transactions.
                            </v-alert>
                            <v-text-field
                                v-model="config.parentChainRpcServer"
                                label="L1 RPC Server"
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

const config = ref({});

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
    return !!(config.value.parentChainRpcServer &&
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
});

function loadConfig() {
    loading.value = true;
    $server.getOrbitConfig(props.explorerId)
        .then(({ data }) => {
            config.value = data.orbitConfig || {};
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

    $server.createOrbitConfig(props.explorerId, config.value)
        .then(({ data: { config } }) => {
            config.value = config || {};
            successMessage.value = 'Orbit configuration created.';
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
    loadConfig();
});
</script>
