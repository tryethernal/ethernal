<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">Deposits (L1 -> L2)</h2>
        <v-divider class="my-4"></v-divider>

        <v-card>
            <v-card-text>
                <v-data-table-server
                    :loading="loading"
                    :items="deposits"
                    :items-length="total"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    items-per-page-text="Deposits per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    :headers="headers"
                    @update:options="loadDeposits">

                    <template v-slot:item.l1Block="{ item }">
                        <a class="text-decoration-none" :href="`${currentWorkspace.orbitConfig.parentChainExplorer}/block/${item.l1Block}`" target="_blank">
                            {{ item.l1Block.toLocaleString() }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:item.messageIndex="{ item }">
                        {{ item.messageIndex.toLocaleString() }}
                    </template>

                    <template v-slot:item.l2TransactionHash="{ item }">
                        <HashLink v-if="item.l2TransactionHash" :type="'tx'" :hash="item.l2TransactionHash" />
                        <span v-else>N/A</span>
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
                        <a class="text-decoration-none" :href="`${currentWorkspace.orbitConfig.parentChainExplorer}/tx/${item.l1TransactionHash}`" target="_blank">
                            {{ item.l1TransactionHash.slice(0, 8) }}...{{ item.l1TransactionHash.slice(-4) }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:no-data>
                        <div class="text-center pa-4">
                            No deposits found
                        </div>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, reactive, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useExplorerStore } from '@/stores/explorer';

// Reactive data
const loading = ref(false);
const total = ref(0);
const deposits = ref([]);

const $server = inject('$server');
const $dt = inject('$dt');
const $fromWei = inject('$fromWei');

const currentWorkspace = useCurrentWorkspaceStore();
const explorer = useExplorerStore();

const currentOptions = reactive({ 
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'messageNumber', order: 'desc' }]
});

// Table configuration
const headers = [
    { title: 'L1 Block', key: 'l1Block', sortable: true },
    { title: 'Message #', key: 'messageIndex', sortable: true },
    { title: 'L2 Transaction', key: 'l2TransactionHash', sortable: false },
    { title: 'Timestamp', key: 'timestamp', sortable: false },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'L1 Transaction', key: 'l1TransactionHash', sortable: false }
];

const statusColors = {
    pending: 'warning',
    confirmed: 'success',
    failed: 'error'
};

const statusLabels = {
    pending: 'Pending',
    confirmed: 'Relayed',
    failed: 'Failed'
};

// Methods
async function loadDeposits({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOrbitDeposits({
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order
    }).then(({ data }) => {
        deposits.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
