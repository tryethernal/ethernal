<template>
    <div class="balance-diff pa-0 rounded">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state d-flex justify-center align-center pa-4">
            <v-progress-circular
                indeterminate
                color="primary"
                class="mr-2"
                size="16"
                width="2"
            ></v-progress-circular>
            <span class="text-caption">Loading balance changes...</span>
        </div>

        <!-- Balance Changes List -->
        <div v-else-if="Object.keys(groupedDisplayedBalanceChanges).length > 0" class="balance-changes-list">
            <div v-for="(changes, address, idx) in groupedDisplayedBalanceChanges" :key="address" 
                class="balance-item px-0 rounded-sm mb-3">
                <div class="d-flex flex-justify-between">
                    <!-- Address cell -->
                    <div style="min-width: 200px;">
                        <span class="font-weight-medium">
                            <Hash-Link
                                :type="'address'"
                                :hash="address"
                                :withName="true"
                                truncate="true"
                            />
                        </span>
                    </div>

                    <!-- Balance changes cell -->
                    <div class="flex-grow-1">
                        <div v-for="(item, index) in changes" :key="item.id || index">
                            <!-- Balance info row -->
                            <div class="d-flex align-center mb-1">
                                <v-icon 
                                    :color="changeDirection(item.diff) > 0 ? 'success' : (changeDirection(item.diff) < 0 ? 'error' : 'grey')"
                                    size="x-small"
                                    class="mr-2"
                                >
                                    {{ changeDirection(item.diff) > 0 ? 'mdi-arrow-up-bold' : (changeDirection(item.diff) < 0 ? 'mdi-arrow-down-bold' : 'mdi-minus') }}
                                </v-icon>
                                
                                <!-- Token amount change -->
                                <span v-if="getTokenDecimals(item)" :class="{'text-success font-weight-medium': changeDirection(item.diff) > 0, 'text-error font-weight-medium': changeDirection(item.diff) < 0}">
                                    {{ changeDirection(item.diff) > 0 ? '+' : '' }}{{ $fromWei(item.diff, getTokenDecimals(item), item.contract.tokenName, unformatted) }}
                                </span>
                                <template v-else>
                                    <span :class="{'text-success font-weight-medium': changeDirection(item.diff) > 0, 'text-error font-weight-medium': changeDirection(item.diff) < 0}">
                                        {{ changeDirection(item.diff) > 0 ? '+' : '' }}{{ item.diff }}
                                    </span>
                                </template>

                                <!-- Token symbol/contract -->
                                <span class="text-medium-emphasis ml-1">
                                    <template v-if="item.contract.tokenSymbol">({{ item.contract.tokenSymbol }})</template>
                                    <template v-else>
                                        (<Hash-Link :notCopiable="!!item.contract.name" :contract="item.contract" :hash="item.token" :type="'address'" :withName="true" truncate="true" />)
                                    </template>
                                </span>

                                <!-- Previous and current balance -->
                                <v-tooltip location="end">
                                    <template v-slot:activator="{ props }">
                                        <v-btn
                                            v-bind="props"
                                            density="comfortable"
                                            variant="text"
                                            size="small"
                                            class="ml-2 text-medium-emphasis"
                                            icon="mdi-history"
                                        ></v-btn>
                                    </template>
                                    <div class="pa-2">
                                        <div class="mb-1">
                                            <span>Previous Block (#{{ Math.max(props.blockNumber - 1, 0) }}):</span>
                                            <span class="ml-1">{{ $fromWei(getPreviousBalance(item), getTokenDecimals(item), getTokenSymbol(item), unformatted) }}</span>
                                        </div>
                                        <div>
                                            <span>Transaction Block (#{{ props.blockNumber }}):</span>
                                            <span class="ml-1">{{ $fromWei(getCurrentBalance(item), getTokenDecimals(item), getTokenSymbol(item), unformatted) }}</span>
                                        </div>
                                    </div>
                                </v-tooltip>
                            </div>
                        </div>
                    </div>
                </div>
                <v-divider v-if="idx < Object.keys(groupedDisplayedBalanceChanges).length - 1" class="my-2" />
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state pa-4 text-center">
            <v-icon color="grey-lighten-1" size="24" class="mb-2">mdi-swap-horizontal-off</v-icon>
            <div class="text-body-2 text-grey-darken-1">No balance changes found</div>
        </div>

        <!-- Pagination -->
        <div v-if="Object.keys(groupedDisplayedBalanceChanges).length > 0 && totalPages > 1" class="text-center mt-2">
            <v-pagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="5"
                density="compact"
                color="primary"
                active-color="primary"
                border
                size="small"
                @update:model-value="onPageChange"
            />
        </div>
    </div>
</template>
<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { BigNumber } from 'ethers';
import HashLink from './HashLink.vue';

const props = defineProps({
    balanceChanges: {
        type: Array,
        required: true
    },
    blockNumber: [Number, String],
    itemsPerPage: {
        type: Number,
        default: 5
    }
});

// Reactive state
const unformatted = ref(false);
const currentPage = ref(1);
const loading = ref(false);

// Handle pagination
const totalPages = computed(() => {
    const pages = Math.ceil(props.balanceChanges.length / props.itemsPerPage);
    console.log('Total pages:', pages, 'Items per page:', props.itemsPerPage, 'Total items:', props.balanceChanges.length);
    return pages;
});

const groupedDisplayedBalanceChanges = computed(() => {
    console.log('Computing groupedDisplayedBalanceChanges. Current page:', currentPage.value);
    // Get the current page's items
    const startIndex = (currentPage.value - 1) * props.itemsPerPage;
    const endIndex = startIndex + props.itemsPerPage;
    const paginatedBalanceChanges = props.balanceChanges.slice(startIndex, endIndex);
    console.log('Paginated balance changes:', paginatedBalanceChanges);
    
    // Get unique addresses for the paginated items
    const uniqueAddresses = [...new Set(paginatedBalanceChanges.map(item => item.address))];
    console.log('Unique addresses for current page:', uniqueAddresses);
    
    // Create groups with changes for each address
    const result = uniqueAddresses.reduce((acc, address) => {
        acc[address] = paginatedBalanceChanges.filter(item => item.address === address);
        return acc;
    }, {});
    console.log('Grouped displayed balance changes:', result);
    return result;
});

// Optimized functions
function getTokenDecimals(item) {
    return item?.contract?.tokenDecimals ?? null;
}

function getTokenSymbol(item) {
    return item?.contract?.tokenSymbol ?? ' ';
}

// Cache change direction results
const diffCache = new Map();
function changeDirection(diff) {
    if (!diff) return 0;
    
    // Use cache if available
    const cacheKey = diff.toString();
    if (diffCache.has(cacheKey)) {
        return diffCache.get(cacheKey);
    }
    
    // Calculate and cache the result
    const bigDiff = BigNumber.from(diff);
    let result;
    
    if (bigDiff.gt('0')) {
        result = 1;
    } else if (bigDiff.eq('0')) {
        result = 0;
    } else {
        result = -1;
    }
    
    diffCache.set(cacheKey, result);
    return result;
}

function onPageChange(page) {
    currentPage.value = page;
}

function getPreviousBalance(item) {
    if (!item || !item.diff) return '0';
    const currentBalance = getCurrentBalance(item);
    const diff = BigNumber.from(item.diff);
    return BigNumber.from(currentBalance).sub(diff).toString();
}

function getCurrentBalance(item) {
    return item?.currentBalance || '0';
}
</script>

<style scoped>
.balance-diff {
    width: 100%;
    border: none;
    background-color: transparent;
}

.balance-item {
    margin-bottom: 0;
    font-size: 0.875rem;
}

.border-bottom {
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.03);
}

/* New container styles */
.token-name-container {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
    padding-bottom: 4px;
}

.token-link {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
}

.address-container {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.compact-amount {
    max-width: 120px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}

.value-container {
    white-space: nowrap;
    display: inline-flex;
}

.balance-changes-list {
    overflow-y: auto;
    padding-right: 4px;
}

.balance-sentence {
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
    min-width: 0;
}

/* Pagination Styles */
:deep(.v-pagination) {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 0;
    min-height: 32px;
    height: 32px;
    padding: 0;
}

:deep(.v-pagination__item) {
    border-radius: 4px;
    color: rgb(var(--v-theme-on-surface));
    min-width: 32px;
    height: 32px;
    font-size: 0.875rem;
    padding: 0;
    margin: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
}

:deep(.v-pagination__item--is-active) {
    color: rgb(var(--v-theme-primary));
    font-weight: 500;
    background: transparent;
}

:deep(.v-pagination__navigation) {
    border: none;
    background: transparent;
    min-width: 32px;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

:deep(.v-pagination__navigation .v-icon) {
    font-size: 20px;
    width: 20px;
    height: 20px;
    color: rgba(var(--v-theme-on-surface), 0.87);
}

:deep(.v-pagination__item:hover),
:deep(.v-pagination__navigation:hover) {
    background: rgba(var(--v-theme-on-surface), 0.04);
}

.loading-state, .empty-state {
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
</style>
