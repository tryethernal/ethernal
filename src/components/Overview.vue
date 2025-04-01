<template>
    <div class="overview">
        <div class="search-hero">
            <div class="search-container">
                <h1 class="text-h5 text-center mb-4">{{ explorerStore.name }} Explorer</h1>
                <SearchBar />
            </div>
        </div>

        <v-container fluid class="stats-container">
            <v-row>
                <v-col cols="12" md="6">
                    <v-card class="white-card">
                        <LineChart :title="'Transaction Volume'" :xLabels="charts.transactionVolume.xLabels" :data="charts.transactionVolume.data" :tooltipUnit="'transaction'" :index="0" />
                    </v-card>
                </v-col>

                <v-col cols="12" md="6">
                    <v-card class="white-card">
                        <LineChart :title="'Active Wallets Count'" :xLabels="charts.uniqueWalletCount.xLabels" :data="charts.uniqueWalletCount.data" :tooltipUnit="'wallet'" :index="4" />
                    </v-card>
                </v-col>
            </v-row>

            <v-row>
                <v-col cols="12" md="6">
                    <v-card class="white-card">
                        <template v-slot:subtitle>
                            <div class="pt-2">Latest Blocks</div>
                        </template>
                        <Block-List :dense="true" class="px-4 pb-4" />
                    </v-card>
                </v-col>

                <v-col cols="12" md="6">
                    <v-card class="white-card">
                        <template v-slot:subtitle>
                            <div class="pt-2">Latest Transactions</div>
                        </template>
                        <Transactions-List :dense="true" class="px-4 pb-4" />
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { ethers } from 'ethers';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';

import TransactionsList from './TransactionsList.vue';
import BlockList from './BlockList.vue';
import LineChart from './LineChart.vue';
import StatNumber from './StatNumber.vue';
import SearchBar from './SearchBar.vue';
const formatUnits = ethers.utils.formatUnits;
const BigNumber = ethers.BigNumber;

// Stores
const currentWorkspaceStore = useCurrentWorkspaceStore();
const explorerStore = useExplorerStore();

// Inject server
const $server = inject('$server');

// Reactive state
const activeWalletCountLoading = ref(false);
const txCountTotalLoading = ref(false);
const txCount24hLoading = ref(false);
const txCount24h = ref(0);
const txCountTotal = ref(0);
const activeWalletCount = ref(0);
const charts = ref({
    transactionVolume: { xLabels: [], data: [] },
    uniqueWalletCount: { xLabels: [], data: [] }
});
const from = ref(new Date(new Date() - 14 * 24 * 3600 * 1000));
const to = ref(new Date());

// Computed properties
const formattedTotalSupply = computed(() => {
    return formatUnits(BigNumber.from(explorerStore.totalSupply), 18).split('.')[0];
});

// Methods
const getActiveWalletCount = () => {
    activeWalletCountLoading.value = true;
    $server.getActiveWalletCount()
        .then(({ data: { count }}) => activeWalletCount.value = count)
        .catch(console.log)
        .finally(() => activeWalletCountLoading.value = false);
};

const getTxCountTotal = () => {
    txCountTotalLoading.value = true;
    $server.getTxCountTotal()
        .then(({ data: { count }}) => txCountTotal.value = count)
        .catch(console.log)
        .finally(() => txCountTotalLoading.value = false);
};

const getTxCount24h = () => {
    txCount24hLoading.value = true;
    $server.getTxCount24h()
        .then(({ data: { count }}) => txCount24h.value = count)
        .catch(console.log)
        .finally(() => txCount24hLoading.value = false);
};

const getTransactionVolume = () => {
    $server.getTransactionVolume(from.value, to.value)
        .then(({ data }) => {
            charts.value.transactionVolume = {
                xLabels: data.map(t => t.date),
                data: data.map(t => parseInt(t.count))
            };
        })
        .catch(console.log);
};

const getWalletVolume = () => {
    $server.getUniqueWalletCount(from.value, to.value)
        .then(({ data }) => {
            charts.value.uniqueWalletCount = {
                xLabels: data.map(t => t.date),
                data: data.map(t => parseInt(t.count))
            };
        })
        .catch(console.log);
};

// Lifecycle hooks
onMounted(() => {
    getActiveWalletCount();
    getTxCountTotal();
    getTxCount24h();
    getTransactionVolume();
    getWalletVolume();
});
</script>

<style scoped>
.overview {
    position: relative;
    margin: -16px -16px 0 -16px;
    width: calc(100% + 32px);
    min-height: 70vh;
    background: linear-gradient(to bottom, 
        rgba(var(--v-theme-primary), 0.95) 0%,
        rgba(var(--v-theme-primary), 0.7) 25%,
        rgba(var(--v-theme-background), 1) 50%
    );
}

.overview::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 70vh;
    background: 
        radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.25) 0%, transparent 35%),
        radial-gradient(circle at 0% 100%, rgba(255, 255, 255, 0.25) 0%, transparent 35%),
        radial-gradient(2em 2em at 20% 20%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 80% 80%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 40% 60%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        radial-gradient(2em 2em at 60% 30%, rgba(var(--v-theme-primary), 0.3) 0%, transparent 100%),
        repeating-linear-gradient(45deg, 
            rgba(255, 255, 255, 0.15) 0%, 
            rgba(255, 255, 255, 0.15) 10px,
            transparent 10px, 
            transparent 20px
        ),
        repeating-linear-gradient(-45deg, 
            rgba(255, 255, 255, 0.15) 0%, 
            rgba(255, 255, 255, 0.15) 10px,
            transparent 10px, 
            transparent 20px
        );
    opacity: 0.8;
    mix-blend-mode: overlay;
    mask-image: linear-gradient(to bottom, black 40%, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 80%);
    pointer-events: none;
}

.search-hero {
    position: relative;
    min-height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.search-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1rem;
    position: relative;
    z-index: 1;
    width: 100%;
}

.search-container h1 {
    margin-bottom: 1.5rem !important;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.stats-container {
    position: relative;
    margin-top: -3rem;
    z-index: 1;
}

.white-card {
    background-color: white !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
}

.white-card :deep(.v-card-subtitle) {
    background-color: white;
}
</style>
