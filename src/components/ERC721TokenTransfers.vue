<template>
    <Token-Transfers
        :transfers="transfers"
        :headers="headers"
        :loading="loading"
        :count="transferCount"
        :address="address"
        @update:options="getTransfers"
    />
</template>

<script setup>
import { ref } from 'vue';
import { inject } from 'vue';
import TokenTransfers from './TokenTransfers.vue';

const props = defineProps({
    address: {
        type: String,
        required: true
    },
    tokenId: {
        type: String,
        default: null
    }
});

// Inject server instance
const $server = inject('$server');

// Reactive state
const loading = ref(false);
const transfers = ref([]);
const transferCount = ref(0);

// Headers configuration
const headers = [
    { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
    { title: 'Method', key: 'methodDetails', sortable: false },
    { title: 'Block', key: 'blockNumber', sortable: true },
    { title: 'Age', key: 'timestamp', sortable: true },
    { title: 'From', key: 'src', sortable: false },
    { title: 'To', key: 'dst', sortable: false },
    { title: 'Token', key: 'token', sortable: false },
    { title: 'Amount', key: 'amount', sortable: false }
];

// Methods
const getTransfers = async ({ page, itemsPerPage, sortBy } = {}) => {
    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        return;
    }

    loading.value = true;
    try {
        const { data } = await $server.getTokenTransfers(
            props.address,
            {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order
            }
        );
        
        transfers.value = data.items || [];
        transferCount.value = data.total || 0;
    } catch (error) {
        console.error('Error fetching transfers:', error);
    } finally {
        loading.value = false;
    }
};
</script>
