<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">Transactions</h2>
        <v-divider class="my-4"></v-divider>
        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Transactions (24h)'" :value="txCount24h" :loading="txCount24hLoading" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Network Transactions Fees (24h)'" :value="networkTxFees24h" :loading="networkTxFees24hLoading" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Avg Transaction Fee (24h)'" :value="avgTxFee24h" :loading="avgTxFee24hLoading" />
            </v-col>
        </v-row>
        <v-card class="mt-4">
            <v-card-text>
                <Transactions-List></Transactions-List>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { DateTime } from 'luxon';
import TransactionsList from './TransactionsList.vue';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import StatNumber from './StatNumber.vue';
import { ref, onMounted, inject } from 'vue';

const currentWorkspaceStore = useCurrentWorkspaceStore();

// Inject the $server plugin and $fromWei directive
const $server = inject('$server');
const $fromWei = inject('$fromWei');

// Refs for transaction count
const txCount24h = ref(0);
const txCount24hLoading = ref(true);

// Refs for network transaction fees
const networkTxFees24h = ref(0);
const networkTxFees24hLoading = ref(true);

// Refs for average transaction fee
const avgTxFee24h = ref(0);
const avgTxFee24hLoading = ref(true);

// Function to fetch transaction count for the last 24h
const fetchTxCount24h = () => {
    txCount24hLoading.value = true;
    return $server.getTxCount24h()
        .then(response => txCount24h.value = response.data.count || 0)
        .catch(() => txCount24h.value = '-')
        .finally(() => txCount24hLoading.value = false);
};

// Function to fetch network transaction fees for the last 24h
const fetchNetworkTxFees24h = () => {
    networkTxFees24hLoading.value = true;
    
    // Calculate 24h ago timestamp
    const now = DateTime.now().toISO();
    const oneDayAgo = DateTime.now().minus({ days: 1 }).toISO();
    
    // Use getTransactionVolume which provides fee data
    return $server.getLast24hTransactionFee()
        .then(({ data: { transactionFee24h} }) => networkTxFees24h.value = transactionFee24h ? $fromWei(transactionFee24h, 'ether', currentWorkspaceStore.chain.token, false, 4) : '-')
        .catch(() => networkTxFees24h.value = '-')
        .finally(() => networkTxFees24hLoading.value = false);
};

// Function to fetch average transaction fee for the last 24h
const fetchAvgTxFee24h = () => {
    avgTxFee24hLoading.value = true;
    
    // Calculate 24h ago timestamp
    const now = DateTime.now().toISO();
    const oneDayAgo = DateTime.now().minus({ days: 1 }).toISO();
    
    // Use the getAverageTransactionFee method available in server.js
    return $server.getLast24hAverageTransactionFee()
        .then(({ data: { avgTransactionFee24h} }) => avgTxFee24h.value = avgTransactionFee24h ? $fromWei(avgTransactionFee24h, 'ether', currentWorkspaceStore.chain.token, false, 4) : '-')
        .catch(() => avgTxFee24h.value = '-')
        .finally(() => avgTxFee24hLoading.value = false);
};

onMounted(() => {
    // Fetch all data in parallel
    Promise.all([
        fetchTxCount24h(),
        fetchNetworkTxFees24h(),
        fetchAvgTxFee24h()
    ]);
});
</script>
