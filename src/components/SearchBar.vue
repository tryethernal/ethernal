<template>
    <v-autocomplete hide-details="auto" class="mx-2 w-100"
        :class="props.compact ? 'compact' : ''"
        v-model="searchSelectedItem"
        @update:search="search"
        :items="filteredItems"
        placeholder="Search by Address / Transaction Hash / Block Number / Token..."
        rounded="lg"
        :loading="isSearchLoading"
        return-object
        hide-no-data
        no-filter>
        <template v-slot:prepend-inner>
            <v-icon color="primary" class="search-icon">mdi-magnify</v-icon>
        </template>
        <template v-slot:selection></template>

        <template v-slot:item="{ props, item }">
            <template v-if="item.raw.header">
                <v-list-subheader class="search-header py-1 text-caption">{{ item.raw.header }}</v-list-subheader>
            </template>

            <template v-if="item.raw.divider">
                <v-divider class="my-2"></v-divider>
            </template>

            <template v-if="item.raw.type == 'address'">
                <v-list-item v-bind="{ ...props, title: item.raw.data.address }" class="search-item py-3 px-4">
                    <template v-slot:title>
                        <span class="text-body-2">{{ item.raw.data.address }}</span>
                    </template>
                </v-list-item>
            </template>

            <template v-if="item.raw.type == 'transaction'">
                <v-list-item v-bind="{ ...props, title: item.raw.data.hash }" class="search-item py-3 px-4">
                    <template v-slot:title>
                        <span class="text-body-2">{{ item.raw.data.hash }}</span>
                    </template>
                    <template v-slot:subtitle>
                        <span class="text-caption text-medium-emphasis">Block </span>
                        <span class="text-caption text-high-emphasis">#{{ item.raw.data.blockNumber.toLocaleString() }}</span>
                    </template>
                </v-list-item>
            </template>

            <template v-if="item.raw.type == 'block'">
                <v-list-item v-bind="{ ...props, title: `Block #${item.raw.data.number}` }" class="search-item py-3 px-4">
                    <template v-slot:title>
                        <span class="text-body-2">Block #{{ item.raw.data.number }}</span>
                    </template>
                    <template v-slot:subtitle>
                        <span class="text-caption text-medium-emphasis">Transactions: </span>
                        <span class="text-caption text-high-emphasis">{{ item.raw.data.transactionsCount }}</span>
                    </template>
                </v-list-item>
            </template>

            <template v-if="item.raw.type == 'contract'">
                <v-list-item v-bind="{ ...props, title: item.raw.data.tokenName || item.raw.data.name }" class="search-item py-3 px-4">
                    <template v-slot:title>
                        <div class="contract-title">
                            <div class="d-flex align-center">
                                <v-icon size="x-small" v-if="item.raw.data.verification?.createdAt" v-tooltip="'Verified Contract'" color="success" class="mr-1">mdi-check-circle</v-icon>
                                <span class="text-body-2 contract-name">{{ item.raw.data.tokenName || item.raw.data.name }}</span>
                                <span v-if="item.raw.data.tokenSymbol" class="text-caption text-medium-emphasis ml-1">({{ item.raw.data.tokenSymbol }})</span>
                            </div>
                        </div>
                    </template>
                    <template v-slot:subtitle>
                        <div class="mt-1 contract-details">
                            <div class="d-flex align-center text-no-wrap">
                                <span class="text-caption text-medium-emphasis">Address: </span>
                                <span class="text-caption text-high-emphasis address-text">{{ item.raw.data.address }}</span>
                            </div>
                            <div v-if="item.raw.data.name && item.raw.data.tokenName" class="mt-1 d-flex align-center text-no-wrap">
                                <span class="text-caption text-medium-emphasis">Contract Name: </span>
                                <span class="text-caption text-high-emphasis contract-text">{{ item.raw.data.name }}</span>
                            </div>
                        </div>
                    </template>
                </v-list-item>
            </template>
        </template>
    </v-autocomplete>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
    compact: {
        type: Boolean,
        default: false
    }
});

// Inject server instance
const $server = inject('$server');

// Router setup
const router = useRouter();

// Reactive state
const searchSelectedItem = ref(null);
const searchItems = ref([]);
const isSearchLoading = ref(false);
const searchType = ref(null);

// Methods
const clearSearchBar = () => {
    searchType.value = null;
    searchSelectedItem.value = null;
};

const search = async (val) => {
    if (!val) {
        searchItems.value = [];
        return;
    }
    if (val === searchSelectedItem.value || typeof val === 'object') return;

    isSearchLoading.value = true;
    searchType.value = 'text';

    if (val.startsWith('0x')) {
        if (val.length === 66) {
            searchType.value = 'hash';
        } else if (val.length === 42) {
            searchType.value = 'address';
        }
    } else if (!isNaN(parseFloat(val)) && parseFloat(val) % 1 === 0) {
        searchType.value = 'number';
    }

    if (searchType.value === 'text' && val.length < 3) {
        isSearchLoading.value = false;
        return;
    }

    try {
        const { data } = await $server.search(searchType.value, val);
        searchItems.value = data;
        if (searchType.value === 'address' && !data.length) {
            searchItems.value.push({ type: 'address', data: { address: val }});
        }
    } catch (error) {
        console.log(error);
    } finally {
        isSearchLoading.value = false;
    }
};

