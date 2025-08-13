<template>
    <div class="orbit-batches">
        <div class="d-flex justify-space-between align-center mb-6">
            <div>
                <h1 class="text-h4 mb-2">Orbit Batches</h1>
                <p class="text-body-1 text-medium-emphasis">
                    Batches posted to {{ parentChainName }} for {{ workspaceName }}
                </p>
            </div>
        </div>

        <!-- Batches Table -->
        <v-card>
            <v-data-table
                :headers="headers"
                :items="batches"
                :loading="loading"
                :server-items-length="total"
                v-model:page="currentOptions.page"
                v-model:items-per-page="currentOptions.itemsPerPage"
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
                        #{{ item.batchSequenceNumber }}
                    </router-link>
                </template>

                <template v-slot:item.status="{ item }">
                    {{ item.confirmationStatus }}
                </template>

                <template v-slot:item.transactionCount="{ item }">
                    <span class="font-weight-medium">
                        {{ item.transactionCount?.toLocaleString() || '0' }}
                    </span>
                </template>

                <template v-slot:item.timing.ageFormatted="{ item }">
                    <span class="text-body-2">{{ item.postedAt }}</span>
                </template>

                <template v-slot:item.economics.l1CostEth="{ item }">
                    <span v-if="item.l1Cost" class="font-mono">
                        {{ item.l1Cost }} ETH
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
const total = ref(0);
const batches = ref([]);

const $server = inject('$server');

const currentOptions = reactive({ page: 1, itemsPerPage: 50, order: 'DESC' });

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
async function loadBatches({ page, itemsPerPage, order } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !order || !order.length) {
        page = currentOptions.page;
        itemsPerPage = currentOptions.itemsPerPage;
        order = [{ key: currentOptions.orderBy, order: currentOptions.order }];
    }

    currentOptions.page = page;
    currentOptions.itemsPerPage = itemsPerPage;
    currentOptions.orderBy = order[0].key;
    currentOptions.order = order[0].order;

    $server.getOrbitBatches(currentOptions)
        .then(response => {
            batches.value = response.data.items;
            total.value = response.data.total;
        })
        .catch(error => {
            console.error('Failed to load batches:', error);
        })
        .finally(() => {
            loading.value = false;
        });
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

// Lifecycle
onMounted(async () => {
    await loadBatches();
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