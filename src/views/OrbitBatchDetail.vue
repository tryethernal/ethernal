<template>
    <div class="orbit-batch-detail">
        <!-- Header -->
        <div class="d-flex align-center mb-6">
            <v-btn
                variant="text"
                icon="mdi-arrow-left"
                @click="$router.back()"
                class="mr-3"
            />
            <div>
                <h1 class="text-h4 mb-1">
                    Batch #{{ $route.params.batchNumber }}
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                    Detailed information for this orbit batch
                </p>
            </div>
            
            <v-spacer />
            
            <v-btn
                color="primary"
                variant="outlined"
                @click="refreshBatch"
                :loading="loading"
                prepend-icon="mdi-refresh"
            >
                Refresh
            </v-btn>
        </div>

        <!-- Loading State -->
        <div v-if="loading && !batch" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" size="48" />
            <div class="text-h6 mt-4">Loading batch details...</div>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="error" type="error" class="mb-6">
            {{ error }}
        </v-alert>

        <!-- Batch Details -->
        <div v-else-if="batch">
            <!-- Status Banner -->
            <v-alert
                :type="getAlertType(batch.status)"
                :icon="getStatusIcon(batch.status)"
                class="mb-6"
            >
                <div class="d-flex align-center">
                    <div>
                        <div class="text-h6">{{ batch.status.label }}</div>
                        <div class="text-body-2">{{ batch.status.description }}</div>
                    </div>
                    <v-spacer />
                    <div v-if="batch.timing.ageFormatted" class="text-body-2">
                        Posted {{ batch.timing.ageFormatted }} ago
                    </div>
                </div>
            </v-alert>

            <!-- Main Information Grid -->
            <v-row class="mb-6">
                <!-- Basic Information -->
                <v-col cols="12" md="6">
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">mdi-information-outline</v-icon>
                            Basic Information
                        </v-card-title>
                        <v-card-text>
                            <v-list density="compact">
                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Batch Number:</span>
                                    </template>
                                    <span class="font-weight-medium">#{{ batch.batchSequenceNumber }}</span>
                                </v-list-item>
                                
                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Parent Chain Block:</span>
                                    </template>
                                    <a 
                                        :href="getParentChainBlockUrl(batch.parentChainBlockNumber)"
                                        target="_blank"
                                        class="text-decoration-none"
                                    >
                                        {{ batch.parentChainBlockNumber }}
                                    </a>
                                </v-list-item>

                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Parent Chain Tx:</span>
                                    </template>
                                    <a 
                                        :href="getParentChainTxUrl(batch.parentChainTxHash)"
                                        target="_blank"
                                        class="text-decoration-none font-mono"
                                    >
                                        {{ batch.parentChainTxHash }}
                                    </a>
                                </v-list-item>

                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Transaction Count:</span>
                                    </template>
                                    <span class="font-weight-medium">
                                        {{ batch.transactionCount?.toLocaleString() || '0' }}
                                    </span>
                                </v-list-item>

                                <v-list-item v-if="batch.batchSize">
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Batch Size:</span>
                                    </template>
                                    <span>{{ formatBytes(batch.batchSize) }}</span>
                                </v-list-item>

                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Data Location:</span>
                                    </template>
                                    <v-chip size="small" :color="getDataLocationColor(batch.batchDataLocation)">
                                        {{ batch.batchDataLocation.toUpperCase() }}
                                    </v-chip>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                    </v-card>
                </v-col>

                <!-- Timing Information -->
                <v-col cols="12" md="6">
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">mdi-clock-outline</v-icon>
                            Timing
                        </v-card-title>
                        <v-card-text>
                            <v-list density="compact">
                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Posted At:</span>
                                    </template>
                                    <span>{{ formatDateTime(batch.timing.postedAt) }}</span>
                                </v-list-item>

                                <v-list-item>
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Age:</span>
                                    </template>
                                    <span>{{ batch.timing.ageFormatted }}</span>
                                </v-list-item>

                                <v-list-item v-if="batch.timing.confirmedAt">
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Confirmed At:</span>
                                    </template>
                                    <span>{{ formatDateTime(batch.timing.confirmedAt) }}</span>
                                </v-list-item>

                                <v-list-item v-if="batch.timing.timeToConfirmFormatted">
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Time to Confirm:</span>
                                    </template>
                                    <span>{{ batch.timing.timeToConfirmFormatted }}</span>
                                </v-list-item>

                                <v-list-item v-if="batch.timing.finalizedAt">
                                    <template v-slot:prepend>
                                        <span class="text-medium-emphasis">Finalized At:</span>
                                    </template>
                                    <span>{{ formatDateTime(batch.timing.finalizedAt) }}</span>
                                </v-list-item>
                            </v-list>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Economics Information -->
            <v-row v-if="hasEconomicsData" class="mb-6">
                <v-col cols="12">
                    <v-card>
                        <v-card-title>
                            <v-icon class="mr-2">mdi-currency-eth</v-icon>
                            Economics
                        </v-card-title>
                        <v-card-text>
                            <v-row>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-center">
                                        <div class="text-h5 font-mono">
                                            {{ batch.economics.l1CostEth || '—' }}
                                        </div>
                                        <div class="text-caption text-medium-emphasis">ETH Cost</div>
                                    </div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-center">
                                        <div class="text-h5">
                                            {{ batch.economics.l1GasUsedFormatted || '—' }}
                                        </div>
                                        <div class="text-caption text-medium-emphasis">Gas Used</div>
                                    </div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-center">
                                        <div class="text-h5">
                                            {{ batch.economics.l1GasPriceGwei || '—' }}
                                        </div>
                                        <div class="text-caption text-medium-emphasis">Gas Price (Gwei)</div>
                                    </div>
                                </v-col>
                                <v-col cols="12" sm="6" md="3">
                                    <div class="text-center">
                                        <div class="text-h5 font-mono">
                                            {{ batch.economics.costPerTransactionEth || '—' }}
                                        </div>
                                        <div class="text-caption text-medium-emphasis">Cost per Tx (ETH)</div>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <!-- Technical Details (Collapsible) -->
            <v-expansion-panels class="mb-6">
                <v-expansion-panel>
                    <v-expansion-panel-title>
                        <v-icon class="mr-2">mdi-code-braces</v-icon>
                        Technical Details
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <v-list density="compact">
                            <v-list-item v-if="batch.batchHash">
                                <template v-slot:prepend>
                                    <span class="text-medium-emphasis">Batch Hash:</span>
                                </template>
                                <code class="font-mono">{{ batch.batchHash }}</code>
                            </v-list-item>

                            <v-list-item v-if="batch.beforeAcc">
                                <template v-slot:prepend>
                                    <span class="text-medium-emphasis">Before Acc:</span>
                                </template>
                                <code class="font-mono">{{ batch.beforeAcc }}</code>
                            </v-list-item>

                            <v-list-item v-if="batch.afterAcc">
                                <template v-slot:prepend>
                                    <span class="text-medium-emphasis">After Acc:</span>
                                </template>
                                <code class="font-mono">{{ batch.afterAcc }}</code>
                            </v-list-item>

                            <v-list-item v-if="batch.delayedAcc">
                                <template v-slot:prepend>
                                    <span class="text-medium-emphasis">Delayed Acc:</span>
                                </template>
                                <code class="font-mono">{{ batch.delayedAcc }}</code>
                            </v-list-item>

                            <v-list-item v-if="batch.batchDataHash">
                                <template v-slot:prepend>
                                    <span class="text-medium-emphasis">Data Hash:</span>
                                </template>
                                <code class="font-mono">{{ batch.batchDataHash }}</code>
                            </v-list-item>
                        </v-list>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <!-- Transactions in Batch -->
            <v-card>
                <v-card-title>
                    <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                    Transactions in Batch
                    <v-spacer />
                    <v-chip v-if="batch.transactions" size="small" variant="outlined">
                        {{ batch.transactions.length }} transactions
                    </v-chip>
                </v-card-title>

                <v-data-table
                    v-if="batch.transactions && batch.transactions.length > 0"
                    :headers="transactionHeaders"
                    :items="batch.transactions"
                    density="compact"
                    class="elevation-0"
                    :items-per-page="10"
                >
                    <template v-slot:item.hash="{ item }">
                        <router-link 
                            :to="{ name: 'transaction', params: { hash: item.hash } }"
                            class="text-decoration-none font-mono"
                        >
                            {{ item.hash.substring(0, 10) }}...{{ item.hash.substring(-8) }}
                        </router-link>
                    </template>

                    <template v-slot:item.from="{ item }">
                        <code class="text-caption">
                            {{ item.from.substring(0, 8) }}...{{ item.from.substring(-6) }}
                        </code>
                    </template>

                    <template v-slot:item.to="{ item }">
                        <code class="text-caption">
                            {{ item.to.substring(0, 8) }}...{{ item.to.substring(-6) }}
                        </code>
                    </template>

                    <template v-slot:item.value="{ item }">
                        <span class="font-mono">{{ formatEth(item.value) }}</span>
                    </template>

                    <template v-slot:item.currentState="{ item }">
                        <v-chip size="small" :color="getStateColor(item.currentState)">
                            {{ item.currentState }}
                        </v-chip>
                    </template>
                </v-data-table>

                <div v-else class="text-center pa-8">
                    <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-inbox-outline</v-icon>
                    <div class="text-h6 text-medium-emphasis">No transactions found</div>
                    <div class="text-body-2 text-medium-emphasis">
                        This batch doesn't contain any tracked transactions
                    </div>
                </div>
            </v-card>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

