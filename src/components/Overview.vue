<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <v-card outlined>
                    <v-card-subtitle>Block Height</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        <router-link v-if="!globalStatsLoading" style="text-decoration: none;" :to="'/block/' + currentBlock.number">{{ currentBlock.number }}</router-link>
                        <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <v-card outlined>
                    <v-card-subtitle>24h Tx Count</v-card-subtitle>
                    <v-card-text v-if="!globalStatsLoading" class="text-h3" align="center">
                        {{ txCount24h }}
                    </v-card-text>
                    <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <v-card outlined>
                    <v-card-subtitle>Total Tx Count</v-card-subtitle>
                    <v-card-text v-if="!globalStatsLoading" class="text-h3" align="center">
                        {{ txCountTotal }}
                    </v-card-text>
                    <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                </v-card>
            </v-col>

            <v-col cols="12" sm="6" lg="3">
                <v-card outlined>
                    <v-card-subtitle>
                        <div style="position: absolute;">Total Active Wallets Count</div>
                        <div class="text-right">
                            <v-tooltip left>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" small>mdi-information</v-icon>
                                </template>
                                An active wallet is an address that has sent at least one transaction.
                            </v-tooltip>
                        </div>
                    </v-card-subtitle>
                    <v-card-text v-if="!globalStatsLoading" class="text-h3" align="center">
                        {{ activeWalletCount }}
                    </v-card-text>
                    <v-skeleton-loader v-else type="list-item"></v-skeleton-loader>
                </v-card>
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
const moment = require('moment');
import { mapGetters } from 'vuex';
import router from '../plugins/router';

import TransactionsList from './TransactionsList';
import BlockList from './BlockList';
import LineChart from './LineChart';

export default {
    name: 'Overview',
    components: {
        TransactionsList,
        BlockList,
        LineChart
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
            'isPublicExplorer'
        ])
    }
}
</script>
