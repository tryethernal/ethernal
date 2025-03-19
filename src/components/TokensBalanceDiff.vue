<template>
    <!-- Standard view -->
    <v-card class="my-2" v-if="!embedded">
        <v-card-text>
            <div style="height: 48px; font-size: 16px" class="d-flex justify-end mb-4">
                <v-switch hide-details="auto" class="align-self-center" v-model="unformatted" label="Unformatted Amounts"></v-switch>
            </div>
            
            <div v-for="(changes, address) in groupedBalanceChanges" :key="address" class="mb-4 pa-2 rounded-sm">
                <div class="d-flex">
                    <!-- Address cell -->
                    <div style="min-width: 200px;">
                        <span class="font-weight-medium">
                            <Hash-Link
                                :type="'address'"
                                :hash="address"
                                :withName="true"
                            />
                        </span>
                    </div>

                    <!-- Balance changes cell -->
                    <div class="flex-grow-1">
                        <div v-for="(item, index) in changes" :key="item.id || index" class="d-flex align-center mb-1">
                            <v-icon
                                :color="changeDirection(item.diff) > 0 ? 'success' : (changeDirection(item.diff) < 0 ? 'error' : 'grey')"
                                size="small"
                                class="mr-2"
                            >
                                {{ changeDirection(item.diff) > 0 ? 'mdi-arrow-up-bold' : (changeDirection(item.diff) < 0 ? 'mdi-arrow-down-bold' : 'mdi-minus') }}
                            </v-icon>
                            
                            <span :class="{
                                'text-success font-weight-medium': changeDirection(item.diff) > 0,
                                'text-error font-weight-medium': changeDirection(item.diff) < 0
                            }">
                                {{ changeDirection(item.diff) > 0 ? '+' : '' }}{{ $fromWei(item.diff, getTokenDecimals(item.token), getTokenSymbol(item.token), unformatted) }}
                            </span>
                            
                            <span class="text-body-2 text-grey ml-4">
                                {{ $fromWei(item.previousBalance, getTokenDecimals(item.token), getTokenSymbol(item.token), unformatted) }}
                                <v-icon size="x-small" class="mx-1">mdi-arrow-right</v-icon>
                                {{ $fromWei(item.currentBalance, getTokenDecimals(item.token), getTokenSymbol(item.token), unformatted) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </v-card-text>
    </v-card>
    
    <!-- Embedded compact view -->
    <div v-else class="embedded-balance-diff pa-0 rounded">
        <!-- Balance Changes List -->
        <div v-if="!loading" class="balance-changes-list">
            <div v-for="(changes, address) in groupedDisplayedBalanceChanges" :key="address" 
                class="embedded-balance-item px-0 rounded-sm mb-3">
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
                        <div v-for="(item, index) in changes" :key="item.id || index" class="d-flex align-center mb-1">
                            <v-icon 
                                :color="changeDirection(item.diff) > 0 ? 'success' : (changeDirection(item.diff) < 0 ? 'error' : 'grey')"
                                size="x-small"
                                class="mr-2"
                            >
                                {{ changeDirection(item.diff) > 0 ? 'mdi-arrow-up-bold' : (changeDirection(item.diff) < 0 ? 'mdi-arrow-down-bold' : 'mdi-minus') }}
                            </v-icon>
                            
                            <span :class="{'text-success font-weight-medium': changeDirection(item.diff) > 0, 'text-error font-weight-medium': changeDirection(item.diff) < 0}">
                                {{ changeDirection(item.diff) > 0 ? '+' : '' }}{{ $fromWei(item.diff, getTokenDecimals(item.token), getTokenSymbol(item.token), unformatted) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
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

        <!-- Empty State -->
        <div v-if="!loading && Object.keys(groupedDisplayedBalanceChanges).length === 0" class="empty-state pa-4 text-center">
            <v-icon color="grey-lighten-1" size="24" class="mb-2">mdi-swap-horizontal-off</v-icon>
            <div class="text-body-2 text-grey-darken-1">No balance changes found for this transaction</div>
        </div>

        <!-- Pagination -->
        <div v-if="balanceChanges.length > itemsPerPage" class="text-center mt-2">
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
    embedded: {
        type: Boolean,
        default: false
    },
    showAll: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['view-all']);

// Inject server
const $server = inject('$server');

// Reactive state
const unformatted = ref(false);
const tokenData = ref({}); // Store token data by token address
const currentPage = ref(1);
const itemsPerPage = ref(5);
const loading = ref(false);

// Memoized computed properties
const previousBlockNumber = computed(() => Math.max(0, parseInt(props.blockNumber) - 1));

const tableHeaders = computed(() => [
    { title: 'Address', key: 'address' },
    { title: `Previous Block (#${previousBlockNumber.value})`, key: 'before' },
    { title: `Tx Block (#${parseInt(props.blockNumber)})`, key: 'now' },
    { title: 'Change', key: 'change' }
]);

// Process balance changes with memoization
const groupedBalanceChanges = computed(() => {
    // First, get unique addresses
    const uniqueAddresses = [...new Set(props.balanceChanges.map(item => item.address))];
    
    // Then create groups with all changes for each address
    return uniqueAddresses.reduce((acc, address) => {
        acc[address] = props.balanceChanges.filter(item => item.address === address);
        return acc;
    }, {});
});

// Handle pagination
const totalPages = computed(() => Math.ceil(props.balanceChanges.length / itemsPerPage.value));

const groupedDisplayedBalanceChanges = computed(() => {
    // Get the current page's items
    const startIndex = (currentPage.value - 1) * itemsPerPage.value;
    const endIndex = startIndex + itemsPerPage.value;
    const paginatedBalanceChanges = props.balanceChanges.slice(startIndex, endIndex);
    
    // Get unique addresses for the paginated items
    const uniqueAddresses = [...new Set(paginatedBalanceChanges.map(item => item.address))];
    
    // Create groups with changes for each address
    return uniqueAddresses.reduce((acc, address) => {
        acc[address] = paginatedBalanceChanges.filter(item => item.address === address);
        return acc;
    }, {});
});

// Token data loading with batching for efficiency
async function loadContractData() {
    // Extract unique tokens that we haven't loaded yet
    const uniqueTokens = [...new Set(props.balanceChanges.map(item => item.token))];
    const tokensToLoad = uniqueTokens.filter(token => !tokenData.value[token]);
    
    if (tokensToLoad.length === 0) return;
    
    // Batch load tokens (5 at a time to avoid too many concurrent requests)
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < tokensToLoad.length; i += batchSize) {
        batches.push(tokensToLoad.slice(i, i + batchSize));
    }
    
    // Process batches sequentially
    for (const batch of batches) {
        await Promise.all(batch.map(async (tokenAddress) => {
            try {
                const { data } = await $server.getContract(tokenAddress);
                if (!data) return;
                
                // Update token data with new information
                tokenData.value = {
                    ...tokenData.value,
                    [tokenAddress]: {
                        decimals: data.tokenDecimals || 18,
                        symbol: data.tokenSymbol || ''
                    }
                };
            } catch (error) {
                console.error(`Error loading token data for ${tokenAddress}:`, error);
            }
        }));
    }
}

// Optimized functions
function getTokenDecimals(tokenAddress) {
    return tokenData.value[tokenAddress]?.decimals || 18;
}

function getTokenSymbol(tokenAddress) {
    return tokenData.value[tokenAddress]?.symbol || '';
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

// Watch for balance changes and load token data
watch(() => props.balanceChanges, (newBalanceChanges, oldBalanceChanges) => {
    // Only reload if we have new token addresses
    const oldTokens = new Set((oldBalanceChanges || []).map(item => item.token));
    const hasNewTokens = newBalanceChanges.some(item => !oldTokens.has(item.token));
    
    if (hasNewTokens) {
        loadContractData();
    }
}, { immediate: true });

// Initial load
onMounted(() => {
    loadContractData();
});
</script>

<style scoped>
.embedded-balance-diff {
    width: 100%;
    border: none;
    background-color: transparent;
}

.embedded-balance-item {
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
    max-height: 300px;
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
