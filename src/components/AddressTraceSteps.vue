<template>
    <Trace-Steps-Table
        :loading="loading"
        :items="items"
        :total-items="totalItems"
        :dense="dense"
        :highlight-address="address"
        @update:options="fetchAddressTraceSteps" />
</template>

/**
 * @fileoverview Address trace steps (internal transactions) component.
 * Displays a paginated table of internal transactions for an address.
 * @component AddressTraceSteps
 *
 * @prop {string} address - The Ethereum address to show internal transactions for
 * @prop {boolean} [dense] - Whether to use dense table styling
 */
<script setup>
import { ref } from 'vue';
import { inject } from 'vue';
import TraceStepsTable from './TraceStepsTable.vue';

const props = defineProps({
    address: {
        type: String,
        required: true
    },
    dense: Boolean,
});

// State
const loading = ref(false);
const items = ref([]);
const totalItems = ref(0);

const $server = inject('$server');

const fetchAddressTraceSteps = async ({ page, itemsPerPage }) => {
    loading.value = true;
    try {
        const { data } = await $server.getAddressInternalTransactions(props.address, page, itemsPerPage);
        items.value = data.items;
        totalItems.value = items.value.length == itemsPerPage ?
            (page * itemsPerPage) + 1 :
            page * itemsPerPage;
    } catch (error) {
        console.error('Error fetching address trace steps:', error);
    } finally {
        loading.value = false;
    }
};
</script> 