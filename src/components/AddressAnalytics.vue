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
                    <v-skeleton-loader v-if="transactionHistoryLoading" type="article"></v-skeleton-loader>
                    <LineChart
                        v-else
                        title="Transactions"
                        :data="transactionHistory.data"
                        :xLabels="transactionHistory.xLabels"
                        tooltipUnit="Transaction"
                    />
                </v-col>
                <v-col cols="12" md="6">
                    <v-skeleton-loader v-if="transactionFeesLoading" type="article"></v-skeleton-loader>
                    <LineChart
                        v-else
                        title="Transaction Fees"
                        :data="transactionFees.data"
                        :xLabels="transactionFees.xLabels"
                        :tokenSymbol="currentWorkspaceStore.chain.token || 'ETH'"
                        floating
                    />
                </v-col>
                
                <v-col cols="12" md="6">
                    <v-skeleton-loader v-if="tokenTransfersLoading" type="article"></v-skeleton-loader>
                    <MultiLineChart
                        v-else
                        title="Token Transfers"
                        :data="tokenTransfers.data"
                        :xLabels="tokenTransfers.xLabels"
                        tooltipUnit="transfer"
                    />
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, inject } from 'vue';
import { ethers } from 'ethers';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import DateRangeSelector from './DateRangeSelector.vue';
import LineChart from './LineChart.vue';
import MultiLineChart from './MultiLineChart.vue';
const props = defineProps({
    address: {
        type: String,
        required: true
    }
});

// Store
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Inject server
const server = inject('$server');

// Data refs
const transactionHistory = ref({});
const transactionFees = ref({});
const tokenTransfers = ref({});

// Loading states for individual charts
const transactionHistoryLoading = ref(true);
const transactionFeesLoading = ref(true);
const tokenTransfersLoading = ref(true);

// Functions to fetch data for each chart
const fetchTransactionHistory = (from, to) => {
    transactionHistoryLoading.value = true;
    return server.getAddressTransactionHistory(props.address, from, to)
        .then(({ data }) => {
            transactionHistory.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => t.count ? Number(t.count) : null),
            };
        })
        .finally(() => transactionHistoryLoading.value = false);
};

const fetchTransactionFees = (from, to) => {
    transactionFeesLoading.value = true;
    return server.getAddressSpentTransactionFeeHistory(props.address, from, to)
        .then(({ data }) => {
            transactionFees.value = {
                xLabels: data.map(t => t.day),
                data: data.map(t => parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.transaction_fees), 'ether'))),
            };
        })
        .finally(() => transactionFeesLoading.value = false);
};

const fetchTokenTransfers = (from, to) => {
    tokenTransfersLoading.value = true;
    return server.getAddressTokenTransferHistory(props.address, from, to)
        .then(({ data }) => {
            tokenTransfers.value = {
                xLabels: data.map(t => t.day),
                data: [
                    {
                        label: 'Tokens Sent',
                        data: data.map(t => t.from_count),
                        borderColor: '#4CAF50',
                    },
                    {
                        label: 'Tokens Received',
                        data: data.map(t => t.to_count),
                        borderColor: '#3D95CE',
                    }
                ],
            };
        })
        .finally(() => tokenTransfersLoading.value = false);
};

// Update all charts
const updateCharts = (range) => {
    fetchTransactionHistory(range.from, range.to);
    fetchTransactionFees(range.from, range.to);
    fetchTokenTransfers(range.from, range.to);
};
</script> 
