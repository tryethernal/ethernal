<template>
    <!-- Main Data Table -->
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :headers="props.headers"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        items-per-page-text="Rows per page:"
        :items-length="count"
        :hide-default-header="isCompact"
        :no-data-text="noDataText"
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
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>

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
            <v-chip v-if="isERC20(item)" color="success" size="x-small">
                ERC-20
            </v-chip>
            <v-chip v-else-if="item.contract.patterns.includes('erc721')" color="success" size="x-small">
                ERC-721
            </v-chip>
            <v-chip v-else-if="item.contract.patterns.includes('erc1155')" color="success" size="x-small">
                ERC-1155
            </v-chip>
            <v-chip color="grey-lighten-1" v-else size="x-small">
                Unknown
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
                {{ item.transaction.blockNumber.toLocaleString() }}
            </router-link>
        </template>

        <!-- Source Address Column -->
        <template v-slot:item.src="{ item }">
            <div class="d-flex align-center">
                <v-chip
                    size="x-small"
                    color="grey-lighten-1"
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
                    color="grey-lighten-1"
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
            <div class="d-flex flex-column token-cell" v-if="isERC20(item)">
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
                <div class="d-flex flex-row align-center py-2 token-cell">
                    <router-link class="text-decoration-none" :to="`/token/${item.token}/${item.tokenId}`">
                        <v-img v-if="!imageData(item)"
                            max-height="50"
                            max-width="50"
                            rounded="lg"
                            class="bg-grey-lighten-4"
                            cover>
                            <template v-slot:default>
                                <div class="d-flex align-center justify-center fill-height">
                                    <v-icon size="50" color="grey-lighten-1">mdi-image-outline</v-icon>
                                </div>
                            </template>
                        </v-img>
                        <v-img v-else-if="!imageData(item).startsWith('<img')"
                            :src="getImageTag(imageData(item))"
                            rounded="lg"
                            max-height="50"
                            max-width="50"
                            cover>
                        </v-img>
                        <div v-else class="image-container">
                            <span v-html="getImageTag(imageData(item))"></span>
                        </div>
                    </router-link>
                    <div class="ml-2 d-flex flex-column text-truncate">
                        <span v-tooltip="`${item.contract.tokenName || '- '} #${item.tokenId}`" class="text-truncate">
                            {{ item.contract.tokenName || '-' }} <router-link class="text-decoration-none" :to="`/token/${item.token}/${item.tokenId}`">#{{ item.tokenId }}</router-link>
                        </span>
                        <router-link v-tooltip="`${item.token} | ${item.contract.name}`" class="text-caption text-decoration-none text-truncate" :to="'/nft/' + item.token" v-if="item.contract?.name">
                            {{ item.contract.name }}
                        </router-link>
                    </div>
                </div>
            </template>
            <div v-else class="token-cell">
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
            <span v-tooltip="String(item.amount)">
                {{ $fromWei(item.amount, item.contract?.tokenDecimals, ' ') }}
            </span>
        </template>

        <template v-slot:item.type="{ item }">
            <template v-if="item.contract && item.contract.patterns">
                <span v-for="pattern in item.contract.patterns" :key="pattern">
                  <v-chip
                    v-if="['erc721', 'erc1155'].includes(pattern.toLowerCase())"
                    color="success"
                    size="x-small"
                    class="mr-1">
                    {{ formatContractPattern(pattern) }}
                  </v-chip>
                </span>
            </template>
        </template>
        <!-- Empty State -->
        <template v-slot:no-data>
            <div class="text-center py-4">
                {{ noDataText }}
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
                Loading token transfers...
            </div>
        </template>
    </v-data-table-server>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import { formatContractPattern } from '@/lib/utils';
import HashLink from './HashLink.vue';

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
    },
    noDataText: {
        type: String,
        default: 'No token transfers found'
    },
    withCount: {
        type: Boolean,
        default: true
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

const isERC20 = (item) => {
    return item.contract && item.contract.patterns && item.contract.patterns.includes('erc20');
};

const isNFT = (item) => {
    return item.contract && item.contract.patterns && (item.contract.patterns.includes('erc721') || item.contract.patterns.includes('erc1155'));
};

const imageData = (item) => {
    return tokenMetadata.value[item.token] && tokenMetadata.value[item.token][item.tokenId] ? tokenMetadata.value[item.token][item.tokenId].metadata.image : null;
};

const getImageTag = (image) => {
    if (!image)
        return null;
    else if (image.startsWith('ipfs://')) {
        return `https://gateway.pinata.cloud/ipfs/${image.slice(7, image.length)}`;
    }
    else if (image.startsWith('<img')) {
        return image;
    }
    else if (image.startsWith('http')) {
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

.token-cell {
    max-width: 200px;
    overflow: hidden;
}

.text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.image-container {
    width: 150px;
    height: 150px;
    overflow: hidden;
    position: relative;
}

.image-container :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
}
</style>
