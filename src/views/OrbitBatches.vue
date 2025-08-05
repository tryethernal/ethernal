<template>
    <div class="orbit-batches">
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 mb-2">Orbit Batches</h1>
                <p class="text-body-1 text-medium-emphasis">
                    Batches posted to {{ parentChainName }} for {{ workspaceName }}
                </p>
            </div>
            
            <v-btn
                color="primary"
                variant="outlined"
                @click="refreshBatches"
                :loading="loading"
                prepend-icon="mdi-refresh"
            >
                Refresh
            </v-btn>
        </div>

        <!-- Statistics Cards -->
        <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
                <v-card>
                    <v-card-text class="text-center">
                        <div class="text-h5 primary--text">{{ statistics.totalBatches || '0' }}</div>
                        <div class="text-caption text-medium-emphasis">Total Batches</div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-card>
                    <v-card-text class="text-center">
                        <div class="text-h5 success--text">{{ statistics.statusDistribution?.finalized || '0' }}</div>
                        <div class="text-caption text-medium-emphasis">Finalized</div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-card>
                    <v-card-text class="text-center">
                        <div class="text-h5 warning--text">{{ statistics.statusDistribution?.pending || '0' }}</div>
                        <div class="text-caption text-medium-emphasis">Pending</div>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-card>
                    <v-card-text class="text-center">
                        <div class="text-h5 info--text">{{ statistics.avgTxPerBatch || '0' }}</div>
                        <div class="text-caption text-medium-emphasis">Avg Txs/Batch</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Filters -->
        <v-card class="mb-6">
            <v-card-title>Filters</v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" sm="6" md="3">
                        <v-select
                            v-model="filters.status"
                            :items="statusOptions"
                            label="Status"
                            clearable
                            variant="outlined"
                            density="compact"
                        />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-text-field
                            v-model="filters.fromDate"
                            label="From Date"
                            type="date"
                            variant="outlined"
                            density="compact"
                            clearable
                        />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-text-field
                            v-model="filters.toDate"
                            label="To Date"
                            type="date"
                            variant="outlined"
                            density="compact"
                            clearable
                        />
                    </v-col>
                    <v-col cols="12" sm="6" md="3">
                        <v-select
                            v-model="pageSize"
                            :items="pageSizeOptions"
                            label="Per Page"
                            variant="outlined"
                            density="compact"
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Batches Table -->
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center w-100">
                    <span>Batches</span>
                    <v-chip v-if="pagination.total" size="small" variant="outlined">
                        {{ pagination.total }} total
                    </v-chip>
                </div>
            </v-card-title>
            
            <v-data-table
                :headers="headers"
                :items="batches"
                :loading="loading"
                :server-items-length="pagination.total"
                v-model:page="currentPage"
                v-model:items-per-page="pageSize"
                @update:page="loadBatches"
                @update:itemsPerPage="loadBatches"
                class="elevation-1"
                item-key="batchSequenceNumber"
            >
                <template v-slot:item.batchSequenceNumber="{ item }">
                    <router-link 
                        :to="{ name: 'orbit-batch-detail', params: { batchNumber: item.batchSequenceNumber } }"
                        class="text-decoration-none"
                    >
                        <v-chip color="primary" variant="outlined" size="small">
                            #{{ item.batchSequenceNumber }}
                        </v-chip>
                    </router-link>
                </template>

                <template v-slot:item.status="{ item }">
                    <v-chip 
                        :color="item.status.color" 
                        size="small"
                        variant="flat"
                    >
                        {{ item.status.label }}
                    </v-chip>
                </template>

                <template v-slot:item.transactionCount="{ item }">
                    <span class="font-weight-medium">
                        {{ item.transactionCount?.toLocaleString() || '0' }}
                    </span>
                </template>

                <template v-slot:item.timing.ageFormatted="{ item }">
                    <span class="text-body-2">{{ item.timing.ageFormatted }}</span>
                </template>

                <template v-slot:item.economics.l1CostEth="{ item }">
                    <span v-if="item.economics.l1CostEth" class="font-mono">
                        {{ item.economics.l1CostEth }} ETH
                    </span>
                    <span v-else class="text-medium-emphasis">—</span>
                </template>

                <template v-slot:item.batchSize="{ item }">
                    <span v-if="item.batchSize" class="text-body-2">
                        {{ formatBytes(item.batchSize) }}
                    </span>
                    <span v-else class="text-medium-emphasis">—</span>
                </template>

                <template v-slot:item.parentChainTxHash="{ item }">
                    <v-tooltip bottom>
                        <template v-slot:activator="{ props }">
                            <a 
                                v-bind="props"
                                :href="getParentChainTxUrl(item.parentChainTxHash)"
                                target="_blank"
                                class="text-decoration-none"
                            >
                                <code class="text-caption">
                                    {{ item.parentChainTxHash.substring(0, 8) }}...{{ item.parentChainTxHash.substring(-6) }}
                                </code>
                            </a>
                        </template>
                        <span>{{ item.parentChainTxHash }}</span>
                    </v-tooltip>
                </template>

                <template v-slot:no-data>
                    <div class="text-center pa-4">
                        <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-package-variant</v-icon>
                        <div class="text-h6 text-medium-emphasis">No batches found</div>
                        <div class="text-body-2 text-medium-emphasis">
                            Batches will appear here once transactions are sequenced
                        </div>
                    </div>
                </template>
            </v-data-table>
        </v-card>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="d-flex justify-center mt-4">
            <v-pagination
                v-model="currentPage"
                :length="pagination.totalPages"
                :total-visible="7"
                @update:modelValue="loadBatches"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useExplorerStore } from '@/stores/explorer';

