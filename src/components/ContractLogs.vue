<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="logs"
        :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
        :must-sort="true"
        :sort-desc="true"
        :headers="headers"
        no-data-text="No logs available"
        items-per-page-text="Rows per page:"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        item-key="id"
        @update:options="getContractLogs">
        <template v-slot:loading>
            <div class="d-flex justify-center align-center pa-4">
                <v-progress-circular
                    size="24"
                    width="3"
                    indeterminate
                    color="primary"
                    class="mr-3"
                ></v-progress-circular>
                Loading contract logs...
            </div>
        </template>
        <template v-slot:item.log="{ item }">
            <Transaction-Event :log="item" :self="true" :short="true" />
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.receipt.transaction.timestamp) }}<br>
                <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.receipt.transaction.timestamp) }}</small>
            </div>
        </template>
        <template v-slot:item.transactionHash="{ item }">
            <Hash-Link :type="'transaction'" :hash="item.receipt.transactionHash" />
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link class="text-decoration-none" :to="'/block/' + item.receipt.blockNumber">{{ item.receipt.blockNumber }}</router-link>
        </template>
    </v-data-table-server>
</template>

<script setup>
import { ref, watch, onUnmounted, inject, onMounted } from 'vue';
import HashLink from './HashLink.vue';
import TransactionEvent from './TransactionEvent.vue';

const props = defineProps({
    address: {
        type: String,
        required: true
    }
});

const loading = ref(true);
const logs = ref([]);
const pusherChannelHandler = ref(null);
const headers = [
    { title: 'Method', key: 'log', sortable: false, 'max-width': '300' },
    { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
    { title: 'Block', key: 'blockNumber' },
    { title: 'Emitted On', key: 'timestamp' }
];

const $server = inject('$server');
const $pusher = inject('$pusher');
const $dt = inject('$dt');

const currentOptions = ref({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'blockNumber', order: 'desc' }]
});

const getContractLogs = ({ page, itemsPerPage, sortBy } = {}) => {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        loading.value = false;
        return;
    }

    currentOptions.value = {
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order
    };

    $server.getContractLogs(props.address, currentOptions.value)
        .then(({ data }) => logs.value = data.items)
        .catch((error) => console.log(error))
        .finally(() => loading.value = false);
};

watch(() => props.address, () => {
    if (currentOptions.value) {
        getContractLogs(currentOptions.value);
    }
});

onMounted(() => {
    pusherChannelHandler.value = $pusher.onNewContractLog(
        () => getContractLogs(currentOptions.value),
        props.address
    );
});

onUnmounted(() => {
    if (pusherChannelHandler.value) {
        pusherChannelHandler.value();
    }
});
</script>
