<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">Withdrawals (L2 -> L1)</h2>
        <v-divider class="my-4"></v-divider>

        <v-card>
            <v-card-text>
                <v-data-table-server
                    :loading="loading"
                    :items="withdrawals"
                    :items-length="total"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    items-per-page-text="Withdrawals per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    :headers="headers"
                    @update:options="loadWithdrawals">

                    <template v-slot:item.messageNumber="{ item }">
                        {{ item.messageNumber.toLocaleString() }}
                    </template>

                    <template v-slot:item.from="{ item }">
                        <HashLink :type="'address'" :hash="item.from" />
                    </template>

                    <template v-slot:item.l2Transaction="{ item }">
                        <HashLink :type="'tx'" :hash="item.l2TransactionHash" />
                    </template>

                    <template v-slot:item.timestamp="{ item }">
                        <div class="my-2 text-left">
                            {{ $dt.shortDate(item.timestamp) }}<br>
                            <small>{{ $dt.fromNow(item.timestamp) }}</small>
                        </div>
                    </template>

                    <template v-slot:item.token="{ item }">
                        {{ $fromWei(item.amount, item.tokenDecimals || 18, item.tokenSymbol || explorer.token, false, 4) }}
                        <a v-if="item.l1TokenAddress" :href="`${currentWorkspace.orbitConfig.parentChainExplorer}/token/${item.l1TokenAddress}`" target="_blank">
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:item.status="{ item }">
                        <router-link class="text-decoration-none" v-if="item.status == 'ready'" :to="`/messagerelayer?search=${item.l2TransactionHash}`">Ready for relay</router-link>
                        <v-chip v-else :color="item.status === 'waiting' ? 'warning' : item.status === 'relayed' ? 'success' : 'error'">
                            {{ item.status }}
                        </v-chip>
                    </template>

                    <template v-slot:item.l1Transaction="{ item }">
                        <a class="text-decoration-none" v-if="item.l1TransactionHash" :href="`${currentWorkspace.orbitConfig.parentChainExplorer}/tx/${item.l1TransactionHash}`" target="_blank">
                            {{ item.l1TransactionHash.slice(0, 8) }}...{{ item.l1TransactionHash.slice(-4) }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                        <span v-else>N/A</span>
                    </template>

                    <template v-slot:no-data>
                        <div class="text-center pa-4">
                            No withdrawals found
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
const withdrawals = ref([]);

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
    { title: 'Message #', key: 'messageNumber', sortable: true },
    { title: 'From', key: 'from', sortable: false },
    { title: 'L2 transaction', key: 'l2Transaction', sortable: false },
    { title: 'Timestamp', key: 'timestamp', sortable: false },
    { title: 'Token', key: 'token', sortable: false },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'L1 transaction', key: 'l1Transaction', sortable: false }
];

// Methods
async function loadWithdrawals({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOrbitWithdrawals({
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order
    }).then(({ data }) => {
        withdrawals.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
