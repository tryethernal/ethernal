<template>
    <div class="token-transfers-container">
        <!-- Table Header with Controls -->
        <div class="d-flex align-center justify-space-between mb-2" v-if="!isCompact">
            <h3 class="text-h6 font-weight-medium">Token Transfers</h3>
            <div class="d-flex align-center">
                <v-btn
                    density="comfortable"
                    variant="text"
                    color="primary"
                    size="small"
                    prepend-icon="mdi-refresh"
                    @click="$emit('refresh')"
                    class="mr-2"
                    :loading="loading"
                >
                    Refresh
                </v-btn>
                <v-switch 
                    hide-details 
                    density="compact"
                    color="primary"
                    v-model="unformatted" 
                    label="Unformatted Amounts"
                    class="mr-2"
                ></v-switch>
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-btn
                            density="comfortable"
                            variant="outlined"
                            color="primary"
                            v-bind="props"
                            size="small"
                            prepend-icon="mdi-tune"
                        >
                            Display Options
                        </v-btn>
                    </template>
                    <v-list density="compact">
                        <v-list-item>
                            <v-checkbox
                                v-model="showTimestamp"
                                hide-details
                                label="Show Timestamp"
                                density="compact"
                            ></v-checkbox>
                        </v-list-item>
                        <v-list-item>
                            <v-checkbox
                                v-model="showBlockNumber"
                                hide-details
                                label="Show Block Number"
                                density="compact"
                            ></v-checkbox>
                        </v-list-item>
                        <v-list-item>
                            <v-checkbox
                                v-model="showTransactionHash"
                                hide-details
                                label="Show Transaction Hash"
                                density="compact"
                            ></v-checkbox>
                        </v-list-item>
                        <v-divider></v-divider>
                        <v-list-item>
                            <v-select
                                v-model="rowHeight"
                                :items="rowHeightOptions"
                                label="Row Height"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </div>

        <!-- Search and Filter Bar -->
        <div class="d-flex align-center mb-3" v-if="!isCompact && count > 5">
            <v-text-field
                v-model="searchQuery"
                density="compact"
                hide-details
                placeholder="Search addresses, tokens..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                class="mr-2"
                clearable
                @update:model-value="onSearch"
            ></v-text-field>
            <v-select
                v-model="tokenTypeFilter"
                :items="tokenTypeOptions"
                density="compact"
                hide-details
                label="Token Type"
                variant="outlined"
                class="max-width-150"
                @update:model-value="onFilterChange"
            ></v-select>
        </div>

        <!-- Main Data Table -->
        <v-data-table-server
            :loading="loading"
            :headers="visibleHeaders"
            :density="density"
            :sort-by="sortBy"
            :must-sort="true"
            :items-length="count"
            :hide-default-header="isCompact"
            items-per-page-text="Rows per page:"
            no-data-text="No token transfers found"
            last-icon=""
            first-icon=""
            :items-per-page-options="[
                { value: 10, title: '10' },
                { value: 25, title: '25' },
                { value: 50, title: '50' },
                { value: 100, title: '100' }
            ]"
            item-key="id"
            :items="filteredTransfers"
            @update:options="onPagination"
            class="token-transfers-table elevation-1 rounded"
            :class="rowHeightClass"
        >
            <!-- Transaction Hash Column -->
            <template v-slot:item.transactionHash="{ item }">
                <Hash-Link :type="'transaction'" :hash="item.transaction.hash" />
            </template>
            
            <!-- Token Type Column -->
            <template v-slot:item.type="{ item }">
                <v-chip
                    size="x-small"
                    :color="getTokenTypeColor(item.token)"
                    variant="flat"
                    class="mr-2"
                    v-if="type[item.token]"
                >
                    {{ formatContractPattern(type[item.token]) }}
                </v-chip>
                <span v-else class="text-disabled">N/A</span>
            </template>
            
            <!-- Timestamp Column -->
            <template v-slot:item.timestamp="{ item }">
                <div class="d-flex flex-column">
                    <span class="font-weight-medium">{{ $dt.shortDate(item.transaction.timestamp) }}</span>
                    <span class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.transaction.timestamp) }}</span>
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
                        :hash="item.src"
                        :fullHash="!isCompact"
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
                        :hash="item.dst"
                        :fullHash="!isCompact"
                        :withName="true"
                        :withTokenName="true"
                    />
                </div>
            </template>
            
            <!-- Token Column -->
            <template v-slot:item.token="{ item }">
                <Hash-Link
                    :type="'address'"
                    :hash="item.token"
                    :withName="true"
                    :withTokenName="true"
                    :tokenId="item.tokenId"
                    :contract="item.contract"
                />
            </template>
            
            <!-- Amount Column -->
            <template v-slot:item.amount="{ item }">
                <span :class="getAmountClass(item)">
                    {{ $fromWei(item.amount, decimals[item.token], symbols[item.token], unformatted) }}
                </span>
            </template>

            <!-- Empty State -->
            <template v-slot:no-data>
                <v-alert
                    type="info"
                    variant="tonal"
                    icon="mdi-information-outline"
                    class="ma-2"
                >
                    No token transfers found for this transaction
                </v-alert>
            </template>

            <!-- Loading State -->
            <template v-slot:loading>
                <div class="d-flex justify-center align-center pa-4">
                    <v-progress-circular
                        indeterminate
                        color="primary"
                        class="mr-3"
                    ></v-progress-circular>
                    <span>Loading token transfers...</span>
                </div>
            </template>
        </v-data-table-server>

        <!-- Pagination Summary -->
        <div class="d-flex justify-space-between align-center mt-2" v-if="!isCompact && count > 0">
            <v-btn
                v-if="filteredCount !== count"
                size="small"
                variant="text"
                color="primary"
                @click="clearFilters"
                prepend-icon="mdi-filter-remove"
            >
                Clear Filters
            </v-btn>
            <span v-else></span>
            <div class="text-caption text-medium-emphasis">
                Showing {{ Math.min(currentPage * itemsPerPage, filteredCount) }} of {{ filteredCount }} token transfers
                <span v-if="filteredCount !== count">(filtered from {{ count }} total)</span>
            </div>
        </div>
    </div>
