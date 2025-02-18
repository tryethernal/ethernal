<template>
    <v-container fluid>
        <h2 class="text-center text-primary my-6">
            {{ explorerStore.name }} Gas Tracker
        </h2>
        <small class="text-medium-emphasis">Next update in <b class="text-primary">{{ nextRefreshIn / 1000 }}s</b></small>
        <v-row class="pt-2" v-if="speedEstimatesAvailable">
            <v-col cols="12" lg="6" class="d-flex flex-column">
                <v-row class="mb-0">
                    <v-col cols="12" sm="12" lg="4">
                        <v-card rounded="lg" class="text-center">
                            <template #title>
                                <v-icon class="mr-2 text-medium-emphasis" size="x-small">mdi-snail</v-icon>
                                <small class="text-medium-emphasis">Slow</small>
                            </template>
                            <v-card-text v-if="totalSlowCost !== null">
                                <span v-tooltip="`${totalSlowCost} wei`" class="text-h5 slow">{{ formatGweiAmount(totalSlowCost) }} gwei</span>
                                <div class="mt-2">
                                    <small>
                                        <span v-tooltip="`${gasStats.baseFeePerGas} wei`">Base: {{ formatGweiAmount(gasStats.baseFeePerGas) }}</span> |
                                        <span v-tooltip="`${gasStats.priorityFeePerGas?.slow} wei`">Priority: {{ formatGweiAmount(gasStats.priorityFeePerGas?.slow) }}</span>
                                    </small>
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
                                <span v-tooltip="`${totalAverageCost} wei`" class="text-h5 average">{{ formatGweiAmount(totalAverageCost) }} gwei</span>
                                <div class="mt-2">
                                    <small>
                                        <span v-tooltip="`${gasStats.baseFeePerGas} wei`">Base: {{ formatGweiAmount(gasStats.baseFeePerGas) }}</span> |
                                        <span v-tooltip="`${gasStats.priorityFeePerGas?.average} wei`">Priority: {{ formatGweiAmount(gasStats.priorityFeePerGas?.average) }}</span>
                                    </small>
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
                                <span v-tooltip="`${totalFastCost} wei`" class="text-h5 fast">{{ formatGweiAmount(totalFastCost) }} gwei</span>
                                <div class="mt-2">
                                    <small>
                                        <span v-tooltip="`${gasStats.baseFeePerGas} wei`">Base: {{ formatGweiAmount(gasStats.baseFeePerGas) }}</span> |
                                        <span v-tooltip="`${gasStats.priorityFeePerGas?.fast} wei`">Priority: {{ formatGweiAmount(gasStats.priorityFeePerGas?.fast) }}</span>
                                    </small>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-row class="mt-0">
                    <v-col cols="12" class="pt-0">
                        <v-card class="fill-height">
                            <v-card-title class="text-primary d-flex justify-space-between">
                                <small>Additional Info</small>
                                <v-icon v-tooltip="'Calculated over the latest 20 blocks'" class="mb-1" size="x-small">mdi-information-outline</v-icon>
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
                                    <small class="ml-4 text-medium-emphasis">Last updated at {{ moment(gasStats.latestBlockTimestamp).format('h:mm:ssa') }}.</small>
                                </v-row>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card>
                    <v-card-text>
                        <v-chip-group mandatory class="pt-0 mb-1" v-model="selectedChart" selected-class="text-primary">
                            <v-chip size="small" value="gasPrice">Gas Price</v-chip>
                            <v-chip size="small" value="gasLimit">Gas Limit</v-chip>
                            <v-chip size="small" value="utilization">Utilization</v-chip>
                        </v-chip-group>
                        <MultiLineChart v-if="selectedChart === 'gasPrice'" :xLabels="gasPriceHistory.xLabels" :data="gasPriceHistory.data" tokenSymbol="gwei" :floating="true" />
                        <LineChart v-if="selectedChart === 'gasLimit'" :xLabels="gasLimitHistory.xLabels" :data="gasLimitHistory.data" tokenSymbol="gwei" />
                        <LineChart v-if="selectedChart === 'utilization'" :xLabels="gasUtilizationRatioHistory.xLabels" :data="gasUtilizationRatioHistory.data" tokenSymbol="%" :floating="true" yAxisSymbol="%" />
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
import moment from 'moment';
import { onMounted, onUnmounted, inject, ref, computed } from 'vue';
import { formatGwei } from 'viem';
import { useExplorerStore } from '../stores/explorer';

