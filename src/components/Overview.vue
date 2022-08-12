<template>
    <v-container fluid>
        <v-row>
            <v-col lg="2" md="6" sm="12">
                <v-card outlined>
                    <v-card-subtitle>Block Height</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        <router-link style="text-decoration: none;" :to="'/block/' + currentBlock.number">{{ currentBlock.number }}</router-link>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col lg="2" md="6" sm="12">
                <v-card outlined>
                    <v-card-subtitle>24h Tx Count</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        {{ txCount24h }}
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col lg="2" md="6" sm="12">
                <v-card outlined>
                    <v-card-subtitle>Total Tx Count</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        {{ txCountTotal }}
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col lg="2" md="6" sm="12">
                <v-card outlined>
                    <v-card-subtitle>Total Active Wallets Count</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        {{ activeWalletCount }}
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col lg="6" md="12" sm="12">
                <h5>Daily Transaction Volume (14 Days)</h5>
                <Line-Chart v-if="charts['transactionVolume14Days'].data" :xLabels="charts['transactionVolume14Days'].xLabels" :data="charts['transactionVolume14Days'].data" :tooltipUnit="'tx'" :index="0" />
            </v-col>

            <v-col lg="6" md="12" sm="12">
                <h5>Active Wallets Count (14 days)</h5>
                <Line-Chart v-if="charts['walletVolume14Days'].data" :xLabels="charts['walletVolume14Days'].xLabels" :data="charts['walletVolume14Days'].data" :tooltipUnit="'wallet'" :index="1" />
            </v-col>
        </v-row>

        <v-row>
            <v-col lg="6" md="12" sm="12">
                <v-card outlined>
                    <v-card-subtitle>Latest Blocks</v-card-subtitle>
                        <v-card-text>
                            <Block-List :light="true" />
                        </v-card-text>
                </v-card>
            </v-col>

            <v-col lg="6" md="12" sm="12">
                <v-card outlined>
                    <v-card-subtitle>Latest Transactions</v-card-subtitle>
                        <v-card-text>
                            <Transactions-List
                                :transactions="transactions"
                                :loading="transactionListLoading"
                                :light="true"
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
            this.globalStatsLoading = false;
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
            const date14daysAgo = moment().subtract(14, 'months').format('YYYY-MM-DD');
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
            const date14daysAgo = moment().subtract(14, 'months').format('YYYY-MM-DD');
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
            'currentBlock'
        ])
    }
}
</script>