</template>

<script>
import HashLink from './HashLink.vue';
import { formatContractPattern } from '@/lib/utils';

// Simple debounce function implementation
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

export default {
    name: 'TokenTransfers',
    props: ['transfers', 'headers', 'loading', 'sortBy', 'count', 'address', 'density'],
    components: {
        HashLink
    },
    data: () => ({
        unformatted: false,
        decimals: {},
        symbols: {},
        type: {},
        showTimestamp: true,
        showBlockNumber: true,
        showTransactionHash: true,
        currentPage: 1,
        itemsPerPage: 10,
        searchQuery: '',
        tokenTypeFilter: 'all',
        rowHeight: 'default',
        filteredTransfers: [],
        filteredCount: 0,
    }),
    created() {
        this.debouncedSearch = debounce(this.filterTransfers, 300);
    },
    mounted() {
        this.loadContractData();
        this.filteredTransfers = this.transfers;
        this.filteredCount = this.count;
    },
    methods: {
        formatContractPattern,
        onPagination(pagination) {
            this.currentPage = pagination.page;
            this.itemsPerPage = pagination.itemsPerPage;
            this.$emit('pagination', pagination);
        },
        loadContractData() {
            for (let i = 0; i < this.transfers.length; i++) {
                const contract = this.transfers[i].contract;

                if (!contract)
                    continue;

                this.decimals[this.transfers[i].token] = contract.tokenDecimals || 0;
                this.symbols[this.transfers[i].token] = contract.tokenSymbol || '';

                if (contract.patterns.indexOf('erc20') > -1)
                    this.type[this.transfers[i].token] = 'erc20';

                if (contract.patterns.indexOf('erc721') > -1)
                    this.type[this.transfers[i].token] = 'erc721';
            }
        },
        getTokenTypeColor(token) {
            if (!this.type[token]) return 'grey';
            
            switch(this.type[token]) {
                case 'erc20': return 'success';
                case 'erc721': return 'info';
                default: return 'grey';
            }
        },
        getAmountClass(item) {
            // Add visual cue for positive/negative amounts
            const amount = parseFloat(item.amount);
            if (amount > 0) return 'text-success font-weight-medium';
            if (amount < 0) return 'text-error font-weight-medium';
            return '';
        },
        onSearch() {
            this.debouncedSearch();
        },
        onFilterChange() {
            this.filterTransfers();
        },
        filterTransfers() {
            if (!this.searchQuery && this.tokenTypeFilter === 'all') {
                this.filteredTransfers = this.transfers;
                this.filteredCount = this.count;
                return;
            }
            
            const query = this.searchQuery.toLowerCase();
            const filtered = this.transfers.filter(transfer => {
                // Filter by token type
                if (this.tokenTypeFilter !== 'all') {
                    const tokenType = this.type[transfer.token];
                    if (this.tokenTypeFilter === 'erc20' && tokenType !== 'erc20') return false;
                    if (this.tokenTypeFilter === 'erc721' && tokenType !== 'erc721') return false;
                    if (this.tokenTypeFilter === 'other' && (tokenType === 'erc20' || tokenType === 'erc721')) return false;
                }
                
                // If no search query, return the token type filtered results
                if (!query) return true;
                
                // Search in addresses and token symbols
                return (
                    transfer.src.toLowerCase().includes(query) ||
                    transfer.dst.toLowerCase().includes(query) ||
                    transfer.token.toLowerCase().includes(query) ||
                    (this.symbols[transfer.token] && this.symbols[transfer.token].toLowerCase().includes(query))
                );
            });
            
            this.filteredTransfers = filtered;
            this.filteredCount = filtered.length;
        },
        clearFilters() {
            this.searchQuery = '';
            this.tokenTypeFilter = 'all';
            this.filteredTransfers = this.transfers;
            this.filteredCount = this.count;
        }
    },
    computed: {
        isCompact() {
            return this.density === 'compact';
        },
        visibleHeaders() {
            if (this.isCompact) return this.headers;
            
            return this.headers.filter(header => {
                if (header.key === 'timestamp' && !this.showTimestamp) return false;
                if (header.key === 'blockNumber' && !this.showBlockNumber) return false;
                if (header.key === 'transactionHash' && !this.showTransactionHash) return false;
                return true;
            });
        },
        tokenTypeOptions() {
            return [
                { title: 'All Types', value: 'all' },
                { title: 'ERC-20', value: 'erc20' },
                { title: 'ERC-721', value: 'erc721' },
                { title: 'Other', value: 'other' }
            ];
        },
        rowHeightOptions() {
            return [
                { title: 'Default', value: 'default' },
                { title: 'Compact', value: 'compact' },
                { title: 'Comfortable', value: 'comfortable' }
            ];
        },
        rowHeightClass() {
            switch (this.rowHeight) {
                case 'compact': return 'row-height-compact';
                case 'comfortable': return 'row-height-comfortable';
                default: return '';
            }
        }
    },
    watch: {
        transfers() {
            this.loadContractData();
            this.filteredTransfers = this.transfers;
            this.filteredCount = this.count;
        }
    }
}
</script>

<style scoped>
.token-transfers-container {
    position: relative;
}

.token-transfers-table {
    border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Add subtle hover effect for better row distinction */
:deep(.v-data-table__tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.05);
}

/* Improve spacing in cells for better readability */
:deep(.v-data-table__td) {
    padding: 8px 16px;
}

/* Row height variations */
:deep(.row-height-compact .v-data-table__td) {
    padding: 4px 12px;
}

:deep(.row-height-comfortable .v-data-table__td) {
    padding: 12px 20px;
}

.max-width-150 {
    max-width: 150px;
}
</style>
