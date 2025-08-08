<template>
    <div class="explorer-orbit-settings pa-4">
        <div class="mb-6">
            <h3 class="text-h5 mb-2">Arbitrum Orbit Chain Configuration</h3>
            <p class="text-body-2 text-medium-emphasis">
                Configure your Arbitrum Orbit chain contracts to enable advanced transaction state tracking.
                This allows you to monitor the complete lifecycle of transactions from submission to finalization.
            </p>
        </div>

        <v-alert 
            v-if="!isConfigured"
            type="info" 
            class="mb-6"
            title="Orbit Chain Not Configured"
            text="Configure your Arbitrum Orbit chain contracts to enable transaction state tracking and monitoring features."
        />

        <v-card>
            <v-card-title>
                <h4>Chain Configuration</h4>
            </v-card-title>
            
            <v-card-text>
                <v-form v-model="valid" ref="form">
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="config.chainType"
                                :items="chainTypes"
                                label="Chain Type"
                                required
                                hint="Select whether this is a Rollup or AnyTrust chain"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.parentChainId"
                                label="Parent Chain ID"
                                type="number"
                                required
                                hint="The chain ID of the parent chain (e.g., 1 for Ethereum)"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                v-model="config.parentChainRpcServer"
                                label="Parent Chain RPC Server"
                                required
                                :rules="urlRules"
                                hint="RPC endpoint for the parent chain where infrastructure contracts are deployed (e.g., https://mainnet.infura.io/v3/YOUR_KEY)"
                                persistent-hint
                                :disabled="loading"
                                placeholder="https://mainnet.infura.io/v3/YOUR_KEY"
                            />
                        </v-col>
                    </v-row>
                    
                    <v-divider class="my-6" />
                    
                    <h5 class="text-h6 mb-4">Required Contracts</h5>
                    
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.rollupContract"
                                label="Rollup Contract Address"
                                :rules="addressRules"
                                required
                                hint="The main rollup contract address"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.bridgeContract"
                                label="Bridge Contract Address"
                                :rules="addressRules"
                                required
                                hint="The bridge contract address"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.inboxContract"
                                label="Inbox Contract Address"
                                :rules="addressRules"
                                required
                                hint="The inbox contract address"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.sequencerInboxContract"
                                label="Sequencer Inbox Contract Address"
                                :rules="addressRules"
                                required
                                hint="The sequencer inbox contract address"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.outboxContract"
                                label="Outbox Contract Address"
                                :rules="addressRules"
                                required
                                hint="The outbox contract address"
                                persistent-hint
                                :disabled="loading"
                            />
                        </v-col>
                    </v-row>
                    
                    <v-expansion-panels class="mt-4">
                        <v-expansion-panel title="Optional Contracts">
                            <v-expansion-panel-text>
                                <v-row>
                                    <v-col cols="12" md="6">
                                        <v-text-field
                                            v-model="config.challengeManagerContract"
                                            label="Challenge Manager Contract"
                                            :rules="optionalAddressRules"
                                            hint="Optional: Challenge manager contract address"
                                            persistent-hint
                                            :disabled="loading"
                                        />
                                    </v-col>
                                    
                                    <v-col cols="12" md="6">
                                        <v-text-field
                                            v-model="config.validatorWalletCreatorContract"
                                            label="Validator Wallet Creator Contract"
                                            :rules="optionalAddressRules"
                                            hint="Optional: Validator wallet creator contract address"
                                            persistent-hint
                                            :disabled="loading"
                                        />
                                    </v-col>
                                </v-row>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                        
                        <v-expansion-panel title="Advanced Settings">
                            <v-expansion-panel-text>
                                <v-row>
                                    <v-col cols="12" md="6">
                                        <v-text-field
                                            v-model="config.confirmationPeriodBlocks"
                                            label="Confirmation Period (blocks)"
                                            type="number"
                                            hint="Number of blocks for confirmation period"
                                            persistent-hint
                                            :disabled="loading"
                                        />
                                    </v-col>
                                    
                                    <v-col cols="12" md="6">
                                        <v-text-field
                                            v-model="config.stakeToken"
                                            label="Stake Token Address"
                                            :rules="optionalAddressRules"
                                            hint="Optional: Custom stake token address"
                                            persistent-hint
                                            :disabled="loading"
                                        />
                                    </v-col>
                                </v-row>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </v-form>
            </v-card-text>
            
            <v-card-actions>
                <v-btn 
                    color="primary"
                    :disabled="!valid || loading"
                    :loading="loading"
                    @click="saveConfig"
                >
                    {{ isConfigured ? 'Update Configuration' : 'Save Configuration' }}
                </v-btn>
                
                <v-btn 
                    v-if="isConfigured"
                    color="error"
                    variant="outlined"
                    :loading="removing"
                    @click="removeConfig"
                    class="ml-2"
                >
                    Remove Configuration
                </v-btn>
                
                <v-spacer />
                
                <v-btn 
                    v-if="isConfigured"
                    color="info"
                    variant="text"
                    @click="testConfiguration"
                    :loading="testing"
                >
                    Test Configuration
                </v-btn>
            </v-card-actions>
        </v-card>

        <!-- Configuration Status -->
        <v-card v-if="isConfigured" class="mt-6">
            <v-card-title>
                <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                Configuration Status
            </v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="6">
                        <div class="mb-2">
                            <strong>Chain Type:</strong> {{ config.chainType }}
                        </div>
                        <div class="mb-2">
                            <strong>Parent Chain ID:</strong> {{ config.parentChainId }}
                        </div>
                        <div class="mb-2">
                            <strong>Parent Chain RPC:</strong> 
                            <code class="text-caption">{{ config.parentChainRpcServer }}</code>
                        </div>
                        <div>
                            <strong>Status:</strong>
                            <v-chip size="small" color="success" class="ml-2">
                                Active
                            </v-chip>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-alert 
                            type="success" 
                            density="compact"
                            text="Orbit transaction state tracking is enabled for this explorer."
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Success/Error Snackbars -->
        <v-snackbar v-model="showSuccess" color="success" timeout="3000">
            Configuration saved successfully!
        </v-snackbar>
        
        <v-snackbar v-model="showError" color="error" timeout="5000">
            {{ errorMessage }}
        </v-snackbar>
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

