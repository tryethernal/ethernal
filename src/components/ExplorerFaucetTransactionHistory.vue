<template>
    <v-card outlined>
        <v-card-text>
            <v-data-table
                :loading="loading"
                :items="transactions"
                :sort-by="currentOptions.sortBy[0]"
                :must-sort="true"
                :sort-desc="true"
                :server-items-length="transactionCount"
                :headers="headers"
                :footer-props="{
                    itemsPerPageOptions: [10, 25, 100]
                }"
                item-key="transactionHash"
                @update:options="getTransactions">
                <template v-slot:no-data>
                    No transactions yet
                </template>
                <template v-slot:item.transactionHash="{ item }">
                    <Hash-Link :type="'transaction'" :hash="item.transactionHash" />
                </template>
                <template v-slot:item.createdAt="{ item }">
                    <div class="my-2 text-left">
                        {{ moment(item.createdAt) | moment('MM/DD h:mm:ss A') }}<br>
                        <small>{{ moment(item.createdAt).fromNow() }}</small>
                    </div>
                </template>
                <template v-slot:item.address="{ item }">
                    <Hash-Link :type="'address'" :hash="item.address" :withTokenName="true" :withName="true" />
                </template>
                <template v-slot:item.amount="{ item }">
                    {{ item.amount }} {{ tokenSymbol }}
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
import FromWei from '../filters/FromWei.js';
import HashLink from './HashLink.vue';

export default {
    name: 'ExplorerFaucetTransactionHistory',
    props: ['faucetId'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        headers: [
            { text: 'Transaction Hash', value: 'transactionHash', sortable: false },
            { text: 'Timestamp', value: 'createdAt' },
            { text: 'To', value: 'address', sortable: false },
            { text: 'Amount', value: 'amount' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['timestamp'], sortDesc: [true] },
        transactions: [],
        transactionCount: 0,
        loading: false
    }),
    mounted() {
        this.currentOptions = { page: 1, itemsPerPage: 10, sortBy: ['createdAt'], sortDesc: [true] };

        this.pusherUnsubscribe = this.pusher.onNewTransaction(transaction => {
            if (this.publicExplorer.faucet.address == transaction.from)
                this.getTransactions(this.currentOptions);
        }, this, this.address);

    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        moment,
        getTransactions(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc',
                orderBy: this.currentOptions.sortBy[0]
            };

            this.server.getFaucetTransactionHistory(this.publicExplorer.faucet.id, options)
                .then(({ data }) => {
                    this.transactions = data.transactions;
                    this.transactionCount = data.count;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapGetters([
            'publicExplorer'
        ]),
        tokenSymbol() {
            return this.publicExplorer.token || 'ETH';
        }
    }
}
</script>
