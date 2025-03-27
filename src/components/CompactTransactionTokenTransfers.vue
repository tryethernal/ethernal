<template>
    <v-container fluid class="pa-0">
        <Compact-Token-Transfers
            :transfers="displayedTransfers"
            :loading="loading"
            :sortBy="sortBy"
            :count="totalTransfers"
            :headers="headers"
            :address="address"
            :showAll="showAll"
            :itemsPerPage="maxEmbeddedItems"
            @pagination="onPagination"
            @update:options="onUpdateOptions"
            @view-all="$emit('view-all')"
            @refresh="refreshTransfers" />
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import CompactTokenTransfers from './CompactTokenTransfers.vue';
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
    showAll: {
        type: Boolean,
        default: false
    },
    totalTransfers: {
        type: Number,
        required: true
    }
});

// Emits
const emit = defineEmits(['view-all']);

// Inject server
const $server = inject('$server');

// Cache mechanism
const transfersCache = ref(new Map());

// Helper function to generate cache key
function getCacheKey(hash, page, itemsPerPage, orderBy, order) {
    return `${hash}-${page}-${itemsPerPage}-${orderBy}-${order}`;
}

// Reactive state
const loading = ref(false);
const transfers = ref([]);
const maxEmbeddedItems = ref(5);
const currentPage = ref(1);
const sortBy = ref([{ key: 'src', order: 'desc' }]);

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
function onPagination({ page, itemsPerPage }) {
    if (!page) return;
    
    currentPage.value = page;
    
    getTransfers({
        page,
        itemsPerPage: itemsPerPage || maxEmbeddedItems.value,
        orderBy: sortBy.value[0]?.key || 'src',
        order: sortBy.value[0]?.order || 'desc'
    });
}

function onUpdateOptions(options) {
    if (!options) return;
    
    // Update sort if provided
    if (options.sortBy?.length) {
        sortBy.value = options.sortBy;
    }
    
    getTransfers({
        page: currentPage.value,
        itemsPerPage: options.itemsPerPage || maxEmbeddedItems.value,
        orderBy: options.sortBy?.[0]?.key || sortBy.value[0]?.key || 'src',
        order: options.sortBy?.[0]?.order || sortBy.value[0]?.order || 'desc'
    });
}

async function getTransfers({ page = 1, itemsPerPage = maxEmbeddedItems.value, orderBy = 'src', order = 'desc' } = {}) {
    if (!props.hash) return;
    
    const cacheKey = getCacheKey(props.hash, page, itemsPerPage, orderBy, order);
    
    // Check cache first
    if (transfersCache.value.has(cacheKey)) {
        transfers.value = transfersCache.value.get(cacheKey);
        return;
    }
    
    loading.value = true;
    
    try {
        const transfersResponse = await $server.getTransactionTokenTransfers(
            props.hash,
            {
                page,
                itemsPerPage,
                orderBy,
                order
            }
        );
        
        // Store in cache and update current value
        transfersCache.value.set(cacheKey, transfersResponse.data.items);
        transfers.value = transfersResponse.data.items;
    } catch (error) {
        console.error('Error fetching transfers:', error);
    } finally {
        loading.value = false;
    }
}

// Watch for hash changes
watch(() => props.hash, (newHash, oldHash) => {
    if (newHash && newHash !== oldHash) {
        currentPage.value = 1;
        transfers.value = [];
        
        getTransfers({
            page: 1,
            itemsPerPage: maxEmbeddedItems.value,
            orderBy: sortBy.value[0]?.key || 'src',
            order: sortBy.value[0]?.order || 'desc'
        });
    }
});

// Initial fetch only if not triggered by watch
onMounted(() => {
    // Only fetch if watch didn't trigger (i.e., if this is the first render with an initial hash)
    if (props.hash && transfers.value.length === 0) {
        getTransfers({
            page: 1,
            itemsPerPage: maxEmbeddedItems.value,
            orderBy: sortBy.value[0]?.key || 'src',
            order: sortBy.value[0]?.order || 'desc'
        });
    }
});

// Add refresh method
function refreshTransfers() {
    console.log('Refreshing transfers');
    currentPage.value = 1;
    
    // Clear cache for current hash when refreshing
    const currentHashPrefix = `${props.hash}-`;
    for (const key of transfersCache.value.keys()) {
        if (key.startsWith(currentHashPrefix)) {
            transfersCache.value.delete(key);
        }
    }
    
    getTransfers({
        page: 1,
        itemsPerPage: maxEmbeddedItems.value,
        orderBy: sortBy.value[0]?.key || 'src',
        order: sortBy.value[0]?.order || 'desc'
    });
}
</script> 