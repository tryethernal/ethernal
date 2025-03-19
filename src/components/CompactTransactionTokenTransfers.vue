<template>
    <v-container fluid :class="{ 'pa-0': embedded }">
        <Compact-Token-Transfers
            :transfers="displayedTransfers"
            :loading="loading"
            :sortBy="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
            :count="transferCount"
            :headers="headers"
            :address="address"
            :embedded="embedded"
            :showAll="showAll"
            :itemsPerPage="maxEmbeddedItems"
            @pagination="onPagination"
            @update:options="getTransfers"
            @view-all="$emit('view-all')"
            @refresh="refreshTransfers" />
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import CompactTokenTransfers from './CompactTokenTransfers.vue';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { inject } from 'vue';

// Props
const props = defineProps({
    hash: {
        type: String,
        required: true
    },
    tokenDecimals: [Number, String],
    tokenSymbol: String,
    address: {
        type: String,
        required: false
    },
    withTokenData: {
        type: Boolean,
        default: false
    },
    embedded: {
        type: Boolean,
        default: false
    },
    showAll: {
        type: Boolean,
        default: false
    }
});

// Emits
const emit = defineEmits(['view-all']);

// Inject server
const $server = inject('$server');

// Store
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const loading = ref(false);
const transfers = ref([]);
const transaction = ref(null);
const maxEmbeddedItems = ref(5);
const currentPage = ref(1);
const transferCount = ref(0);
const currentOptions = ref({
    page: 1,
    itemsPerPage: 5,
    sortBy: [],
    orderBy: 'src',
    order: 'desc'
});

// Data table headers
const headers = [
    { title: 'Transaction', key: 'transactionHash', sortable: false },
    { title: 'Method', key: 'method', sortable: false },
    { title: 'Block', key: 'blockNumber' },
    { title: 'Mined On', key: 'timestamp' },
    { title: 'From', key: 'src' },
    { title: 'To', key: 'dst' },
    { title: 'Amount', key: 'amount', sortable: false },
    { title: 'Token', key: 'token', sortable: false }
];

// Computed properties
const displayedTransfers = computed(() => transfers.value);

// Methods
function onPagination(options) {
    if (currentPage.value === options.page) return;
    
    currentPage.value = options.page;
    
    // Clear cache for this specific page to force a refresh
    const sortByKey = currentOptions.value.orderBy + '-' + currentOptions.value.order;
    const cacheKey = `${props.hash}-${options.page}-${options.itemsPerPage || maxEmbeddedItems.value}-${sortByKey}`;
    transfersCache.delete(cacheKey);
    
    // Pass the new page explicitly in the options
    getTransfers({
        page: options.page,
        itemsPerPage: options.itemsPerPage || maxEmbeddedItems.value,
        sortBy: options.sortBy || [{ key: currentOptions.value.orderBy, order: currentOptions.value.order }]
    });
}

// Optimized data fetching with caching
const transfersCache = new Map();
const pendingRequests = new Map();

async function getTransfers({ page, itemsPerPage, sortBy } = {}) {
    if (!props.hash) return;
    
    // Set options to current values if not provided
    page = page || 1;
    // Always use the configured itemsPerPage, don't force it to 1
    itemsPerPage = itemsPerPage || maxEmbeddedItems.value;
    sortBy = sortBy || [{ key: currentOptions.value.orderBy, order: currentOptions.value.order }];
    
    // Generate a cache key based on the request parameters
    const sortByKey = sortBy[0] ? `${sortBy[0].key}-${sortBy[0].order}` : 'default';
    const cacheKey = `${props.hash}-${page}-${itemsPerPage}-${sortByKey}`;
    
    // For debugging
    console.log(`Fetching token transfers: Page ${page}, Items per page: ${itemsPerPage}, Max items: ${maxEmbeddedItems.value}, Total: ${transferCount.value}`);
    
    // Check if we already have this data cached
    if (transfersCache.has(cacheKey)) {
        const cachedData = transfersCache.get(cacheKey);
        transfers.value = cachedData.items;
        transferCount.value = cachedData.total;
        return;
    }
    
    // Check if we already have a pending request for this data
    if (pendingRequests.has(cacheKey)) {
        // Wait for the existing request to complete
        await pendingRequests.get(cacheKey);
        return;
    }
    
    // Update options early to prevent duplicate requests
    currentOptions.value = {
        page: page,
        itemsPerPage: itemsPerPage,
        orderBy: sortBy[0]?.key || 'blockNumber',
        order: sortBy[0]?.order || 'desc'
    };
    
    loading.value = true;
    
    // Create a promise that will resolve when the request completes
    const requestPromise = new Promise(async (resolve) => {
        try {
            // Only fetch transaction data if we don't have it yet
            let txData = transaction.value;
            if (!txData || txData.hash !== props.hash) {
                const txResponse = await $server.getTransaction(props.hash);
                txData = txResponse.data;
                transaction.value = txData;
            }
            
            // Use current options to ensure consistency
            const transfersResponse = await $server.getTransactionTokenTransfers(
                props.hash,
                {
                    page: currentOptions.value.page, 
                    itemsPerPage: currentOptions.value.itemsPerPage,
                    orderBy: currentOptions.value.orderBy,
                    order: currentOptions.value.order
                }
            );
            
            // Update cached data
            transfersCache.set(cacheKey, {
                items: transfersResponse.data.items,
                total: transfersResponse.data.total
            });
            
            // Update component state
            transfers.value = transfersResponse.data.items;
            transferCount.value = transfersResponse.data.total;
        } catch (error) {
            console.error('Error fetching transfers:', error);
        } finally {
            loading.value = false;
            pendingRequests.delete(cacheKey);
            resolve();
        }
    });
    
    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise);
    
    // Wait for the request to complete
    await requestPromise;
}

// Request clean up on unmount
function clearCache() {
    transfersCache.clear();
    pendingRequests.clear();
}

// Watch for hash changes
watch(() => props.hash, (newHash, oldHash) => {
    if (newHash && newHash !== oldHash) {
        currentPage.value = 1;
        // Clear previous data before fetching new data
        transfers.value = [];
        transferCount.value = 0;
        
        getTransfers({
            page: 1,
            itemsPerPage: maxEmbeddedItems.value,
            sortBy: [{ key: currentOptions.value.orderBy, order: currentOptions.value.order }]
        });
    }
}, { immediate: true });

// Fetch transfers on mount
onMounted(() => {
    if (props.hash) {
        getTransfers({
            page: 1,
            itemsPerPage: maxEmbeddedItems.value,
            sortBy: [{ key: currentOptions.value.orderBy, order: currentOptions.value.order }]
        });
    }
});

// Clear caches on unmount to prevent memory leaks
onUnmounted(() => {
    clearCache();
});

// Add refresh method
function refreshTransfers() {
    console.log('Refreshing transfers');
    // Clear all caches
    transfersCache.clear();
    // Reset to page 1
    currentPage.value = 1;
    // Fetch new data
    getTransfers({
        page: 1,
        itemsPerPage: maxEmbeddedItems.value,
        sortBy: [{ key: currentOptions.value.orderBy, order: currentOptions.value.order }]
    });
}
</script> 