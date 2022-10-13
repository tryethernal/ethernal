<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" sm="6" lg="3" v-if="publicExplorer.totalSupply">
                <Stat-Number :title="'Total Supply'" :value="formattedTotalSupply" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :type="'link'" :title="'Block Height'" :value="commify(currentBlock.number)" :loading="globalStatsLoading" :href="`/blocks/${currentBlock.number}`" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'24h Tx Count'" :value="commify(txCount24h)" :loading="globalStatsLoading" />
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Tx Count'" :value="commify(txCountTotal)" :loading="globalStatsLoading" />
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Total Active Wallets Count'" :value="commify(activeWalletCount)" :loading="globalStatsLoading" :infoTooltip="'An active wallet is an address that has sent at least one transaction.'" />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Daily Transaction Volume (14 Days)</v-card-subtitle>
                    <Line-Chart v-if="!transactionVolumeLoading && charts['transactionVolume14Days'].data" :xLabels="charts['transactionVolume14Days'].xLabels" :data="charts['transactionVolume14Days'].data" :tooltipUnit="'tx'" :index="0" />
                    <v-skeleton-loader v-else type="image" class="pa-2"></v-skeleton-loader>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card outlined class="px-1">
                    <v-card-subtitle>Active Wallets Count (14 days)</v-card-subtitle>
                    <Line-Chart v-if="!walletVolumeLoading && charts['walletVolume14Days'].data" :xLabels="charts['walletVolume14Days'].xLabels" :data="charts['walletVolume14Days'].data" :tooltipUnit="'wallet'" :index="1" />
                    <v-skeleton-loader v-else type="image" class="pa-2"></v-skeleton-loader>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="6">
                <v-card outlined>
                    <v-card-subtitle>Latest Blocks</v-card-subtitle>
                        <v-card-text>
                            <Block-List :dense="true" />
                        </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card outlined>
                    <v-card-subtitle>Latest Transactions</v-card-subtitle>
                        <v-card-text>
                            <Transactions-List
                                :dense="true"
                                :transactions="transactions"
                                :loading="transactionListLoading"
                                @update:options="getTransactions" />
                        </v-card-text>
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
import { mapGetters } from 'vuex';
import router from '../plugins/router';

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
    beforeRouteEnter(to, from, next) {
        if(router.app.$store.getters.isPublicExplorer)
            next();
        else
            router.push({ path: 'transactions' });
    },
    data: () => ({
        globalStatsLoading: false,
        transactionListLoading: false,
        transactionVolumeLoading: false,
        walletVolumeLoading: false,
        transactionVolume: [],
        transactions: [],
        txCount24h: 0,
        txCountTotal: 0,
        activeWalletCount: 0,
        charts: {
            'transactionVolume14Days': {},
            'walletVolume14Days': {}
        },
    }),
    mounted() {
        this.getTransactions();
        this.getGlobalStats();
        this.getTransactionVolume();
        this.getWalletVolume();
        this.pusher.onNewTransaction(() => this.getTransactions(), this);
        this.chart = this.$refs.chart;
    },
    methods: {
        commify: ethers.utils.commify,
        moment: moment,
        getGlobalStats() {
            this.globalStatsLoading = true;
            this.server.getGlobalStats()
                .then(({ data: { txCount24h, txCountTotal, activeWalletCount }}) => {
                    this.txCount24h = txCount24h;
                    this.txCountTotal = txCountTotal;
                    this.activeWalletCount = activeWalletCount;
                })
                .catch(console.log)
                .finally(() => this.globalStatsLoading = false);
        },
        getTransactions() {
            this.transactionListLoading = true;
            this.server.getTransactions({ page: 1, itemsPerPage: 10, order: 'desc' })
                .then(({ data }) => this.transactions = data.items)
                .catch(console.log)
                .finally(() => this.transactionListLoading = false);
        },
        getTransactionVolume() {
            this.transactionVolumeLoading = true;
            const date14daysAgo = moment().subtract(14, 'days').format('YYYY-MM-DD');
            const dateNow = moment().format('YYYY-MM-DD');

            this.server.getTransactionVolume(date14daysAgo, dateNow)
                .then(({ data }) => {
                    this.charts['transactionVolume14Days'] = {
                        xLabels: data.map(t => moment(t.timestamp).format('DD/MM')),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log)
                .finally(() => this.transactionVolumeLoading = false);
        },
        getWalletVolume() {
            this.walletVolumeLoading = true;
            const date14daysAgo = moment().subtract(14, 'days').format('YYYY-MM-DD');
            const dateNow = moment().format('YYYY-MM-DD');

            this.server.getWalletVolume(date14daysAgo, dateNow)
                .then(({ data }) => {
                    this.charts['walletVolume14Days'] = {
                        xLabels: data.map(t => moment(t.timestamp).format('DD/MM')),
                        data: data.map(t => parseInt(t.count))
                    };
                })
                .catch(console.log)
                .finally(() => this.walletVolumeLoading = false);
        }
    },
    computed: {
        ...mapGetters([
            'currentBlock',
            'isPublicExplorer',
            'publicExplorer'
        ]),
        formattedTotalSupply() {
            return this.commify(formatUnits(BigNumber.from(this.publicExplorer.totalSupply), 18)).split('.')[0];
        }
    }
}
</script>
