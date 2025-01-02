<template>
    <v-container fluid theme="ethernal">
        <v-row>
            <v-col cols="12" sm="6" lg="3" v-if="explorerStore.totalSupply">
                <Stat-Number :title="'Total Supply'" :value="explorerStore.totalSupply" :long="true" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :type="'link'" :title="'Latest Block'" :value="currentWorkspaceStore.currentBlock.number" :loading="!currentWorkspaceStore.currentBlock.number" :href="`/block/${currentWorkspaceStore.currentBlock.number}`" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'24h Tx Count'" :value="txCount24h" :loading="txCount24hLoading" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Tx Count'" :value="txCountTotal" :loading="txCountTotalLoading" />
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Active Wallets Count'" :value="activeWalletCount" :loading="activeWalletCountLoading" :infoTooltip="'An active wallet is an address that has sent at least one transaction.'" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <Line-Chart :title="'Transaction Volume'" :xLabels="charts['transactionVolume'].xLabels" :data="charts['transactionVolume'].data" :tooltipUnit="'transaction'" :index="0" />
            </v-col>

            <v-col cols="12" md="6">
                <Line-Chart :title="'Active Wallets Count'" :xLabels="charts['uniqueWalletCount'].xLabels" :data="charts['uniqueWalletCount'].data" :tooltipUnit="'wallet'" :index="4" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <v-card>
                    <template v-slot:subtitle>
                        <div class="pt-2">Latest Blocks</div>
                    </template>
                    <Block-List :dense="true" class="px-4 pb-4" />
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card>
                    <template v-slot:subtitle>
                        <div class="pt-2">Latest Transactions</div>
                    </template>
                    <Transactions-List :dense="true" class="px-4 pb-4" />
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
const ethers = require('ethers');
const formatUnits = ethers.utils.formatUnits;
const BigNumber = ethers.BigNumber;
const moment = require('moment');
import { mapStores } from 'pinia';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';

import TransactionsList from './TransactionsList';
import BlockList from './BlockList';
import LineChart from './LineChart';
import StatNumber from './StatNumber';

export default {
    name: 'Overview',
    components: {
        TransactionsList,
        BlockList,
        LineChart,
        StatNumber
    },
    data: () => ({
        activeWalletCountLoading: false,
        txCountTotalLoading: false,
        txCount24hLoading: false,
        transactionListLoading: false,
        txCount24h: 0,
        txCountTotal: 0,
        activeWalletCount: 0,
        charts: {
            transactionVolume: {},
            uniqueWalletCount: {}
        },
        pusherHandler: null,
        from: new Date(new Date() - 14 * 24 * 3600 * 1000),
        to: new Date()
    }),
    mounted() {
        this.getActiveWalletCount();
        this.getTxCountTotal();
        this.getTxCount24h();
        this.getTransactionVolume();
        this.getWalletVolume();
        this.chart = this.$refs.chart;
    },
    methods: {
        moment: moment,
        getActiveWalletCount() {
            this.activeWalletCountLoading = true;
            this.$server.getActiveWalletCount()
                .then(({ data: { count }}) => this.activeWalletCount = count)
                .catch(console.log)
                .finally(() => this.activeWalletCountLoading = false);
        },
        getTxCountTotal() {
            this.txCountTotalLoading = true;
            this.$server.getTxCountTotal()
                .then(({ data: { count }}) => this.txCountTotal = count)
                .catch(console.log)
                .finally(() => this.txCountTotalLoading = false);
        },
        getTxCount24h() {
            this.txCount24hLoading = true;
            this.$server.getTxCount24h()
                .then(({ data: { count }}) => this.txCount24h = count)
                .catch(console.log)
                .finally(() => this.txCount24hLoading = false);
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
        getWalletVolume() {
            this.$server.getUniqueWalletCount(this.from, this.to)
                .then(({ data }) => {
                    this.charts['uniqueWalletCount'] = {
                        xLabels: data.map(t => t.date),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log);
        },
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore, useExplorerStore),
        formattedTotalSupply() {
            return formatUnits(BigNumber.from(this.explorerStore.totalSupply), 18).split('.')[0];
        }
    }
}
</script>
