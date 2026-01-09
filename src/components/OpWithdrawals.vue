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

                    <template v-slot:item.l2BlockNumber="{ item }">
                        <HashLink :type="'block'" :hash="item.l2BlockNumber" />
                    </template>

                    <template v-slot:item.l2TransactionHash="{ item }">
                        <HashLink :type="'tx'" :hash="item.l2TransactionHash" />
                    </template>

                    <template v-slot:item.sender="{ item }">
                        <HashLink :type="'address'" :hash="item.sender" :withTokenName="true" />
                    </template>

                    <template v-slot:item.target="{ item }">
                        <HashLink :type="'address'" :hash="item.target" :withTokenName="true" />
                    </template>

                    <template v-slot:item.value="{ item }">
                        {{ $fromWei(item.value, 18) }} {{ explorer.token || 'ETH' }}
                    </template>

                    <template v-slot:item.status="{ item }">
                        <v-chip :color="statusColors[item.status]">
                            {{ statusLabels[item.status] }}
                        </v-chip>
                    </template>

                    <template v-slot:item.withdrawalHash="{ item }">
                        <span class="text-truncate" style="max-width: 120px; display: inline-block;">
                            {{ item.withdrawalHash ? `${item.withdrawalHash.slice(0, 10)}...${item.withdrawalHash.slice(-6)}` : '-' }}
                        </span>
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
import { useExplorerStore } from '@/stores/explorer';

const loading = ref(false);
const total = ref(0);
const withdrawals = ref([]);

const $server = inject('$server');
const $fromWei = inject('$fromWei');

const explorer = useExplorerStore();

const currentOptions = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'l2BlockNumber', order: 'desc' }]
});

const headers = [
    { title: 'L2 Block', key: 'l2BlockNumber', sortable: true },
    { title: 'L2 Transaction', key: 'l2TransactionHash', sortable: false },
    { title: 'Sender', key: 'sender', sortable: false },
    { title: 'Target', key: 'target', sortable: false },
    { title: 'Value', key: 'value', sortable: false },
    { title: 'Status', key: 'status', sortable: false },
    { title: 'Withdrawal Hash', key: 'withdrawalHash', sortable: false }
];

const statusColors = {
    initiated: 'info',
    proven: 'warning',
    finalized: 'success'
};

const statusLabels = {
    initiated: 'Initiated',
    proven: 'Proven',
    finalized: 'Finalized'
};

async function loadWithdrawals({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOpWithdrawals({
        page,
        itemsPerPage,
        order: sortBy[0]?.order?.toUpperCase() || 'DESC'
    }).then(({ data }) => {
        withdrawals.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
