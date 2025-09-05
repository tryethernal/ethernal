<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">View Batches</h2>
        <v-divider class="my-4"></v-divider>

        <v-card>
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :loading="loading"
                    :items="batches"
                    :items-length="total"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    :disable-pagination="true"
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
                    <template v-slot:[`footer.page-text`]=""></template>

                    <template v-slot:item.batchSequenceNumber="{ item }">
                        <router-link class="text-decoration-none"  :to="{ name: 'orbit-batch-detail', params: { batchNumber: item.batchSequenceNumber } }">
                            {{ item.batchSequenceNumber.toLocaleString() }}
                        </router-link>
                    </template>
	
                    <template v-slot:item.status="{ item }">
                        <v-chip :color="l1StatusColors[item.confirmationStatus]" size="small">
                            {{ l1StatusLabels[item.confirmationStatus] }}
                        </v-chip>
                    </template>

                    <template v-slot:item.parentChainBlockNumber="{ item }">
                        <a class="text-decoration-none" :href="`${currentWorkspaceStore.orbitConfig.parentChainExplorer}/block/${item.parentChainBlockNumber}`" target="_blank">
                            {{ item.parentChainBlockNumber.toLocaleString() }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:item.parentChainTxHash="{ item }">
                        <a class="text-decoration-none" :href="`${currentWorkspaceStore.orbitConfig.parentChainExplorer}/tx/${item.parentChainTxHash}`" target="_blank">
                            {{ item.parentChainTxHash.substring(0, 19) }}...
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:item.timing.ageFormatted="{ item }">
                        <div class="text-left">
                            {{ $dt.shortDate(item.postedAt) }}<br>
                            <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.postedAt) }}</small>
                        </div>
                    </template>

                    <template v-slot:item.transactionCount="{ item }">
                        <span class="font-weight-medium">
                            {{ item.transactionCount?.toLocaleString() || '0' }}
                        </span>
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
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, reactive, inject } from 'vue';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive data
const loading = ref(false);
const total = ref(0);
const batches = ref([]);

const $server = inject('$server');
const $dt = inject('$dt');

const currentOptions = reactive({ 
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'batchSequenceNumber', order: 'desc' }]
});

// Table configuration
const headers = [
    { title: 'Index', key: 'batchSequenceNumber', sortable: true },
    { title: 'L1 Status', key: 'status', sortable: false },
    { title: 'L1 Block', key: 'parentChainBlockNumber', sortable: false },
    { title: 'L1 Txn Hash', key: 'parentChainTxHash', sortable: false },
    { title: 'Age', key: 'timing.ageFormatted', sortable: false },
    { title: 'Txn', key: 'transactionCount', sortable: false }
];

const l1StatusColors = {
    pending: 'warning',
    challenged: 'error',
    confirmed: 'success',
};

const l1StatusLabels = {
    pending: 'Unfinalized',
    challenged: 'Challenged',
    confirmed: 'Finalized'
};

// Methods
async function loadBatches({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOrbitBatches({
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order
    }).then(({ data }) => {
        batches.value = data.items;
        total.value = data.total
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
