<template>
    <v-container fluid>
        <v-card style="height: 100%">
            <v-card-text>
                <DateRangeSelector @rangeUpdated="rangeUpdated" />
                <v-row>
                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Transaction Volume'" :xLabels="charts['transactionVolume'].xLabels" :data="charts['transactionVolume'].data" :tooltipUnit="'transaction'" :index="0" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'ERC20 Transfer Volume'" :xLabels="charts['erc20TransferVolume'].xLabels" :data="charts['erc20TransferVolume'].data" :tooltipUnit="'transfer'" :index="1" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Average Gas Price'" :xLabels="charts['averageGasPrice'].xLabels" :data="charts['averageGasPrice'].data" :tokenSymbol="'gwei'" :floating="true" :index="2" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Transaction Fees'" :xLabels="charts['transactionFees'].xLabels" :data="charts['transactionFees'].data" :tokenSymbol="currentWorkspaceStore.chain.token || 'ETH'" :floating="true" :index="3" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Average Transaction Fee'" :xLabels="charts['averageTransactionFee'].xLabels" :data="charts['averageTransactionFee'].data" :tokenSymbol="currentWorkspaceStore.chain.token || 'ETH'" :floating="true" :index="3" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Active Wallets Count'" :xLabels="charts['uniqueWalletCount'].xLabels" :data="charts['uniqueWalletCount'].data" :tooltipUnit="'wallet'" :index="4" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Deployed Contracts Count'" :xLabels="charts['deployedContractCount'].xLabels" :data="charts['deployedContractCount'].data" :tooltipUnit="'contract'" :index="6" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Cumulative Deployed Contracts Count'" :xLabels="charts['cumulativeDeployedContractCount'].xLabels" :data="charts['cumulativeDeployedContractCount'].data" :tooltipUnit="'contract'" :index="6" />
                    </v-col>

                    <template v-if="explorerStore.gasAnalyticsEnabled">
                        <v-col cols="12" md="6">
                            <MultiLineChart :title="'Gas Price'" :xLabels="charts['gasPrice'].xLabels" :data="charts['gasPrice'].data" tokenSymbol="gwei" :floating="true" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <Line-Chart :title="'Average Gas Limit'" :xLabels="charts['gasLimit'].xLabels" :data="charts['gasLimit'].data" :tooltipUnit="'gas unit'" :index="7" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <Line-Chart :title="'Gas Utilization Ratio'" :xLabels="charts['gasUtilizationRatio'].xLabels" :data="charts['gasUtilizationRatio'].data" tokenSymbol="%" :yAxisSymbol="'%'" :floating="true" :index="8" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <Line-Chart :title="'Average Block Time'" :xLabels="charts['blockTime'].xLabels" :data="charts['blockTime'].data" tooltipUnit="second" :floating="true" :index="9" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <Line-Chart :title="'Average Block Size'" :xLabels="charts['blockSize'].xLabels" :data="charts['blockSize'].data" tooltipUnit="transaction" :floating="true" :index="10" />
                        </v-col>
                    </template>
                </v-row>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { useTheme } from 'vuetify';
import { formatGwei, formatEther } from 'viem';
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useExplorerStore } from '@/stores/explorer';
import { getBestContrastingColor } from '@/lib/utils';
import LineChart from './LineChart.vue';
import MultiLineChart from './MultiLineChart.vue';
import DateRangeSelector from './DateRangeSelector.vue';

