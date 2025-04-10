<template>
    <v-container v-if="loadingContract" fluid>
        <v-skeleton-loader
            type="text"
            max-width="600"
            class="mb-4"
        />
        <v-divider class="my-4"></v-divider>
        
        <!-- Skeleton for AddressHeader -->
        <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
                <v-skeleton-loader type="card" height="100" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-skeleton-loader type="card" height="100" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-skeleton-loader type="card" height="100" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
                <v-skeleton-loader type="card" height="100" />
            </v-col>
        </v-row>

        <!-- Skeleton for tab chips -->
        <v-skeleton-loader
            type="chip"
            class="mb-4"
        />

        <!-- Skeleton for main content area -->
        <v-card>
            <v-card-text>
                <v-skeleton-loader
                    type="table-heading, divider, table-row-divider, table-row, table-row, table-row"
                />
            </v-card-text>
        </v-card>
    </v-container>
    <v-container v-else fluid>
        <h2 class="text-h6 font-weight-medium">
            {{ contract ? 'Contract' : 'Address' }}
            <span class="text-body-2 text-medium-emphasis">{{ address }}</span>
        </h2>
        <v-divider class="my-4"></v-divider>
        <AddressHeader
            :loading-balance="loadingBalance"
            :loading-stats="loadingStats"
            :balance="balance"
            :contract="contract"
            :address-transaction-stats="addressTransactionStats"
        />

        <BaseChipGroup v-model="activeTab" mandatory>
            <v-chip label size="small" value="transactions">
                Transactions 
                <template v-if="!loadingStats">({{ totalTransactions }})</template>
            </v-chip>
            <v-chip label v-if="currentWorkspaceStore.tracing" size="small" value="internaltx">
                Internal Transactions
                <template v-if="!loadingStats">({{ addressTransactionStats.internalTransactionCount }})</template>
            </v-chip>
            <v-chip label size="small" value="tokentxns">
                Token Transfers 
                <template v-if="!loadingStats">({{ totalTokenTransfers }})</template>
            </v-chip>
            <v-chip label size="small" value="code" v-if="contract">
                <v-icon v-if="contract.verification?.id" class="mr-1" color="success" icon="mdi-check-circle"></v-icon>
                Contract
            </v-chip>
            <v-chip label size="small" value="events" v-if="contract">
                Events
                <template v-if="!loadingStats">({{ contract.logCount }})</template>
            </v-chip>
            <v-chip label size="small" value="analytics">Analytics</v-chip>
            <v-chip label size="small" value="assets">Assets</v-chip>
        </BaseChipGroup>

        <div v-if="activeTab === 'transactions'">
            <v-card>
                <v-card-text>
                    <Address-Transactions-List :address="address" :key="address" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'internaltx'">
            <v-card>
                <v-card-text>
                    <AddressTraceSteps :address="address" :key="address" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'tokentxns'">
            <v-card>
                <v-card-text>
                    <Address-Token-Transfers
                        :address="address"
                        :key="address" 
                        :erc20-count="patternCount.erc20"
                        :erc721-count="patternCount.erc721"
                        :erc1155-count="patternCount.erc1155"
                    />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'assets'">
            <v-card>
                <v-card-text>
                    <Address-Assets :address="address" :key="address" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'analytics'">
            <AddressAnalytics :address="address" />
        </div>

        <template v-if="contract">
            <div v-if="activeTab === 'code'">
                <Contract-Details v-if="contract" :contract="contract" :key="address" />
            </div>

            <div v-if="activeTab === 'events'">
                <v-card>
                    <v-card-text>
                        <Contract-Logs :address="address" :key="address" />
                    </v-card-text>
                </v-card>
            </div>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

import { formatNumber } from '../lib/utils';

