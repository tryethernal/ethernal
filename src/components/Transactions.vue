<template>
    <v-container fluid>
        <Transactions-List
            :transactions="transactions"
            :loading="loading"
            :total="transactionCount"
            :sortBy="currentOptions.sortBy[0]"
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
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] }
    }),
    methods: {
        onPagination: function(options) {
            this.getTransactions(options);
        },
        getTransactions: function(newOptions) {
            this.loading = true;
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
