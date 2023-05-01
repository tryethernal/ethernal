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
        pusherHandler: null
    }),
    mounted() {
        this.pusherHandler = this.pusher.onNewBlock(data => {
            if (data.withTransactions > 0)
                this.getTransactions()
        }, this);
    },
    destroyed() {
        this.pusherHandler.unbind(null, null, this);
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
    }
}
</script>
