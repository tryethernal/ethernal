<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Top Accounts by {{ explorerStore.token }} Balance</h2>
        <v-divider class="my-4"></v-divider>
        <v-card class="mt-4">
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :dense="dense"
                    :loading="loading"
                    :items="accounts"
                    :items-length="accountCount"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    :headers="headers"
                    :hide-default-footer="dense"
                    :hide-default-header="dense"
                    no-data-text="No accounts indexed yet"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    item-key="address"
                    @update:options="getAccounts">
                    <template #item.address="{ item }">
                        <Hash-Link :contract="item.contract" :fullHash="true" :type="'address'" :hash="item.address" />
                    </template>
                    <template #item.balance="{ item }">
                        {{ fromWei(item.balance, 18, explorerStore.token) }}
                    </template>
                    <template #item.share="{ item }">
                        {{ (item.share * 100).toFixed(2) }}%
                    </template>
                    <template #item.transaction_count="{ item }">
                        {{ item.transaction_count }}
                    </template>
                    <template v-slot:loading>
                        <div class="d-flex justify-center align-center pa-4">
                            <v-progress-circular
                                size="24"
                                width="2"
                                indeterminate
                                color="primary"
                                class="mr-3"
                            ></v-progress-circular>
                            Loading balances...
                        </div>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
import { useExplorerStore } from '../stores/explorer';
import HashLink from './HashLink.vue';
import fromWei from '../filters/FromWei';

const $server = inject('$server');

const explorerStore = useExplorerStore();

const dense = ref(false);
const accounts = ref([]);
const accountCount = ref(0);
const loading = ref(false);
const currentOptions = ref({ page: 1, itemsPerPage: 10, orderBy: 'address', order: 'desc' });
const headers = ref([
    { title: 'Address', key: 'address', sortable: false },
    { title: 'Balance', key: 'balance', sortable: false },
    { title: 'Percentage', key: 'share', sortable: false },
    { title: 'Transaction Count', key: 'transaction_count', sortable: false }
]);


function getAccounts({ page, itemsPerPage, sortBy } = {}) {
    if (loading.value)
        return;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;
    
    currentOptions.value = { page, itemsPerPage, sortBy };

    $server.getWorkspaceFilteredNativeAccounts({ page, itemsPerPage })
        .then(({ data }) => {
            if (data.total)
                accountCount.value = data.total;
            else
                accountCount.value = data.items.length == currentOptions.value.itemsPerPage ?
                    (currentOptions.value.page * data.items.length) + 1 :
                    currentOptions.value.page * data.items.length;

            accounts.value = data.items;
        })
        .catch(console.log)
        .finally(() => loading.value = false);
}

onMounted(() => {
    currentOptions.value.sortBy = [{ key: 'balance', order: 'desc' }];
});
</script>