const route = useRoute();
const currentWorkspaceStore = useCurrentWorkspaceStore();
const explorerStore = useExplorerStore();

// Reactive data
const loading = ref(false);
const batches = ref([]);
const statistics = ref({});
const currentPage = ref(1);
const pageSize = ref(50);

const $server = inject('$server');

const filters = reactive({
    status: null,
    fromDate: null,
    toDate: null
});

const pagination = reactive({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
});

// Computed properties
const workspaceName = computed(() => currentWorkspaceStore.currentWorkspace?.name || 'Unknown');
const parentChainName = computed(() => {
    const chainId = currentWorkspaceStore.orbitConfig?.parentChainId;
    const chainNames = {
        1: 'Ethereum',
        5: 'Goerli',
        42161: 'Arbitrum One',
        42170: 'Arbitrum Nova'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
});

// Table configuration
const headers = [
    { title: 'Batch', key: 'batchSequenceNumber', sortable: true },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'Transactions', key: 'transactionCount', sortable: true },
    { title: 'Age', key: 'timing.ageFormatted', sortable: false },
    { title: 'L1 Cost', key: 'economics.l1CostEth', sortable: false },
    { title: 'Size', key: 'batchSize', sortable: false },
    { title: 'L1 Tx Hash', key: 'parentChainTxHash', sortable: false }
];

const statusOptions = [
    { title: 'All', value: null },
    { title: 'Pending', value: 'pending' },
    { title: 'Confirmed', value: 'confirmed' },
    { title: 'Challenged', value: 'challenged' },
    { title: 'Finalized', value: 'finalized' }
];

const pageSizeOptions = [25, 50, 100];

// Methods
async function loadBatches() {
    loading.value = true;
    
    try {
        const params = {
            page: currentPage.value,
            limit: pageSize.value
        };

        if (filters.status) params.status = filters.status;
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;

        const response = await $server.getOrbitBatches(params);
        
        batches.value = response.data.batches;
        Object.assign(pagination, response.data.pagination);

    } catch (error) {
        console.error('Failed to load batches:', error);
        // Could show error notification here
    } finally {
        loading.value = false;
    }
}

async function loadStatistics() {
    try {
        const response = await $server.getOrbitStats(explorerStore.id);
        
        statistics.value = response.data.statistics;
        
        // Calculate average transactions per batch
        const totalTx = Object.values(response.data.statistics.dailyStats)
            .reduce((sum, day) => sum + (day.transactionCount || 0), 0);
        const totalBatches = Object.values(response.data.statistics.dailyStats)
            .reduce((sum, day) => sum + (day.batchCount || 0), 0);
        
        statistics.value.avgTxPerBatch = totalBatches > 0 ? 
            Math.round(totalTx / totalBatches) : 0;
        statistics.value.totalBatches = totalBatches;

    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

async function refreshBatches() {
    await Promise.all([
        loadBatches(),
        loadStatistics()
    ]);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

// Watchers
watch([() => filters.status, () => filters.fromDate, () => filters.toDate], () => {
    currentPage.value = 1;
    loadBatches();
}, { deep: true });

// Lifecycle
onMounted(async () => {
    await refreshBatches();
});
</script>

<style scoped>
.orbit-batches {
    padding: 24px;
}

.font-mono {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.v-data-table >>> .v-data-table__td {
    padding: 8px 16px;
}
</style>