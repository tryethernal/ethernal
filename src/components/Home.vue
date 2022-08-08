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
                    <v-card-subtitle>Active Wallets Count</v-card-subtitle>
                    <v-card-text class="text-h3" align="center">
                        {{ activeWalletCount }}
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col lg="6" md="12" sm="12">
                <TrendChart
                    :datasets="[
                        {
                            data: transactionVolume,
                            smooth: true,
                            fill: true
                        }
                    ]"
                    :grid="{
                        verticalLines: true,
                        horizontalLines: true
                    }"
                    :labels="{
                        xLabels: xLabels,
                        yLabels: 5
                    }"
                    :min="0">
                </TrendChart>
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
import Vue from "vue";
const moment = require('moment');
import TrendChart from "vue-trend-chart";

Vue.use(TrendChart);
import { mapGetters } from 'vuex';

import TransactionsList from './TransactionsList';
import BlockList from './BlockList';

export default {
    name: 'Home',
    components: {
        TransactionsList,
        BlockList
    },
    data: () => ({
        globalStatsLoading: false,
        transactionListLoading: false,
        transactionVolumeLoading: false,
        transactionVolume: [],
        transactions: [],
        txCount24h: 0,
        txCountTotal: 0,
        activeWalletCount: 0,
        xLabels: []
    }),
    mounted() {
        this.getTransactions();
        this.getGlobalStats();
        this.getTransactionVolume();
        this.pusher.onNewTransaction(() => this.getTransactions(), this);
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
            const tsNow = moment().unix();
            const ts14days = moment().subtract(14, 'days').unix();
            this.server.getTransactionVolume(ts14days, tsNow)
                .then(({ data }) => this.transactionVolume = data)
                .catch(console.log)
                .finally(() => this.transactionVolumeLoading = false);
        }
    },
    watch: {
        transactionVolume() {
            this.xLabels = this.transactionVolume.map(t => moment(new Date(parseInt(t))).format('MM/DD h'))
            this.transactionVolume.map(t => console.log(new Date(t)))
            console.log(this.xLabels)
        }
    },
    computed: {
        ...mapGetters([
            'currentBlock'
        ])
    }
}
</script>