const route = useRoute();
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive data
const loading = ref(false);
const batch = ref(null);
const error = ref(null);

// Computed properties
const hasEconomicsData = computed(() => {
    return batch.value?.economics && (
        batch.value.economics.l1CostEth ||
        batch.value.economics.l1GasUsed ||
        batch.value.economics.l1GasPrice ||
        batch.value.economics.costPerTransactionEth
    );
});

// Table headers for transactions
const transactionHeaders = [
    { title: 'Hash', key: 'hash', sortable: false },
    { title: 'From', key: 'from', sortable: false },
    { title: 'To', key: 'to', sortable: false },
    { title: 'Value', key: 'value', sortable: false },
    { title: 'State', key: 'currentState', sortable: false }
];

// Methods
async function loadBatchDetails() {
    if (!currentWorkspaceStore.currentWorkspace) return;
    
    loading.value = true;
    error.value = null;
    
    try {
        const response = await $server.getOrbitBatchDetail(route.params.batchNumber);
        
        batch.value = response.data;
        
    } catch (err) {
        if (err.response?.status === 404) {
            error.value = `Batch #${route.params.batchNumber} not found`;
        } else {
            error.value = err.response?.data?.message || 'Failed to load batch details';
        }
    } finally {
        loading.value = false;
    }
}

