<template>
    <!-- Main Data Table -->
    <v-data-table-server
        :loading="loading"
        :headers="visibleHeaders"
        :density="density"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        :items-length="count"
        :hide-default-header="isCompact"
        no-data-text="No token transfers found"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        item-key="id"
        :items="transfers"
        @update:options="updateOptions">

        <!-- Transaction Hash Column -->
        <template v-slot:item.transactionHash="{ item }">
            <Hash-Link :xsHash="true" :type="'transaction'" :hash="item.transaction.hash" />
        </template>

        <template v-slot:item.methodDetails="{ item }">
            <v-tooltip v-if="item.transaction.methodDetails && item.transaction.methodDetails.name">
                <template v-slot:activator="{ props }">
                    <v-chip v-bind="props" color="primary-lighten-1" label size="small" variant="flat">
                        {{ item.transaction.methodDetails.name }}
                    </v-chip>
                </template>
                <span style="white-space: pre">{{ item.transaction.methodDetails.label }}</span>
            </v-tooltip>
            <v-chip v-else-if="item.transaction.methodDetails && item.transaction.methodDetails.sighash" color="primary-lighten-1" label size="small" variant="flat">
                {{ item.transaction.methodDetails.sighash }}
            </v-chip>
        </template>

        <template v-slot:item.tokenType="{ item }">
            <v-chip v-for="pattern in item.contract.patterns.filter(p => p !== 'proxy')" :key="pattern" color="success" size="x-small" variant="flat">
                {{ formatContractPattern(pattern) }}
            </v-chip>
        </template>
        
        <!-- Timestamp Column -->
        <template v-slot:item.timestamp="{ item }">
            <div class="d-flex flex-column">
                <span>{{ $dt.shortDate(item.transaction.timestamp) }}</span>
                <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.transaction.timestamp) }}</small>
            </div>
        </template>
        
        <!-- Block Number Column -->
        <template v-slot:item.blockNumber="{ item }">
            <router-link 
                :to="'/block/' + item.transaction.blockNumber"
                class="text-decoration-none"
            >
                {{ item.transaction.blockNumber }}
            </router-link>
        </template>
        
        <!-- Source Address Column -->
        <template v-slot:item.src="{ item }">
            <div class="d-flex align-center">
                <v-chip
                    size="x-small"
                    color="primary"
                    variant="flat"
                    class="mr-2"
                    v-if="item.src === address"
                >
                    self
                </v-chip>
                <Hash-Link
                    :type="'address'"
                    :xsHash="true"
                    :hash="item.src"
                    :withName="true"
                    :withTokenName="true"
                />
            </div>
        </template>
        
        <!-- Destination Address Column -->
        <template v-slot:item.dst="{ item }">
            <div class="d-flex align-center">
                <v-chip
                    size="x-small"
                    color="primary"
                    variant="flat"
                    class="mr-2"
                    v-if="item.dst === address"
                >
                    self
                </v-chip>
                <Hash-Link
                    :type="'address'"
                    :xsHash="true"
                    :hash="item.dst"
                    :withName="true"
                    :withTokenName="true"
                />
            </div>
        </template>
        
        <!-- Token Column -->
        <template v-slot:item.token="{ item }">
            <div class="d-flex flex-column" v-if="isERC20(item)">
                <Hash-Link
                    :type="'address'"
                    :xsHash="true"
                    :hash="item.token"
                    :withName="true"
                    :withTokenName="true"
                    :tokenId="item.tokenId"
                    :contract="item.contract"
                />
                <span class="text-caption text-medium-emphasis" v-if="item.contract?.tokenName && item.contract?.tokenSymbol">
                    {{ item.contract.tokenSymbol }}
                </span>
            </div>
            <template v-else-if="isNFT(item)">
                <div class="d-flex flex-row align-center">
                    <div class="px-2 pt-2" v-html="getImageTag(tokenMetadata[item.token] && tokenMetadata[item.token][item.tokenId] ? tokenMetadata[item.token][item.tokenId].metadata.image : null)"></div>
                    <div class="d-flex flex-column" v-if="item.contract?.tokenName">
                        {{ item.contract.tokenName }}
                        <span class="text-caption text-medium-emphasis" v-if="item.contract?.tokenName && item.contract?.tokenSymbol">
                            {{ item.contract.tokenSymbol }}
                        </span>
                    </div>
                </div>
            </template>
            <div v-else>
                <Hash-Link
                    :type="'address'"
                    :xsHash="true"
                    :hash="item.token"
                    :withName="true"
                    :withTokenName="true"
                />
            </div>
        </template>
        
        <!-- Amount Column -->
        <template v-slot:item.amount="{ item }">
            <span v-tooltip="item.amount">
                {{ $fromWei(item.amount, item.contract?.tokenDecimals, ' ') }}
            </span>
        </template>

        <!-- Empty State -->
        <template v-slot:no-data>
            <div class="text-center py-4">
                No token transfers found for this transaction
            </div>
        </template>

        <!-- Loading State -->
        <template v-slot:loading>
            <div class="d-flex justify-center align-center pa-4">
                <v-progress-circular
                    size="24"
                    indeterminate
                    color="primary"
                    class="mr-3"
                ></v-progress-circular>
                <span>Loading token transfers...</span>
            </div>
        </template>
    </v-data-table-server>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import HashLink from './HashLink.vue';
