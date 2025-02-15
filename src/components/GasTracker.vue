<template>
    <v-container fluid>
        <h2 class="text-center text-primary my-6">
            {{ explorerStore.name }} Gas Tracker
        </h2>
        <small class="text-medium-emphasis">Next update in <b class="text-primary">{{ nextRefreshIn / 1000 }}s</b></small>
        <v-row class="pt-2">
            <v-col cols="12" lg="6" class="d-flex flex-column">
                <v-row class="mb-0">
                    <v-col cols="12" sm="12" lg="4">
                        <v-card rounded="lg" class="text-center">
                            <template #title>
                                <v-icon class="mr-2 text-medium-emphasis" size="x-small">mdi-snail</v-icon>
                                <small class="text-medium-emphasis">Slow</small>
                            </template>
                            <v-card-text v-if="totalSlowCost !== null">
                                <span class="text-success text-h5">{{ fromWei(totalSlowCost, 'gwei', 'gwei', false, 2) }}</span>
                                <div class="mt-2">
                                    <small>Base: {{ fromWei(gasStats.baseFeePerGas, 'gwei', 'gwei', false, 2) }} | Priority: {{ fromWei(gasStats.priorityFeePerGas?.slow, 'gwei', 'gwei', false, 2 ) }}</small>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="12" lg="4">
                        <v-card rounded="lg" class="text-center">
                            <template #title>
                                <v-icon class="mr-2 text-medium-emphasis" size="x-small">mdi-speedometer-medium</v-icon>
                                <small class="text-medium-emphasis">Average</small>
                            </template>
                            <v-card-text v-if="totalAverageCost !== null">
                                <span class="text-primary text-h5">{{ fromWei(totalAverageCost, 'gwei', 'gwei', false, 2) }}</span>
                                <div class="mt-2">
                                    <small>Base: {{ fromWei(gasStats.baseFeePerGas, 'gwei', 'gwei', false, 2) }} | Priority: {{ fromWei(gasStats.priorityFeePerGas?.average, 'gwei', 'gwei', false, 2) }}</small>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" sm="12" lg="4">
                        <v-card rounded="lg" class="text-center">
                            <template #title>
                                <v-icon class="mr-2 text-medium-emphasis" size="x-small">mdi-rocket-launch</v-icon>
                                <small class="text-medium-emphasis">Fast</small>
                            </template>
                            <v-card-text v-if="totalFastCost !== null">
                                <span class="text-error text-h5">{{ fromWei(totalFastCost, 'gwei', 'gwei', false, 2) }}</span>
                                <div class="mt-2">
                                    <small>Base: {{ fromWei(gasStats.baseFeePerGas, 'gwei', 'gwei', false, 2) }} | Priority: {{ fromWei(gasStats.priorityFeePerGas?.fast, 'gwei', 'gwei', false, 2) }}</small>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-row class="mt-0">
                    <v-col cols="12" class="pt-0">
                        <v-card class="fill-height">
                            <v-card-title class="text-primary">
                                <small>
                                    Additional Info
                                </small>
                            </v-card-title>
                            <v-card-text>
                                <v-row>
                                    <v-col cols="6" md="6" lg="3">
                                        <v-card color="primary" class="ma-0 pa-0" variant="tonal">
                                            <template #title>
                                                <div class="d-flex flex-column">
                                            <span class="text-caption">LATEST BLOCK</span>
                                            <small>{{ formattedLastBlockNumber }}</small>
                                        </div>
                                            </template>
                                        </v-card>
                                    </v-col>
                                    <v-col cols="6" md="6" lg="3">
                                        <v-card color="primary" class="ma-0 pa-0" variant="tonal">
                                            <template #title>
                                                <div class="d-flex flex-column">
                                            <span class="text-caption">AVG BLOCK TIME</span>
                                            <small>{{ formattedBlockTime }}</small>
                                        </div>
                                            </template>
                                        </v-card>
                                    </v-col>
                                    <v-col cols="6" md="6" lg="3">
                                        <v-card color="primary" class="ma-0 pa-0" variant="tonal">
                                            <template #title>
                                                <div class="d-flex flex-column">
                                            <span class="text-caption">AVG BLOCK SIZE</span>
                                            <small>{{ gasStats.averageBlockSize }}</small>
                                        </div>
                                            </template>
                                        </v-card>
                                    </v-col>
                                    <v-col cols="6" md="6" lg="3">
                                        <v-card color="primary" class="ma-0 pa-0" variant="tonal">
                                            <template #title>
                                                <div class="d-flex flex-column">
                                            <span class="text-caption">AVG UTILIZATION</span>
                                            <small>{{ formattedUtilization }}</small>
                                        </div>
                                            </template>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card>
                    <v-card-text>
                        <v-chip-group class="pt-0 mb-1" v-model="selectedChart" selected-class="text-primary">
                            <v-chip size="small" value="gasPrice">Gas Price</v-chip>
                            <v-chip size="small" value="gasLimit">Gas Limit</v-chip>
                            <v-chip size="small" value="utilization">Utilization</v-chip>
                        </v-chip-group>
                        <MultiLineChart v-if="selectedChart === 'gasPrice'" :xLabels="gasPriceHistory.xLabels" :data="gasPriceHistory.data" tokenSymbol="gwei" :index="0" />
                        <LineChart v-if="selectedChart === 'gasLimit'" :xLabels="gasLimitHistory.xLabels" :data="gasLimitHistory.data" tokenSymbol="gwei" :index="1" />
                        <LineChart v-if="selectedChart === 'utilization'" :xLabels="gasUtilizationRatioHistory.xLabels" :data="gasUtilizationRatioHistory.data" tokenSymbol="%" :index="2" />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12" md="6">
                <GasConsumers />
            </v-col>
            <v-col cols="12" md="6">
                <GasSpender />
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { onMounted, onUnmounted, inject, ref, computed } from 'vue';
import { useTheme } from 'vuetify';
import { formatGwei } from 'viem';
import { useExplorerStore } from '../stores/explorer';