// Computed properties
const categorizedItems = computed(() => {
    const items = {
        'address': [],
        'transaction': [],
        'block': [],
        'erc20': [],
        'nft': []
    };

    searchItems.value.forEach(item => {
        // All contracts and addresses appear in the address section
        if (item.type === 'contract' || item.type === 'address') {
            // Add to address section
            items.address.push(item);
        }

        // Then also categorize token contracts by their type
        if (item.type === 'contract' && item.data.patterns) {
            if (item.data.patterns.includes('erc721') || item.data.patterns.includes('erc1155')) {
                items.nft.push(item);
            } else if (item.data.patterns.includes('erc20')) {
                items.erc20.push(item);
            }
            // Non-token contracts only show up in the address section
        }

        // Handle other non-address, non-contract types
        if (item.type !== 'contract' && item.type !== 'address') {
            items[item.type].push(item);
        }
    });

    return items;
});

const orderedItems = computed(() => {
    const items = categorizedItems.value;
    const result = [];

    // Tokens section (ERC-20) now comes first
    if (items.erc20.length) {
        result.push({ header: 'Tokens (ERC-20)', section: 'tokens' }, 
            ...items.erc20.map(item => ({
                ...item,
                key: `tokens-${item.data.address}`
            }))
        );
    }

    // NFTs section (ERC-721 & ERC-1155) comes second
    if (items.nft.length) {
        if (result.length) result.push({ divider: true });
        result.push({ header: 'NFTs (ERC-721 & 1155)', section: 'nfts' },
            ...items.nft.map(item => ({
                ...item,
                key: `nfts-${item.data.address}`
            }))
        );
    }

    // Address section now comes third
    if (items.address.length) {
        if (result.length) result.push({ divider: true });
        result.push({ header: 'Addresses', section: 'addresses' },
            ...items.address.map(item => ({
                ...item,
                key: `addresses-${item.data.address}`
            }))
        );
    }

    // Other sections
    if (items.transaction.length) {
        if (result.length) result.push({ divider: true });
        result.push({ header: 'Transactions' },
            ...items.transaction.map(item => ({
                ...item,
                key: `tx-${item.data.hash}`
            }))
        );
    }

    if (items.block.length) {
        if (result.length) result.push({ divider: true });
        result.push({ header: 'Blocks' },
            ...items.block.map(item => ({
                ...item,
                key: `block-${item.data.number}`
            }))
        );
    }

    return result;
});

const filteredItems = computed(() => {
    return orderedItems.value;
});

// Watchers
watch(searchSelectedItem, (item) => {
    if (!item) return;

    switch(item.type) {
        case 'address':
        case 'contract':
            router.push({ path: `/address/${item.data.address}`, query: { tab: 'transactions' } });
            break;
        case 'transaction':
            router.push({ path: `/transaction/${item.data.hash}` });
            break;
        case 'block':
            router.push({ path: `/block/${item.data.number}` });
            break;
    }
    clearSearchBar();
});
</script>

<style scoped>
.compact {
    padding: 4px 0;
}

.compact:deep(.v-field) {
    box-shadow: none !important;
    min-height: 36px !important;
    height: 36px !important;
}

.compact:deep(.v-field__input) {
    padding: 8px !important;
    min-height: 36px !important;
    height: 36px !important;
    font-size: 0.875rem !important;
}

.compact:deep(.search-icon) {
    font-size: 1.25rem !important;
    margin-right: 4px !important;
}

.v-autocomplete:not(.compact) {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border-radius: 12px;
    background: white;
}

:deep(.v-field__append-inner),
:deep(.v-input__append) {
    display: none !important;
}

:deep(.v-field__input) {
    padding: 12px 16px;
    font-size: 1rem;
}

:deep(.v-field) {
    --v-field-padding-start: 16px !important;
    border-radius: 12px;
    background: white;
}

.search-icon {
    font-size: 1.5rem;
    margin-right: 8px;
}

:deep(.v-field__outline) {
    --v-field-border-opacity: 0.12;
}

:deep(.v-field--focused .v-field__outline) {
    --v-field-border-opacity: 0.2;
    border-color: rgb(var(--v-theme-primary)) !important;
}

:deep(.v-field:hover .v-field__outline) {
    --v-field-border-opacity: 0.2;
    border-color: rgb(var(--v-theme-primary)) !important;
}

/* Dropdown styling */
:deep(.v-list) {
    padding: 8px 0;
}

.search-header {
    font-weight: 600;
    font-size: 0.75rem;
    color: rgb(var(--v-theme-primary));
    letter-spacing: 0.5px;
    text-transform: uppercase;
    opacity: 0.8;
    height: auto;
    padding-top: 4px;
    padding-bottom: 4px;
}

.search-item {
    border-radius: 8px;
    margin: 0;
    transition: background-color 0.2s ease;
}

.v-menu .v-list-item:hover {
    background-color: rgba(var(--v-theme-primary), 0.1) !important;
    border-radius: 8px !important;
}

.search-item:hover :deep(.v-list-item-title),
.search-item:hover :deep(.v-list-item-subtitle) {
    color: inherit !important;
}

:deep(.v-list-item__content) {
    padding: 4px 0;
}

:deep(.v-list-item-title) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
}

.verification-icon {
    display: flex;
    align-items: center;
    margin-left: 8px;
}

.contract-title {
    max-width: 100%;
}

.contract-name {
    word-break: break-word;
    line-height: 1.2;
}

.contract-details {
    max-width: 100%;
}

.address-text,
.contract-text {
    text-overflow: ellipsis;
    overflow: hidden;
    padding-left: 4px;
    max-width: calc(100% - 70px); /* Adjust based on label width */
}

:deep(.v-list-item__content) {
    overflow: visible;
    white-space: normal;
}

:deep(.v-list-item-title) {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    line-height: 1.2;
}

:deep(.v-list-item-subtitle) {
    white-space: normal;
    overflow: visible;
}

/* Add this new style for high emphasis text */
:deep(.text-high-emphasis) {
    color: rgba(var(--v-theme-on-surface), 0.87) !important;
    font-weight: 500;
}
</style>