import { formatContractPattern } from '@/lib/utils';

// Component props
const props = defineProps({
    transfers: {
        type: Array,
        default: () => []
    },
    headers: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    sortBy: {
        type: Array,
        default: () => []
    },
    count: {
        type: Number,
        default: 0
    },
    address: {
        type: String,
        default: ''
    },
    density: {
        type: String,
        default: 'default'
    },
    withTransactionData: {
        type: Boolean,
        default: false
    },
    withTokenData: {
        type: Boolean,
        default: false
    }
});

const tokenMetadata = ref({});

const $server = inject('$server');

// Component emits
const emit = defineEmits(['update:options']);

// Reactive state
const currentOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'timestamp', order: 'desc' }] });

// Computed properties
const isCompact = computed(() => props.density === 'compact');

const visibleHeaders = computed(() => {
    if (isCompact.value) return props.headers;
    return props.headers.filter(header => true);
});

const isERC20 = (item) => {
    return item.contract && item.contract.patterns && item.contract.patterns.includes('erc20');
};

const isNFT = (item) => {
    return item.contract && item.contract.patterns && (item.contract.patterns.includes('erc721') || item.contract.patterns.includes('erc1155'));
};

const getImageTag = (image) => {
    if (!image)
        return `
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="50" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="2"/>
            <rect x="8" y="8" width="34" height="34" rx="6" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="4"/>
            <text x="50%" y="55%" font-size="12" font-family="Arial, sans-serif" fill="#6B7280" text-anchor="middle" dominant-baseline="middle">
                NFT
            </text>
            </svg>
        `;
    else if (image.startsWith('ipfs://')) {
        return `<img width="50" height="50" src="https://gateway.pinata.cloud/ipfs/${image.slice(7, image.length)}" />`;
    }
    else if (image.startsWith('<img')) {
        return image;
    }
    return `<img width="50" height="50" src="${image}" />`;
};

// Methods
const updateOptions = ({ page, itemsPerPage, sortBy }) => {
    if (props.loading)
        return;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length )
        return;

    currentOptions.value = { page, itemsPerPage, sortBy };

    emit('update:options', { page, itemsPerPage, sortBy });
}

watch(() => props.transfers, (newVal) => {
    newVal.forEach(item => {
        if (isNFT(item)) {
            $server.getErc721TokenById(item.token, item.tokenId)
                .then(({ data }) => {
                    if (!tokenMetadata.value[item.token])
                        tokenMetadata.value[item.token] = {};
                    tokenMetadata.value[item.token][item.tokenId] = data;
                });
        }
    });
});
</script>

<style scoped>
/* Add subtle hover effect for better row distinction */
:deep(.v-data-table__tr:hover) {
    background-color: transparent !important;
}

/* Improve spacing in cells for better readability */
:deep(.v-data-table__td) {
    padding: 8px 16px;
}
</style>