import BaseChipGroup from './base/BaseChipGroup.vue'
import AddressHeader from './AddressHeader.vue';
import AddressTransactionsList from './AddressTransactionsList.vue';
import AddressTokenTransfers from './AddressTokenTransfers.vue';
import AddressTraceSteps from './AddressTraceSteps.vue';
import ContractDetails from './ContractDetails.vue';
import ContractLogs from './ContractLogs.vue';
import AddressAssets from './AddressAssets.vue';
import AddressAnalytics from './AddressAnalytics.vue';

// Props
const props = defineProps(['address']);

// Injected services
const server = inject('$server');

// Store
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const balance = ref(0);
const loadingBalance = ref(true);
const loadingContract = ref(true);
const loadingStats = ref(true);
const contract = ref(null);
const addressTransactionStats = ref({});
const activeTab = ref('transactions');

const totalTransactions = computed(() => {
    if (!addressTransactionStats.value.sent && !addressTransactionStats.value.received) return 0;
    return formatNumber(addressTransactionStats.value.sent + addressTransactionStats.value.received, { short: true });
});

const totalTokenTransfers = computed(() => {
    if (!addressTransactionStats.value.tokenTransferCount) return 0;
    return formatNumber(addressTransactionStats.value.tokenTransferCount, { short: true });
});

const patternCount = computed(() => {
    return {
        erc20: addressTransactionStats.value ? addressTransactionStats.value.erc20_sent + addressTransactionStats.value.erc20_received : 0,
        erc721: addressTransactionStats.value ? addressTransactionStats.value.erc721_sent + addressTransactionStats.value.erc721_received : 0,
        erc1155: addressTransactionStats.value ? addressTransactionStats.value.erc1155_sent + addressTransactionStats.value.erc1155_received : 0
    }
});

const updateTabFromHash = () => {
    const hash = window.location.hash.substring(1);
    const validTabs = ['transactions', 'internaltx', 'tokentxns', 'interactions', 'events', 'analytics'];
    
    if (hash.startsWith('asset')) {
        activeTab.value = 'assets';
    } else if (hash === 'code' || hash === 'readContract' || hash === 'writeContract') {
        activeTab.value = 'code';
        // Pass the specific tab to ContractDetails via URL hash
        window.location.hash = hash;
    } else if (validTabs.includes(hash)) {
        activeTab.value = hash;
    } else {
        activeTab.value = 'transactions';
    }
};

// Methods
const loadContractData = (address) => {
    server.getContract(address)
        .then(({ data }) => contract.value = data)
        .catch(console.log)
        .finally(() => loadingContract.value = false);

    server.getAddressStats(address)
        .then(({ data }) => addressTransactionStats.value = data || {})
        .catch(console.log)
        .finally(() => loadingStats.value = false);
};

// Lifecycle hooks
onMounted(() => {
    // Initialize default tab if none is set
    updateTabFromHash();
    
    // Add event listener for hash changes
    window.addEventListener('hashchange', updateTabFromHash);
    
    server.getNativeTokenBalance(props.address)
        .then(({ data: { balance: balanceValue }}) => balance.value = balanceValue || 0)
        .finally(() => loadingBalance.value = false);
});

onBeforeUnmount(() => {
    // Clean up event listener
    window.removeEventListener('hashchange', updateTabFromHash);
});

// Watchers
watch(() => props.address, (address) => {
    loadContractData(address);
}, { immediate: true });

// Watch for tab changes to update the URL hash
watch(() => activeTab.value, (newTab) => {
    const currentHash = window.location.hash.substring(1);
    if (newTab === 'assets') {
        if (!['asset-tokens', 'asset-nft'].includes(currentHash)) {
            window.location.hash = 'asset-tokens';
        }
    } else if (newTab === 'code') {
        // Don't override readContract/writeContract hashes
        if (!['readContract', 'writeContract', 'code'].includes(currentHash)) {
            window.location.hash = 'code';
        }
    } else if (currentHash !== newTab) {
        window.location.hash = newTab;
    }
});
</script>
