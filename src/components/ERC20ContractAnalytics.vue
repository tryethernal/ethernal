<template>
    <v-card>
        <v-card-text class="pt-2">
            <v-row>
                <v-col cols="12" class="d-flex justify-end ma-0 pb-0">
                    <DateRangeSelector @rangeUpdated="updateCharts" initialRange="30" />
                </v-col>
            </v-row>

            <v-row class="mt-0">
                <v-col cols="12" md="6">
                    <v-skeleton-loader v-if="transferVolumeLoading" type="article"></v-skeleton-loader>
                    <LineChart
                        v-else
                        title="Transfer Volume"
                        :xLabels="charts.transferVolume.xLabels"
                        :data="charts.transferVolume.data"
                        tooltipUnit="transfer"
                        :index="1"
                    />
                </v-col>

                <v-col cols="12" md="6">
                    <v-skeleton-loader v-if="circulatingSupplyLoading" type="article"></v-skeleton-loader>
                    <LineChart
                        v-else
                        title="Circulating Supply"
                        :xLabels="charts.circulatingSupply.xLabels"
                        :data="charts.circulatingSupply.data"
                        :tokenSymbol="tokenSymbol"
                        :index="2"
                    />
                </v-col>

                <v-col cols="12" md="6">
                    <v-skeleton-loader v-if="tokenHolderHistoryLoading" type="article"></v-skeleton-loader>
                    <LineChart
                        v-else
                        title="Token Holder History"
                        :xLabels="charts.tokenHolderHistory.xLabels"
                        :data="charts.tokenHolderHistory.data"
                        tooltipUnit="holder"
                        :index="3"
                    />
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, inject } from 'vue';
import { ethers } from 'ethers';
import LineChart from './LineChart.vue';
import DateRangeSelector from './DateRangeSelector.vue';

// Props
const props = defineProps({
    address: {
        type: String,
        required: true
    },
    tokenDecimals: {
        type: [Number, String],
        default: 18
    },
    tokenSymbol: {
        type: String,
        required: true
    },
    tokenType: {
        type: String,
        required: true
    }
});

// Inject server instance
const $server = inject('$server');

// Loading states for individual charts
const transferVolumeLoading = ref(true);
const circulatingSupplyLoading = ref(true);
const tokenHolderHistoryLoading = ref(true);

// Chart data
const charts = ref({
    transferVolume: {},
    circulatingSupply: {},
    tokenHolderHistory: {}
});

// Methods
const getTransferVolume = async (from, to) => {
    transferVolumeLoading.value = true;
    try {
        const { data } = await $server.getTokenTransferVolume(from, to, props.address);
        charts.value.transferVolume = {
            xLabels: data.map(t => t.date),
            data: data.map(t => parseInt(t.count))
        };
    } catch (error) {
        console.log(error);
    } finally {
        transferVolumeLoading.value = false;
    }
};

const getCirculatingSupply = async (from, to) => {
    circulatingSupplyLoading.value = true;
    try {
        const { data } = await $server.getTokenCirculatingSupply(from, to, props.address);
        charts.value.circulatingSupply = {
            xLabels: data.map(t => t.date),
            data: data.map(t => {
                if (props.tokenType === 'erc20') {
                    return parseFloat(ethers.utils.formatUnits(t.amount, props.tokenDecimals || 'ether'));
                }
                return t.amount;
            })
        };
    } catch (error) {
        console.log(error);
    } finally {
        circulatingSupplyLoading.value = false;
    }
};

const getTokenHolderHistory = async (from, to) => {
    tokenHolderHistoryLoading.value = true;
    try {
        const { data } = await $server.getTokenHolderHistory(from, to, props.address);
        charts.value.tokenHolderHistory = {
            xLabels: data.map(t => t.date),
            data: data.map(t => t.count)
        };
    } catch (error) {
        console.log(error);
    } finally {
        tokenHolderHistoryLoading.value = false;
    }
};

const updateCharts = (range) => {
    getTransferVolume(range.from, range.to);
    getCirculatingSupply(range.from, range.to);
    getTokenHolderHistory(range.from, range.to);
};
</script>
