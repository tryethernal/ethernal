<template>
    <v-card class="white-card" height="100%">
        <v-card-text>
            <v-row class="stats-grid">
                <v-col cols="12" sm="6" class="stat-item">
                    <StatNumber
                        title="Latest Block"
                        :value="currentWorkspaceStore.currentBlock.number.toLocaleString()"
                        :raw="true"
                        :loading="!currentWorkspaceStore.currentBlock.number"
                        icon="mdi-cube-outline"
                    />
                </v-col>
                <v-col cols="12" sm="6" class="stat-item">
                    <StatNumber
                        title="Total Tx Count"
                        :value="txCountTotal"
                        :loading="txCountTotalLoading"
                    />
                </v-col>
                <v-col cols="12" sm="6" class="stat-item">
                    <StatNumber
                        title="24h Tx Count"
                        :value="txCount24h"
                        :loading="txCount24hLoading"
                    />
                </v-col>
                <v-col cols="12" sm="6" class="stat-item">
                    <StatNumber
                        title="Total Active Wallets Count"
                        infoTooltip="An active wallet is an address that has sent at least one transaction."
                        :value="activeWalletCount"
                        :loading="activeWalletCountLoading"
                    />
                </v-col>
                <v-col cols="12" sm="6" class="stat-item" v-if="explorerStore.totalSupply">
                    <StatNumber
                        title="Total Supply"
                        :raw="true"
                        :value="formattedTotalSupply"
                        :loading="!formattedTotalSupply"
                    />
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import StatNumber from './StatNumber.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';

const currentWorkspaceStore = useCurrentWorkspaceStore();
const explorerStore = useExplorerStore();

const $server = inject('$server');
const $fromWei = inject('$fromWei');

// Reactive state
const activeWalletCount = ref(0);
const activeWalletCountLoading = ref(false);
const txCountTotal = ref(0);
const txCountTotalLoading = ref(false);
const txCount24h = ref(0);
const txCount24hLoading = ref(false);

// Data fetching methods
const getActiveWalletCount = async () => {
    activeWalletCountLoading.value = true;
    try {
        const { data: { count }} = await $server.getActiveWalletCount();
        activeWalletCount.value = count;
    } catch (error) {
        console.error('Error fetching active wallet count:', error);
    } finally {
        activeWalletCountLoading.value = false;
    }
};

const getTxCountTotal = async () => {
    txCountTotalLoading.value = true;
    try {
        const { data: { count }} = await $server.getTxCountTotal();
        txCountTotal.value = count;
    } catch (error) {
        console.error('Error fetching total transaction count:', error);
    } finally {
        txCountTotalLoading.value = false;
    }
};

const getTxCount24h = async () => {
    txCount24hLoading.value = true;
    try {
        const { data: { count }} = await $server.getTxCount24h();
        txCount24h.value = count;
    } catch (error) {
        console.error('Error fetching 24h transaction count:', error);
    } finally {
        txCount24hLoading.value = false;
    }
};

const formattedTotalSupply = computed(() => {
    return $fromWei(explorerStore.totalSupply, 'ether', explorerStore.token);
});

// Initialize data
onMounted(() => {
    getActiveWalletCount();
    getTxCountTotal();
    getTxCount24h();
});
</script>

<style scoped>
.stats-grid {
    padding: 1rem;
}

.stat-item {
    display: flex;
    align-items: stretch;
}

.stat-item :deep(.v-card) {
    width: 100%;
    transition: transform 0.2s ease-in-out;
}

.stat-item :deep(.v-card:hover) {
    transform: translateY(-2px);
}

.white-card {
    background-color: white !important;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
}

.white-card :deep(.v-card-subtitle) {
    background-color: white;
}
</style> 