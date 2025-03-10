<template>
    <v-container fluid theme="ethernal">
        <v-row>
            <v-col cols="12" sm="6" lg="3" v-if="explorerStore.totalSupply">
                <Stat-Number :title="'Total Supply'" :value="explorerStore.totalSupply" :long="true" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :type="'link'" :title="'Latest Block'" :value="currentWorkspaceStore.currentBlock.number" :loading="!currentWorkspaceStore.currentBlock.number" :href="`/block/${currentWorkspaceStore.currentBlock.number}`" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'24h Tx Count'" :value="txCount24h" :loading="txCount24hLoading" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Tx Count'" :value="txCountTotal" :loading="txCountTotalLoading" />
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Active Wallets Count'" :value="activeWalletCount" :loading="activeWalletCountLoading" :infoTooltip="'An active wallet is an address that has sent at least one transaction.'" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <LineChart :title="'Transaction Volume'" :xLabels="charts.transactionVolume.xLabels" :data="charts.transactionVolume.data" :tooltipUnit="'transaction'" :index="0" />
            </v-col>

            <v-col cols="12" md="6">
                <LineChart :title="'Active Wallets Count'" :xLabels="charts.uniqueWalletCount.xLabels" :data="charts.uniqueWalletCount.data" :tooltipUnit="'wallet'" :index="4" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <v-card>
                    <template v-slot:subtitle>
                        <div class="pt-2">Latest Blocks</div>
                    </template>
                    <Block-List :dense="true" class="px-4 pb-4" />
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card>
                    <template v-slot:subtitle>
                        <div class="pt-2">Latest Transactions</div>
                    </template>
                    <Transactions-List :dense="true" class="px-4 pb-4" />
                </v-card>
            </v-col>
        </v-row>
    </v-container>
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
