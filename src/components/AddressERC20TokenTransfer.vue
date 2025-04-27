<template>
    <Token-Transfers
        :transfers="transfers"
        :headers="headers"
        :loading="loading"
        :sort-by="currentOptions.sortBy"
        :count="count"
        @pagination="getTransfers"
        @update:options="getTransfers"
    />
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
import TokenTransfers from './TokenTransfers.vue';

// Props
const props = defineProps({
    address: {
        type: String,
        required: true
    },
    count: Number
});

// Inject server instance
const $server = inject('$server');

// Reactive state
const loading = ref(true);
const transfers = ref([]);
const currentOptions = ref({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'blockNumber', order: 'desc' }]
});

// Table headers
const headers = [
    { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
    { title: 'Method', key: 'methodDetails', sortable: false },
    { title: 'Block', key: 'blockNumber' },
    { title: 'Mined On', key: 'timestamp' },
    { title: 'From', key: 'src' },
    { title: 'To', key: 'dst' },
    { title: 'Amount', key: 'amount' }
];

// Methods
const getTransfers = ({ page, itemsPerPage, sortBy } = currentOptions.value) => {
    loading.value = true;

    $server.getTokenTransfers(props.address, {
        page: page || currentOptions.value.page,
        itemsPerPage: itemsPerPage || currentOptions.value.itemsPerPage,
        orderBy: sortBy?.[0]?.key || currentOptions.value.sortBy[0].key,
        order: sortBy?.[0]?.order || currentOptions.value.sortBy[0].order
    })
    .then(({ data }) => {
        transfers.value = data.items;

        // Update current options
        currentOptions.value = {
            page: page || currentOptions.value.page,
            itemsPerPage: itemsPerPage || currentOptions.value.itemsPerPage,
            sortBy: sortBy || currentOptions.value.sortBy
        };
    })
    .catch(error => console.error('Error fetching token transfers:', error))
    .finally(() => loading.value = false);
};

// Initialize data on mount
onMounted(() => {
    getTransfers();
});
</script>
