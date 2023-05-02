<template>
    <v-container fluid>
        <Transactions-List
            :transactions="transactions"
            :loading="loading"
            :sortBy="currentOptions.sortBy[0]"
            :count="transactionCount"
            @pagination="onPagination"
            @update:options="getTransactions" />
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList';

export default {
    name: 'Transactions',
    components: {
        TransactionsList
    },
    data: () => ({
        transactions: [],
        transactionCount: 0,
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] },
        pusherUnsubscribe: null,
    }),
    mounted() {
        this.pusherUnsubscribe = this.pusher.onNewTransaction(transaction => {
            if (this.hashes(transaction.state).indexOf(transaction.hash) == -1)
                this.getTransactions(this.currentOptions);
        }, this, this.address);
    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        onPagination(options) {
            this.getTransactions(options);
        },
        getTransactions(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };

            this.server.getTransactions(options)
                .then(({ data }) => {
                    this.transactions = data.items;
                    this.transactionCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        hashes(state) {
            return this.transactions
                .filter(t => t.state == state)
                .map(t => t.hash)
        }
    },
}
</script>