import MultiLineChart from './MultiLineChart.vue';
import LineChart from './LineChart.vue';
import GasConsumers from './GasConsumers.vue';
import GasSpender from './GasSpender.vue';

const explorerStore = useExplorerStore();
const server = inject('$server');
const fromWei = inject('$fromWei');

const gasStats = ref({});
const nextRefreshIn = ref(10000);
const gasPriceHistory = ref({});
const gasLimitHistory = ref({});
const gasUtilizationRatioHistory = ref({});
const from = ref(new Date(new Date() - 7 * 24 * 3600 * 1000));
const to = ref(new Date(new Date().setHours(24,0,0,0)));
const selectedChart = ref('gasPrice');
const originalTitle = document.title;

const MINIMUM_DISPLAY_GWEI = 10000000;

const formatGweiAmount = (amount) => {
    if (amount === null || amount === undefined)
        return null;

    else if (amount == 0)
        return '0';
    else if (amount < MINIMUM_DISPLAY_GWEI)
        return `<0.01`;
    else
        return fromWei(amount, 'gwei', ' ', false, 2);
};

const formattedUtilization = computed(() => {
    if (gasStats.value.averageUtilization === null || gasStats.value.averageUtilization === undefined)
        return null;
    else if (gasStats.value.averageUtilization == 0)
        return '0%';
    else if (gasStats.value.averageUtilization < 0.0001)
        return '<0.01%';
    else
        return `${(gasStats.value.averageUtilization * 100).toFixed(2)}%`;
});

const formattedBlockTime = computed(() => {
    return gasStats.value.averageBlockTime !== null && gasStats.value.averageBlockTime !== undefined ? `${Math.round(gasStats.value.averageBlockTime * 100) / 100}s` : null;
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

const speedEstimatesAvailable = computed(() => {
    return gasStats.value.baseFeePerGas !== null && gasStats.value.priorityFeePerGas && Object.keys(gasStats.value.priorityFeePerGas).length > 0;
});

const getLatestGasStats = () => {
    server.getLatestGasStats(1)
        .then(({ data }) => {
            gasStats.value = data;
            if (totalSlowCost.value !== null)
                document.title = `${formatGweiAmount(totalSlowCost.value)} gwei | ${explorerStore.name}`;
        });
}

const getGasLimitHistory = () => {
    server.getGasLimitHistory(from.value, to.value)
        .then(({ data }) => {
            gasLimitHistory.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => t.gasLimit ? Number(t.gasLimit) : null),
            };
        });
}

const getGasUtilizationRatioHistory = () => {
    server.getGasUtilizationRatioHistory(from.value, to.value)
        .then(({ data }) => {
            gasUtilizationRatioHistory.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => t.gasUtilizationRatio ? Number(t.gasUtilizationRatio) : null),
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
                        data: data.map(t => t.slow ? formatGwei(Number(t.slow)) : null),
                        max: data.map(t => t.maxSlow ? formatGwei(Number(t.maxSlow)) : null),
                        min: data.map(t => t.minSlow ? formatGwei(Number(t.minSlow)) : null),
                        borderColor: '#4CAF50',
                    },
                    {
                        label: 'Average',
                        data: data.map(t => t.average ? formatGwei(Number(t.average)) : null),
                        max: data.map(t => t.maxAverage ? formatGwei(Number(t.maxAverage)) : null),
                        min: data.map(t => t.minAverage ? formatGwei(Number(t.minAverage)) : null),
                        borderColor: '#3D95CE',
                    },
                    {
                        label: 'Fast',
                        data: data.map(t => t.fast ? formatGwei(Number(t.fast)) : null),
                        max: data.map(t => t.maxFast ? formatGwei(Number(t.maxFast)) : null),
                        min: data.map(t => t.minFast ? formatGwei(Number(t.minFast)) : null),
                        borderColor: '#E72732',
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
<style scoped>
.slow {
    color: #4CAF50;
}

.average {
    color: #3D95CE;
}

.fast {
    color: #E72732;
}
</style>