async function refreshBatch() {
    await loadBatchDetails();
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatEth(wei) {
    if (!wei) return '0 ETH';
    const eth = parseFloat(wei) / 1e18;
    return eth.toFixed(6) + ' ETH';
}

function getParentChainTxUrl(txHash) {
    const chainId = currentWorkspaceStore.orbitConfig?.parentChainId;
    const baseUrls = {
        1: 'https://etherscan.io/tx/',
        5: 'https://goerli.etherscan.io/tx/',
        42161: 'https://arbiscan.io/tx/',
        42170: 'https://nova.arbiscan.io/tx/'
    };
    return (baseUrls[chainId] || 'https://etherscan.io/tx/') + txHash;
}

function getParentChainBlockUrl(blockNumber) {
    const chainId = currentWorkspaceStore.orbitConfig?.parentChainId;
    const baseUrls = {
        1: 'https://etherscan.io/block/',
        5: 'https://goerli.etherscan.io/block/',
        42161: 'https://arbiscan.io/block/',
        42170: 'https://nova.arbiscan.io/block/'
    };
    return (baseUrls[chainId] || 'https://etherscan.io/block/') + blockNumber;
}

function getAlertType(status) {
    const typeMap = {
        'pending': 'warning',
        'confirmed': 'info',
        'challenged': 'error',
        'finalized': 'success'
    };
    return typeMap[status?.label?.toLowerCase()] || 'info';
}

function getStatusIcon(status) {
    const iconMap = {
        'pending': 'mdi-clock-outline',
        'confirmed': 'mdi-check-circle-outline',
        'challenged': 'mdi-alert-circle-outline',
        'finalized': 'mdi-shield-check-outline'
    };
    return iconMap[status?.label?.toLowerCase()] || 'mdi-information-outline';
}

function getDataLocationColor(location) {
    const colorMap = {
        'onchain': 'success',
        'das': 'info',
        'ipfs': 'warning'
    };
    return colorMap[location] || 'default';
}

function getStateColor(state) {
    const colorMap = {
        'SUBMITTED': 'grey',
        'SEQUENCED': 'info',
        'POSTED': 'warning',
        'CONFIRMED': 'success',
        'FINALIZED': 'success',
        'FAILED': 'error'
    };
    return colorMap[state] || 'default';
}

// Lifecycle
onMounted(async () => {
    await loadBatchDetails();
});
</script>

<style scoped>
.orbit-batch-detail {
    padding: 24px;
}

.font-mono {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.v-list-item {
    padding: 8px 0;
}

.v-list-item__prepend {
    min-width: 140px;
}

code {
    font-size: 0.875rem;
    background-color: rgba(var(--v-theme-surface-variant), 0.12);
    padding: 2px 6px;
    border-radius: 4px;
}
</style>