const valid = ref(false);
const loading = ref(false);
const removing = ref(false);
const testing = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

const config = ref({
    chainType: 'ANYTRUST',
    rollupContract: '0x374de579AE15aD59eD0519aeAf1A23F348Df259c',
    bridgeContract: '0x6B71AFb4b7725227ab944c96FE018AB9dc0434b8',
    inboxContract: '0x1B98e4ED82Ee1a91A65a38C690e2266364064D15',
    sequencerInboxContract: '0xE6a92Ae29E24C343eE66A2B3D3ECB783d65E4a3C',
    outboxContract: '0x4F405BA65291063d8A524c2bDf55d4e67405c2aF',
    challengeManagerContract: '',
    validatorWalletCreatorContract: '0x5a6C98F6A60BDC02cE4d8AD43b4Fc88Fe5b38856',
    parentChainId: 42161,
    parentChainRpcServer: 'https://mainnet.infura.io/v3/YOUR_KEY',
    confirmationPeriodBlocks: 20,
    stakeToken: '0xAcB7D670bb95144B88a5Cd1883B87bC5021FD10a'
});

const chainTypes = [
    { title: 'Rollup', value: 'ROLLUP' },
    { title: 'AnyTrust', value: 'ANYTRUST' }
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

const isConfigured = computed(() => {
    return config.value.parentChainRpcServer &&
           config.value.rollupContract && 
           config.value.bridgeContract && 
           config.value.inboxContract &&
           config.value.sequencerInboxContract &&
           config.value.outboxContract;
});

async function saveConfig() {
    loading.value = true;
    errorMessage.value = '';
    
    try {
        await $server.saveOrbitConfig({
            explorerId: props.explorerId,
            config: config.value
        });
        
        showSuccess.value = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'Failed to save configuration';
        showError.value = true;
    } finally {
        loading.value = false;
    }
}

async function removeConfig() {
    if (!confirm('Are you sure you want to remove the Orbit configuration? This will disable transaction state tracking.')) {
        return;
    }
    
    removing.value = true;
    
    try {
        await $server.removeOrbitConfig(props.explorerId);
        
        // Reset config
        config.value = {
            chainType: 'ROLLUP',
            rollupContract: '',
            bridgeContract: '',
            inboxContract: '',
            sequencerInboxContract: '',
            outboxContract: '',
            challengeManagerContract: '',
            validatorWalletCreatorContract: '',
            parentChainId: 1,
            confirmationPeriodBlocks: 20,
            stakeToken: ''
        };
        
        showSuccess.value = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'Failed to remove configuration';
        showError.value = true;
    } finally {
        removing.value = false;
    }
}

async function testConfiguration() {
    testing.value = true;
    
    try {
        await $server.testOrbitConfig({
            explorerId: props.explorerId,
            config: config.value
        });
        
        // Show success message
        showSuccess.value = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'Configuration test failed';
        showError.value = true;
    } finally {
        testing.value = false;
    }
}

onMounted(async () => {
    try {
        const response = await $server.getOrbitConfig(props.explorerId);
        if (response.data && response.data.orbitConfig) {
            config.value = { ...config.value, ...response.data.orbitConfig };
        }
    } catch (error) {
        // Silently handle - just means no config exists yet
        console.log('No existing orbit config found');
    }
});
</script>

<style scoped>
.explorer-orbit-settings {
    max-width: 1200px;
    margin: 0 auto;
}
</style>