export default {
    name: 'ExplorerAnalytics',
    components: {
        DateRangeSelector,
        LineChart,
        MultiLineChart
    },
    data: () => ({
        charts: {
            transactionVolume: {},
            erc20TransferVolume: {},
            averageGasPrice: {},
            averageTransactionFee: {},
            transactionFees: {},
            uniqueWalletCount: {},
            cumulativeWalletCount: {},
            deployedContractCount: {},
            cumulativeDeployedContractCount: {},
            gasPrice: {},
            gasLimit: {},
            gasUtilizationRatio: {},
            blockTime: {},
            blockSize: {}
        },
        showCustomPicker: false,
        from: null,
        to: null
    }),
    methods: {
        moment,
        rangeUpdated(range) {
            this.from = range.from;
            this.to = range.to;
            this.initAllCharts();
        },
        initAllCharts() {
            this.charts = {
                transactionVolume: {},
                erc20TransferVolume: {},
                averageGasPrice: {},
                averageTransactionFee: {},
                transactionFees: {},
                uniqueWalletCount: {},
                deployedContractCount: {},
                cumulativeDeployedContractCount: {},
                gasPrice: {},
                gasLimit: {},
                gasUtilizationRatio: {},
                blockTime: {},
                blockSize: {}
            }
            this.getTransactionVolume();
            this.getErc20TransferVolume();
            this.getAverageGasPrice();
            this.getAverageTransactionFee();
            this.getTransactionFees();
            this.getUniqueWalletCount();
            this.getDeployedContractCount();
            this.getCumulativeDeployedContractCount();
            if (this.explorerStore.gasAnalyticsEnabled) {
                this.getGasPriceHistory();
                this.getGasLimitHistory();
                this.getGasUtilizationRatioHistory();
                this.getBlockTimeHistory();
                this.getBlockSizeHistory();
            }
        },
        getTransactionFees() {
            this.$server.getTransactionFeeHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['transactionFees'] = {
                        xLabels: data.map(t => t.day),
                        data: data.map(t => t.transactionFees ? formatEther(Number(t.transactionFees)) : null),
                    };
                })
                .catch(console.log);
        },
        getBlockSizeHistory() {
            this.$server.getBlockSizeHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['blockSize'] = {
                        xLabels: data.map(t => t.day),
                        data: data.map(t => t.size ? Number(t.size) : null),
                    };
                })
                .catch(console.log);
        },
        getBlockTimeHistory() {
            this.$server.getBlockTimeHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['blockTime'] = {
                        xLabels: data.map(t => t.day),
                        data: data.map(t => t.blockTime ? Number(t.blockTime) : null),
                    };
                })
                .catch(console.log);
        },
        getGasUtilizationRatioHistory() {
            this.$server.getGasUtilizationRatioHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['gasUtilizationRatio'] = {
                        xLabels: data.map(t => t.day),
                        data: data.map(t => t.gasUtilizationRatio ? Number(t.gasUtilizationRatio) : null),
                    };
                })
                .catch(console.log);
        },
        getGasLimitHistory() {
            this.$server.getGasLimitHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['gasLimit'] = {
                        xLabels: data.map(t => t.day),
                        data: data.map(t => t.gasLimit ? Number(t.gasLimit) : null),
                    };
                })
                .catch(console.log);
        },
        getGasPriceHistory() {
            this.$server.getGasPriceHistory(this.from, this.to)
                .then(({ data }) => {
                    this.charts['gasPrice'] = {
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
                })
                .catch(console.log);
        },
        getTransactionVolume() {
            this.$server.getTransactionVolume(this.from, this.to)
                .then(({ data }) => {
                    this.charts['transactionVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getErc20TransferVolume() {
            this.$server.getTokenTransferVolume(this.from, this.to, null, 'erc20')
                .then(({ data }) => {
                    this.charts['erc20TransferVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getAverageGasPrice() {
            this.$server.getAverageGasPrice(this.from, this.to)
                .then(({ data }) => {
                    this.charts['averageGasPrice'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.avg), 'gwei')))
                    };
                })
                .catch(console.log);
        },
        getAverageTransactionFee() {
            this.$server.getAverageTransactionFee(this.from, this.to)
                .then(({ data }) => {
                    this.charts['averageTransactionFee'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.avg), 'ether')))
                    };
                })
                .catch(console.log);
        },
        getUniqueWalletCount() {
            this.$server.getUniqueWalletCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['uniqueWalletCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getDeployedContractCount() {
            this.$server.getDeployedContractCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['deployedContractCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getCumulativeDeployedContractCount() {
            this.$server.getCumulativeDeployedContractCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['cumulativeDeployedContractCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        }
    },
    watch: {
        selectedTimeRange() {
            this.initAllCharts();
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore, useExplorerStore),
        contrastingColor() {
            const theme = useTheme();
            return getBestContrastingColor('#4242421f', theme.current.value.colors);
        }
    }
}
</script>
