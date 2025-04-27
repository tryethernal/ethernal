<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Token Transfers (ERC-20)</h2>
        <v-divider class="my-4"></v-divider>
        <v-card>
            <v-card-text>
                <TokenTransfers
                    :transfers="transfers"
                    :withCount="false"
                    noDataText="No ERC-20 token transfers found."
                    :headers="headers"
                    :loading="loading"
                    :count="count"
                    @update:options="fetchTransfers"
                />
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, inject, shallowRef } from 'vue';
import TokenTransfers from './TokenTransfers.vue';

// Inject server instance
const $server = inject('$server');

// Reactive state
const transfers = ref([]);
const loading = ref(false);
const count = ref(0);

// Define table headers
const headers = shallowRef([
    { title: 'Tx Hash', key: 'transactionHash', sortable: false },
    { title: 'Method', key: 'methodDetails', sortable: false },
    { title: 'Age', key: 'timestamp'},
    { title: 'Block', key: 'blockNumber' },
    { title: 'From', key: 'src', sortable: false },
    { title: 'To', key: 'dst', sortable: false },
    { title: 'Amount', key: 'amount' },
    { title: 'Token', key: 'token', sortable: false }
]);

// Fetch transfers method
const fetchTransfers = (options) => {
    loading.value = true;

    const params = {
        page: options.page,
        limit: options.itemsPerPage,
        orderBy: options.sortBy[0].key,
        order: options.sortBy[0].order,
        tokenTypes: ['erc20']
    };

    $server.getWorkspaceTokenTransfers(params)
        .then(({ data }) => {
            transfers.value = data.items;
            count.value = data.items.length == options.itemsPerPage ?
                (options.page * options.itemsPerPage) + 1 :
                options.page * options.itemsPerPage;
        })
        .catch(error => {
            console.error('Error fetching token transfers:', error);
        })
        .finally(() => {
            loading.value = false;
        });
};
</script> 