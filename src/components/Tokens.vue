<template>
    <v-container fluid>
        <div class="d-flex align-center mb-4">
            <h2 class="text-h6 font-weight-medium flex-grow-1">All ERC-20 Tokens</h2>
        </div>
        <v-divider class="my-4"></v-divider>
        <v-card>
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :loading="loading"
                    :items="tokens"
                    :items-length="tokenCount"
                    :headers="headers"
                    :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
                    :must-sort="true"
                    items-per-page-text="Rows per page:"
                    no-data-text="No ERC-20 tokens found"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    item-key="address"
                    @update:options="getTokens">
                    <template v-slot:item.address="{ item }">
                        <Hash-Link :type="'token'" :hash="item.address" :contract="item" />
                    </template>
                    <template v-slot:item.tokenName="{ item }">
                        {{ item.tokenName }}
                    </template>
                    <template v-slot:item.tokenSymbol="{ item }">
                        {{ item.tokenSymbol }}
                    </template>
                    <template v-slot:item.tags="{ item }">
                        <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" size="x-small" color="success" class="mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';
import { formatContractPattern } from '@/lib/utils';

const $server = inject('$server');
const $pusher = inject('$pusher');

const loading = ref(true);
const tokens = ref([]);
const tokenCount = ref(0);

const headers = [
    {
        title: 'Address',
        key: 'address'
    },
    {
        title: 'Name',
        key: 'tokenName'
    },
    {
        title: 'Symbol',
        key: 'tokenSymbol'
    },
    {
        title: '',
        key: 'tags',
        sortable: false
    }
];

const currentOptions = ref({
    page: 1,
    itemsPerPage: 10,
    orderBy: 'timestamp',
    order: 'desc',
    pattern: 'erc20'
});

let newTokenPusherHandler = null;
let destroyedContractPusherHandler = null;

const getTokens = ({ page, itemsPerPage, sortBy } = {}) => {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        loading.value = false;
        return;
    }

    if (currentOptions.value.page === page &&
        currentOptions.value.itemsPerPage === itemsPerPage &&
        currentOptions.value.sortBy === sortBy[0].key &&
        currentOptions.value.sort === sortBy[0].order) {
        loading.value = false;
        return;
    }

    currentOptions.value = {
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order,
        pattern: 'erc20'
    };

    $server.getContracts(currentOptions.value)
        .then(({ data }) => {
            tokens.value = data.items;
            tokenCount.value = data.items.length === currentOptions.value.itemsPerPage ?
                (currentOptions.value.page * data.items.length) + 1 :
                currentOptions.value.page * data.items.length;
        })
        .catch(console.log)
        .finally(() => loading.value = false);
};

onMounted(() => {
    newTokenPusherHandler = $pusher.onNewToken(() => getTokens(currentOptions.value));
    destroyedContractPusherHandler = $pusher.onDestroyedContract(() => getTokens(currentOptions.value));
});

onUnmounted(() => {
    if (newTokenPusherHandler) {
        newTokenPusherHandler();
    }
    if (destroyedContractPusherHandler) {
        destroyedContractPusherHandler.unbind(null, null);
    }
});
</script>
