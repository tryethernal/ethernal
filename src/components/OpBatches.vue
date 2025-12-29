<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">Transaction Batches</h2>
        <v-divider class="my-4"></v-divider>

        <v-card>
            <v-card-text>
                <v-data-table-server
                    :loading="loading"
                    :items="batches"
                    :items-length="total"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    items-per-page-text="Batches per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    :headers="headers"
                    @update:options="loadBatches">

                    <template v-slot:item.batchIndex="{ item }">
                        <router-link :to="{ name: 'opBatchDetail', params: { batchIndex: item.batchIndex } }" class="text-decoration-none">
                            #{{ item.batchIndex.toLocaleString() }}
                        </router-link>
                    </template>

                    <template v-slot:item.l1BlockNumber="{ item }">
                        {{ item.l1BlockNumber.toLocaleString() }}
                    </template>

                    <template v-slot:item.l2BlockRange="{ item }">
                        <span v-if="item.l2BlockStart != null && item.l2BlockEnd != null">
                            {{ item.l2BlockStart.toLocaleString() }} - {{ item.l2BlockEnd.toLocaleString() }}
                        </span>
                        <span v-else class="text-medium-emphasis">Pending</span>
                    </template>

                    <template v-slot:item.txCount="{ item }">
                        {{ item.txCount !== null ? item.txCount.toLocaleString() : '-' }}
                    </template>

                    <template v-slot:item.timestamp="{ item }">
                        <div class="my-2 text-left">
                            {{ $dt.shortDate(item.timestamp) }}<br>
                            <small>{{ $dt.fromNow(item.timestamp) }}</small>
                        </div>
                    </template>

                    <template v-slot:item.status="{ item }">
                        <v-chip :color="statusColors[item.status]">
                            {{ statusLabels[item.status] }}
                        </v-chip>
                    </template>

                    <template v-slot:item.l1TransactionHash="{ item }">
                        <span class="text-truncate" style="max-width: 120px; display: inline-block;">
                            {{ item.l1TransactionHash.slice(0, 10) }}...{{ item.l1TransactionHash.slice(-6) }}
                        </span>
                    </template>

                    <template v-slot:no-data>
                        <div class="text-center pa-4">
                            No batches found
                        </div>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, reactive, inject } from 'vue';

const loading = ref(false);
const total = ref(0);
const batches = ref([]);

const $server = inject('$server');
const $dt = inject('$dt');

const currentOptions = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'batchIndex', order: 'desc' }]
});

const headers = [
    { title: 'Batch #', key: 'batchIndex', sortable: true },
    { title: 'L1 Block', key: 'l1BlockNumber', sortable: false },
    { title: 'L2 Block Range', key: 'l2BlockRange', sortable: false },
    { title: 'Tx Count', key: 'txCount', sortable: false },
    { title: 'Timestamp', key: 'timestamp', sortable: false },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'L1 Transaction', key: 'l1TransactionHash', sortable: false }
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

async function loadBatches({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOpBatches({
        page,
        itemsPerPage,
        order: sortBy[0].order.toUpperCase()
    }).then(({ data }) => {
        batches.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
