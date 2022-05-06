<template>
    <v-container fluid>
        <Transactions-List
            :transactions="transactions"
            :loading="loading"
            :sortBy="currentOptions.sortBy[0]"
            @pagination="onPagination" />
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList';
import { getPaginatedQuery } from '@/lib/utils';

export default {
    name: 'Transactions',
    components: {
        TransactionsList
    },
    data: () => ({
        transactions: [],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] }
    }),
    mounted: function() {
        const sortDirection = this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc';
        this.$bind('transactions',
            this.db.collection('transactions')
                .orderBy(this.currentOptions.sortBy[0], sortDirection)
                .limit(this.currentOptions.itemsPerPage)
        ).then(() => this.loading = false);
    },
    methods: {
        onPagination: function(options) {
            if (!this.transactions.length) return;
            this.loading = true;
            const query = getPaginatedQuery(
                this.db.collection('transactions'),
                this.transactions,
                this.currentOptions,
                options
            );
            this.$bind('transactions', query, { reset: false }).then(() => this.loading = false);
            this.currentOptions = options;
        }
    }
}
</script>
