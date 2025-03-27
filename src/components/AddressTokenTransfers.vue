<template>
    <div class="d-flex justify-end mb-4">
        <v-chip-group multiple v-model="tokenTypes" @update:model-value="getTransfers">
            <v-chip color="primary" size="x-small" value="erc20">
                ERC-20
                <template v-if="erc20Count">({{ erc20Count }})</template>
            </v-chip>
            <v-chip color="primary" size="x-small" value="erc721">
                ERC-721
                <template v-if="erc721Count">({{ erc721Count }})</template>
            </v-chip>
            <v-chip color="primary" size="x-small" value="erc1155">
                ERC-1155
                <template v-if="erc1155Count">({{ erc1155Count }})</template>
            </v-chip>
        </v-chip-group>
    </div>
    <Token-Transfers
        :transfers="transfers"
        :headers="headers"
        :loading="loading"
        :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
        :count="transferCount"
        :address="address"
        @update:options="getTransfers" />
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';
import TokenTransfers from './TokenTransfers.vue';

const props = defineProps({
    address: {
        type: String,
        required: true
    },
    erc20Count: {
        type: Number,
        required: false
    },
    erc721Count: {
        type: Number,
        required: false
    },
    erc1155Count: {
        type: Number,
        required: false
    }
});

const loading = ref(true);
const transfers = ref([]);
const transferCount = ref(0);
const tokenTypes = ref([]);

const $server = inject('$server');

const headers = [
    { title: 'Type', key: 'tokenType', sortable: false },
    { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
    { title: 'Method', key: 'methodDetails', sortable: false },
    { title: 'Block', key: 'blockNumber' },
    { title: 'Mined On', key: 'timestamp' },
    { title: 'From', key: 'src' },
    { title: 'To', key: 'dst' },
    { title: 'Amount', key: 'amount', sortable: false },
    { title: 'Token', key: 'token', sortable: false }
];

const currentOptions = ref({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'blockNumber', order: 'desc' }]
});

const getTransfers = ({ page, itemsPerPage, sortBy } = {}) => {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    currentOptions.value = { page, itemsPerPage, sortBy };

    $server.getAddressTokenTransfers(props.address, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order, tokenTypes: tokenTypes.value })
        .then(({ data }) => {
            transfers.value = data.items;
            transferCount.value = data.total;
        })
        .catch(console.log)
        .finally(() => loading.value = false);
};

watch(tokenTypes, () => {
    getTransfers(currentOptions.value);
});

onMounted(() => {
    getTransfers(currentOptions.value);
});
</script>
