<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Blocks</h2>
        <v-divider class="my-4"></v-divider>
        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Network Utilization (24h)'" :value="networkUtilization" :loading="loadingNetworkUtilization" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Gas Used (24h)'" :value="totalGasUsed" :loading="loadingTotalGasUsed" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Burnt Fees (24h)'" :value="burntFees" :loading="loadingBurntFees" />
            </v-col>
        </v-row>
        <v-card class="mt-4">
            <v-card-text>
                <Block-List />
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import BlockList from './BlockList.vue';
import StatNumber from './StatNumber.vue';
import { ref, onMounted, inject } from 'vue';
import { displayPercentage } from '../lib/utils';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

defineOptions({
    name: 'Blocks'
});

const $server = inject('$server');
const $fromWei = inject('$fromWei');

const currentWorkspaceStore = useCurrentWorkspaceStore();

const networkUtilization = ref(null);
const totalGasUsed = ref(null);
const burntFees = ref(null);
const loadingNetworkUtilization = ref(true);
const loadingTotalGasUsed = ref(true);
const loadingBurntFees = ref(true);

onMounted(() => {
    $server.getLast24hGasUtilisationRatio()
        .then(({ data: { gasUtilisationRatio24h } }) => networkUtilization.value = displayPercentage(gasUtilisationRatio24h) || '0%')
        .finally(() => loadingNetworkUtilization.value = false);

    $server.getLast24hTotalGasUsed()
        .then(({ data }) => totalGasUsed.value = data.totalGasUsed || 0)
        .finally(() => loadingTotalGasUsed.value = false);

    $server.getLast24hBurntFees()
        .then(({ data }) => burntFees.value = $fromWei(data.burntFees || 0, 'ether', currentWorkspaceStore.chain.token, false, 4))
        .finally(() => loadingBurntFees.value = false);
});
</script>
