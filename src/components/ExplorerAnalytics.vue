<template>
    <v-container fluid>
        <v-card outlined style="height: 100%">
            <v-card-text>
                <v-row>
                    <v-col cols="3" class="pb-0">
                        <v-select @change="initAllCharts" hide-details="true" dense primary outlined label="Time Range" :items="ranges" v-model="selectedTimeRange" item-text="label" item-value="value">
                        </v-select>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Transaction Volume'" :xLabels="charts['transactionVolume'].xLabels" :data="charts['transactionVolume'].data" :tooltipUnit="'transaction'" :index="0" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'ERC20 Transfer Volume'" :xLabels="charts['erc20TransferVolume'].xLabels" :data="charts['erc20TransferVolume'].data" :tooltipUnit="'transfers'" :index="1" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Average Gas Price'" :xLabels="charts['averageGasPrice'].xLabels" :data="charts['averageGasPrice'].data" :tokenSymbol="'gwei'" :floating="true" :index="2" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Average Transaction Fee'" :xLabels="charts['averageTransactionFee'].xLabels" :data="charts['averageTransactionFee'].data" :tokenSymbol="chain.token || 'ETH'" :floating="true" :index="3" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Active Wallets Count'" :xLabels="charts['uniqueWalletCount'].xLabels" :data="charts['uniqueWalletCount'].data" :tooltipUnit="'wallet'" :index="4" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Cumulative Wallets Count'" :xLabels="charts['cumulativeWalletCount'].xLabels" :data="charts['cumulativeWalletCount'].data" :tooltipUnit="'wallet'" :index="5" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Deployed Contracts Count'" :xLabels="charts['deployedContractCount'].xLabels" :data="charts['deployedContractCount'].data" :tooltipUnit="'contract'" :index="6" />
                    </v-col>

                    <v-col cols="12" md="6">
                        <Line-Chart :title="'Cumulative Deployed Contracts Count'" :xLabels="charts['cumulativeDeployedContractCount'].xLabels" :data="charts['cumulativeDeployedContractCount'].data" :tooltipUnit="'contract'" :index="6" />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { mapGetters } from 'vuex';
import LineChart from './LineChart';

export default {
    name: 'ExplorerAnalytics',
    components: {
        LineChart
    },
    data: () => ({
        selectedTimeRange: 14,
        ranges: [
            { label: '14 Days', value: 14 },
            { label: '30 Days', value: 30 },
            { label: 'All Time', value: 0 }
        ],
        charts: {
            transactionVolume: {},
            erc20TransferVolume: {},
            averageGasPrice: {},
            averageTransactionFee: {},
            uniqueWalletCount: {},
            cumulativeWalletCount: {},
            deployedContractCount: {},
            cumulativeDeployedContractCount: {}
        },
    }),
    mounted() {
       this.initAllCharts();
    },
    methods: {
        moment,
        initAllCharts() {
            this.getTransactionVolume();
            this.getErc20TransferVolume();
            this.getAverageGasPrice();
            this.getAverageTransactionFee();
            this.getUniqueWalletCount();
            this.getCumulativeWalletCount();
            this.getDeployedContractCount();
            this.getCumulativeDeployedContractCount();
        },
        getTransactionVolume() {
            this.server.getTransactionVolume(this.from, this.to)
                .then(({ data }) => {
                    this.charts['transactionVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getErc20TransferVolume() {
            this.server.getTokenTransferVolume(this.from, this.to, null, 'erc20')
                .then(({ data }) => {
                    this.charts['erc20TransferVolume'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getAverageGasPrice() {
            this.server.getAverageGasPrice(this.from, this.to)
                .then(({ data }) => {
                    this.charts['averageGasPrice'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.avg), 'gwei')))
                    };
                })
                .catch(console.log);
        },
        getAverageTransactionFee() {
            this.server.getAverageTransactionFee(this.from, this.to)
                .then(({ data }) => {
                    this.charts['averageTransactionFee'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(t.avg), 'ether')))
                    };
                })
                .catch(console.log);
        },
        getUniqueWalletCount() {
            this.server.getUniqueWalletCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['uniqueWalletCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getCumulativeWalletCount() {
            this.server.getCumulativeWalletCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['cumulativeWalletCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getDeployedContractCount() {
            this.server.getDeployedContractCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['deployedContractCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
        getCumulativeDeployedContractCount() {
            this.server.getCumulativeDeployedContractCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['cumulativeDeployedContractCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        }
    },
    computed: {
        ...mapGetters([
            'chain',
        ]),
        from() {
            return this.selectedTimeRange > 0 ? new Date(new Date() - this.selectedTimeRange * 24 * 3600 * 1000) : new Date(0);
        },
        to() {
            return new Date();
        }
    }
}
</script>