import MultiLineChart from './MultiLineChart.vue';
import LineChart from './LineChart.vue';
import GasConsumers from './GasConsumers.vue';
import GasSpender from './GasSpender.vue';

const explorerStore = useExplorerStore();
const server = inject('$server');
const fromWei = inject('$fromWei');
const theme = useTheme();

const gasStats = ref({});
const nextRefreshIn = ref(10000);
const gasPriceHistory = ref({});
const gasLimitHistory = ref({});
const gasUtilizationRatioHistory = ref({});
const from = ref(new Date(new Date() - 7 * 24 * 3600 * 1000));
const to = ref(new Date());
const selectedChart = ref('gasPrice');
const originalTitle = document.title;

const formattedUtilization = computed(() => {
    return gasStats.value.averageUtilization ? `${(gasStats.value.averageUtilization * 100).toFixed(2)}%` : null;
});

const formattedBlockTime = computed(() => {
    return gasStats.value.averageBlockTime ? `${Math.round(gasStats.value.averageBlockTime * 100) / 100}s` : null;
});

const formattedLastBlockNumber = computed(() => {
    return gasStats.value.latestBlockNumber ? `${gasStats.value.latestBlockNumber.toLocaleString()}` : null;
});

const totalSlowCost = computed(() => {
    if (!gasStats.value.priorityFeePerGas?.slow || !gasStats.value.baseFeePerGas)
        return null;

    return Number(gasStats.value.priorityFeePerGas?.slow) + Number(gasStats.value.baseFeePerGas);
});

const totalAverageCost = computed(() => {
    if (!gasStats.value.priorityFeePerGas?.average || !gasStats.value.baseFeePerGas)
        return null;

    return Number(gasStats.value.priorityFeePerGas?.average) + Number(gasStats.value.baseFeePerGas);
});

const totalFastCost = computed(() => {
    if (!gasStats.value.priorityFeePerGas?.fast || !gasStats.value.baseFeePerGas)
        return null;

    return Number(gasStats.value.priorityFeePerGas?.fast) + Number(gasStats.value.baseFeePerGas);
});

const getLatestGasStats = () => {
    server.getLatestGasStats(1)
        .then(({ data }) => {
            gasStats.value = data;
            if (totalSlowCost.value !== null)
                document.title = `${fromWei(totalSlowCost.value, 'gwei', 'Gwei', false, 2)} | ${explorerStore.name}`;
        });
}

const getGasLimitHistory = () => {
    server.getGasLimitHistory(from.value, to.value)
        .then(({ data }) => {
            gasLimitHistory.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => Number(t.gasLimit)),
            };
        });
}

const getGasUtilizationRatioHistory = () => {
    server.getGasUtilizationRatioHistory(from.value, to.value)
        .then(({ data }) => {
            gasUtilizationRatioHistory.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => Number(t.gasUtilizationRatio)),
            };
        });
}

const getGasPriceHistory = () => {
    server.getGasPriceHistory(from.value, to.value)
        .then(({ data }) => {
            gasPriceHistory.value = {
                xLabels: data.map(t => t.day),
                data: [
                    {
                        label: 'Slow',
                        data: data.map(t => formatGwei(Number(t.slow))),
                        max: data.map(t => formatGwei(Number(t.maxSlow))),
                        min: data.map(t => formatGwei(Number(t.minSlow))),
                        borderColor: theme.current.value.colors.success,
                    },
                    {
                        label: 'Average',
                        data: data.map(t => formatGwei(Number(t.average))),
                        max: data.map(t => formatGwei(Number(t.maxAverage))),
                        min: data.map(t => formatGwei(Number(t.minAverage))),
                        borderColor: theme.current.value.colors.primary,
                    },
                    {
                        label: 'Fast',
                        data: data.map(t => formatGwei(Number(t.fast))),
                        max: data.map(t => formatGwei(Number(t.maxFast))),
                        min: data.map(t => formatGwei(Number(t.minFast))),
                        borderColor: theme.current.value.colors.error,
                    }
                ]
            };
        });
}

const refreshAllStats = () => {
    getLatestGasStats();
    getGasPriceHistory();
    getGasLimitHistory();
    getGasUtilizationRatioHistory();
}

onMounted(async () => {
    refreshAllStats();
    setInterval(() => {
        nextRefreshIn.value -= 1000;
        if (nextRefreshIn.value <= 0) {
            getLatestGasStats();
            nextRefreshIn.value = 10000;
        }
    }, 1000);
});

onUnmounted(() => {
    document.title = originalTitle;
});

</script>
