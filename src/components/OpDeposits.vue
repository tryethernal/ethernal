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

                    <template v-slot:item.l1BlockNumber="{ item }">
                        {{ item.l1BlockNumber.toLocaleString() }}
                    </template>

                    <template v-slot:item.l2TransactionHash="{ item }">
                        <HashLink v-if="item.l2TransactionHash" :type="'tx'" :hash="item.l2TransactionHash" />
                        <span v-else class="text-medium-emphasis">Pending</span>
                    </template>

                    <template v-slot:item.from="{ item }">
                        <HashLink :type="'address'" :hash="item.from" :withTokenName="true" />
                    </template>

                    <template v-slot:item.to="{ item }">
                        <HashLink :type="'address'" :hash="item.to" :withTokenName="true" />
                    </template>

                    <template v-slot:item.value="{ item }">
                        {{ $fromWei(item.value, 18) }} {{ explorer.token || 'ETH' }}
                    </template>

                    <template v-slot:item.status="{ item }">
                        <v-chip :color="statusColors[item.status]">
                            {{ statusLabels[item.status] }}
                        </v-chip>
                    </template>

                    <template v-slot:item.l1TransactionHash="{ item }">
                        <span class="text-truncate" style="max-width: 120px; display: inline-block;">
                            {{ item.l1TransactionHash ? `${item.l1TransactionHash.slice(0, 10)}...${item.l1TransactionHash.slice(-6)}` : '-' }}
                        </span>
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
import { useExplorerStore } from '@/stores/explorer';

const loading = ref(false);
const total = ref(0);
const deposits = ref([]);

const $server = inject('$server');
const $fromWei = inject('$fromWei');

const explorer = useExplorerStore();

const currentOptions = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'l1BlockNumber', order: 'desc' }]
});

const headers = [
    { title: 'L1 Block', key: 'l1BlockNumber', sortable: true },
    { title: 'L2 Transaction', key: 'l2TransactionHash', sortable: false },
    { title: 'From', key: 'from', sortable: false },
    { title: 'To', key: 'to', sortable: false },
    { title: 'Value', key: 'value', sortable: false },
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
    confirmed: 'Confirmed',
    failed: 'Failed'
};

async function loadDeposits({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOpDeposits({
        page,
        itemsPerPage,
        order: sortBy[0].order.toUpperCase()
    }).then(({ data }) => {
        deposits.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
