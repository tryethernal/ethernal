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
                                    <td>{{ batch.l1BlockNumber.toLocaleString() }}</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L1 Transaction</td>
                                    <td>
                                        <span class="text-truncate" style="max-width: 200px; display: inline-block; font-family: monospace;">
                                            {{ batch.l1TransactionHash }}
                                        </span>
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
                                    <td style="font-family: monospace;">{{ batch.blobHash }}</td>
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
                        <v-data-table-server
                            :loading="loadingTransactions"
                            :items="transactions"
                            :items-length="transactionTotal"
                            :sort-by="txOptions.sortBy"
                            :must-sort="true"
                            items-per-page-text="Transactions per page:"
                            last-icon=""
                            first-icon=""
                            :items-per-page-options="[
                                { value: 10, title: '10' },
                                { value: 25, title: '25' },
                                { value: 100, title: '100' }
                            ]"
                            :headers="txHeaders"
                            @update:options="loadTransactions">

                            <template v-slot:item.hash="{ item }">
                                <HashLink :type="'tx'" :hash="item.hash" />
                            </template>

                            <template v-slot:item.blockNumber="{ item }">
                                <HashLink :type="'block'" :hash="item.blockNumber" />
                            </template>

                            <template v-slot:item.from="{ item }">
                                <HashLink :type="'address'" :hash="item.from" :withTokenName="true" />
                            </template>

                            <template v-slot:item.to="{ item }">
                                <HashLink v-if="item.to" :type="'address'" :hash="item.to" :withTokenName="true" />
                                <span v-else class="text-medium-emphasis">Contract Creation</span>
                            </template>

                            <template v-slot:no-data>
                                <div class="text-center pa-4">
                                    No transactions found in this batch
                                </div>
                            </template>
                        </v-data-table-server>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';

const props = defineProps({
    batchIndex: {
        type: [String, Number],
        required: true
    }
});

const $server = inject('$server');
const $dt = inject('$dt');

const loading = ref(true);
const loadingTransactions = ref(false);
const batch = ref(null);
const transactions = ref([]);
const transactionTotal = ref(0);

const txOptions = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'blockNumber', order: 'desc' }]
});

const txHeaders = [
    { title: 'Transaction Hash', key: 'hash', sortable: false },
    { title: 'Block', key: 'blockNumber', sortable: true },
    { title: 'From', key: 'from', sortable: false },
    { title: 'To', key: 'to', sortable: false }
];

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

async function loadTransactions({ page, itemsPerPage, sortBy } = {}) {
    if (!page || !itemsPerPage || !sortBy || !sortBy.length) return;

    loadingTransactions.value = true;
    Object.assign(txOptions, { page, itemsPerPage, sortBy });

    try {
        const { data } = await $server.getOpBatchTransactions(props.batchIndex, {
            page,
            itemsPerPage,
            order: sortBy[0].order.toUpperCase()
        });
        transactions.value = data.items;
        transactionTotal.value = data.total;
    } catch (error) {
        console.error('Error loading transactions:', error);
    } finally {
        loadingTransactions.value = false;
    }
}

onMounted(() => {
    loadBatch();
});
</script>
