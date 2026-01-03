<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <h2 class="text-h6 font-weight-medium">Batch #{{ batchIndex }}</h2>
                <v-divider class="my-4"></v-divider>
            </v-col>
        </v-row>

        <v-row v-if="loading">
            <v-col cols="12" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </v-col>
        </v-row>

        <v-row v-else-if="batch">
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-title>Batch Information</v-card-title>
                    <v-card-text>
                        <v-table density="compact">
                            <tbody>
                                <tr>
                                    <td class="font-weight-medium">Batch Index</td>
                                    <td>#{{ batch.batchIndex.toLocaleString() }}</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L1 Block</td>
                                    <td>
                                        <a :href="l1BlockUrl" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                                            {{ batch.l1BlockNumber.toLocaleString() }}
                                            <v-icon size="x-small" class="ml-1">mdi-open-in-new</v-icon>
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L1 Transaction</td>
                                    <td>
                                        <a :href="l1TransactionUrl" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-truncate" style="max-width: 200px; display: inline-block; font-family: monospace;">
                                            {{ batch.l1TransactionHash }}
                                            <v-icon size="x-small" class="ml-1">mdi-open-in-new</v-icon>
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L2 Block Range</td>
                                    <td v-if="batch.l2BlockStart !== null">
                                        {{ batch.l2BlockStart.toLocaleString() }} - {{ batch.l2BlockEnd.toLocaleString() }}
                                    </td>
                                    <td v-else class="text-medium-emphasis">Pending</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Timestamp</td>
                                    <td>{{ $dt.shortDate(batch.timestamp) }} ({{ $dt.fromNow(batch.timestamp) }})</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Status</td>
                                    <td>
                                        <v-chip :color="statusColors[batch.status]">
                                            {{ statusLabels[batch.status] }}
                                        </v-chip>
                                    </td>
                                </tr>
                                <tr v-if="batch.blobHash">
                                    <td class="font-weight-medium">Blob Hash</td>
                                    <td style="font-family: monospace;">
                                        <a :href="blobViewerUrl" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                                            {{ batch.blobHash }}
                                            <v-icon size="x-small" class="ml-1">mdi-open-in-new</v-icon>
                                        </a>
                                    </td>
                                </tr>
                                <tr v-if="batch.dataContainer">
                                    <td class="font-weight-medium">Data Container</td>
                                    <td>
                                        <v-chip size="small" :color="batch.dataContainer === 'in_blob4844' ? 'primary' : 'secondary'">
                                            {{ dataContainerLabels[batch.dataContainer] }}
                                        </v-chip>
                                    </td>
                                </tr>
                                <tr v-if="batch.txCount">
                                    <td class="font-weight-medium">Transaction Count</td>
                                    <td>{{ batch.txCount.toLocaleString() }}</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row v-if="batch && batch.l2BlockStart !== null">
            <v-col cols="12">
                <v-card class="mt-4">
                    <v-card-title>Transactions in Batch</v-card-title>
                    <v-card-text>
                        <TransactionsList :opBatchIndex="parseInt(batchIndex)" :withCount="true" />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import TransactionsList from '@/components/TransactionsList.vue';

const props = defineProps({
    batchIndex: {
        type: [String, Number],
        required: true
    }
});

const $server = inject('$server');
const $dt = inject('$dt');

const loading = ref(true);
const batch = ref(null);

const blobViewerUrl = computed(() => {
    if (!batch.value?.blobHash) return '';
    const explorer = batch.value.parentChainExplorer || 'https://etherscan.io';
    return `${explorer}/blob/${batch.value.blobHash}`;
});

const l1TransactionUrl = computed(() => {
    if (!batch.value?.l1TransactionHash) return '';
    const explorer = batch.value.parentChainExplorer || 'https://etherscan.io';
    return `${explorer}/tx/${batch.value.l1TransactionHash}`;
});

const l1BlockUrl = computed(() => {
    if (!batch.value?.l1BlockNumber) return '';
    const explorer = batch.value.parentChainExplorer || 'https://etherscan.io';
    return `${explorer}/block/${batch.value.l1BlockNumber}`;
});

const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    finalized: 'success'
};

const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    finalized: 'Finalized'
};

const dataContainerLabels = {
    in_blob4844: 'EIP-4844 Blob',
    in_calldata: 'Calldata'
};

async function loadBatch() {
    loading.value = true;
    try {
        const { data } = await $server.getOpBatchDetail(props.batchIndex);
        batch.value = data;
    } catch (error) {
        console.error('Error loading batch:', error);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadBatch();
});
</script>
