<template>
    <v-card class="bg-surface" height="100%">
        <v-card-text>
            <BaseChipGroup v-model="selectedChart" mandatory>
                <v-chip size="small" value="transactions">Transaction Volume</v-chip>
                <v-chip size="small" value="wallets">Active Wallets</v-chip>
            </BaseChipGroup>
            <LineChart 
                v-if="selectedChart === 'transactions'"
                :title="'Transaction Volume'" 
                :xLabels="charts.transactionVolume.xLabels" 
                :data="charts.transactionVolume.data" 
                :tooltipUnit="'transaction'" 
                :index="0" 
            />
            <LineChart 
                v-if="selectedChart === 'wallets'"
                :title="'Active Wallets Count'" 
                :xLabels="charts.uniqueWalletCount.xLabels" 
                :data="charts.uniqueWalletCount.data" 
                :tooltipUnit="'wallet'" 
                :index="4" 
            />
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import LineChart from './LineChart.vue';
import BaseChipGroup from './base/BaseChipGroup.vue';

// Inject server
const $server = inject('$server');

// Reactive state
const selectedChart = ref('transactions');
const charts = ref({
    transactionVolume: { xLabels: [], data: [] },
    uniqueWalletCount: { xLabels: [], data: [] }
});
const from = ref(new Date(new Date() - 14 * 24 * 3600 * 1000));
const to = ref(new Date());

// Methods
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
    getTransactionVolume();
    getWalletVolume();
});
</script>

<style scoped>
.bg-surface {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
}
</style> 