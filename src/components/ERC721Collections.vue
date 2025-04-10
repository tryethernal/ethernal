<template>
    <v-container fluid>
        <div class="d-flex align-center mb-4">
            <h2 class="text-h6 font-weight-medium flex-grow-1">All NFT Collections</h2>
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
                    :sort-desc="true"
                    items-per-page-text="Rows per page:"
                    no-data-text="No ERC-721 collections found"
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
                        <Hash-Link :type="'nft'" :hash="item.address" :contract="item" />
                    </template>
                    <template v-slot:item.tokenName="{ item }">
                        {{ item.tokenName }}
                    </template>
                    <template v-slot:item.tokenSymbol="{ item }">
                        {{ item.tokenSymbol }}
                    </template>
                    <template v-slot:item.tokenTotalSupply="{ item }">
                        {{ item.tokenTotalSupply ? parseInt(item.tokenTotalSupply).toLocaleString() : 'N/A' }}
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
import { ref, onMounted, onUnmounted } from 'vue';
import HashLink from '@/components/HashLink.vue';
import { formatContractPattern } from '@/lib/utils';
import { inject } from 'vue';

// Inject dependencies
const $pusher = inject('$pusher');
const $server = inject('$server');

// Reactive state
const loading = ref(true);
const tokens = ref([]);
const tokenCount = ref(0);
const currentOptions = ref({ 
    page: 1, 
    itemsPerPage: 10, 
    orderBy: 'timestamp', 
    order: 'desc', 
    pattern: 'erc721' 
});

// Table headers
const headers = [
    { title: 'Address', key: 'address' },
    { title: 'Name', key: 'tokenName' },
    { title: 'Symbol', key: 'tokenSymbol' },
    { title: 'Total Supply', key: 'tokenTotalSupply' },
    { title: '', key: 'tags', sortable: false }
];

// Methods
const getTokens = async ({ page, itemsPerPage, sortBy } = {}) => {
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

    const options = {
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order,
        pattern: 'erc721'
    };

    try {
        const { data } = await $server.getContracts(options);
        tokens.value = data.items;
        tokenCount.value = data.items.length === currentOptions.value.itemsPerPage
            ? (currentOptions.value.page * data.items.length) + 1
            : currentOptions.value.page * data.items.length;
    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
};

// Lifecycle hooks
let newNftPusherHandler = null;
let destroyedContractPusherHandler = null;

onMounted(() => {
    newNftPusherHandler = $pusher.onNewNft(() => getTokens(currentOptions.value));
    destroyedContractPusherHandler = $pusher.onDestroyedContract(() => getTokens(currentOptions.value));
});

onUnmounted(() => {
    if (newNftPusherHandler) {
        newNftPusherHandler();
    }
    if (destroyedContractPusherHandler) {
        destroyedContractPusherHandler.unbind(null, null);
    }
});
</script>
