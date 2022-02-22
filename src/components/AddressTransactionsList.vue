<template>
    <v-container fluid>
        <Transactions-List
            :transactions="allTransactions"
            :loading="loading"
            :total="transactionCount"
            :currentAddress="address"
            :sortBy="currentOptions.sortBy[0]"
            @pagination="onPagination" />
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList';
import { getPaginatedQuery } from '@/lib/utils';

export default {
    name: 'AddressTransactionsList',
    props: ['address'],
    components: {
        TransactionsList
    },
    data: () => ({
        transactionsFrom: [],
        transactionsTo: [],
        allTransactions: [],
        transactionCount: 0,
        paginationDirection: 1,
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] }
    }),
    mounted: function() {
        this.db.onNewAddressTransactionCount(this.address, (count) => this.transactionCount = count);
        const bindingTxFrom = this.$bind('transactionsFrom',
            this.db.collection('transactions')
                .where('from', '==', this.address)
                .orderBy(this.currentOptions.sortBy[0], this.sortDirection)
                .limit(this.currentOptions.itemsPerPage)
        );
        const bindingTxTo = this.$bind('transactionsTo',
            this.db.collection('transactions')
                .where('to', '==', this.address)
                .orderBy(this.currentOptions.sortBy[0], this.sortDirection)
                .limit(this.currentOptions.itemsPerPage)
        );
        Promise.all([bindingTxFrom, bindingTxTo]).then(() => this.loading = false);
    },
    methods: {
        onPagination: function(options) {
            if (!this.allTransactions.length) return;
            this.loading = true;
            if (options.page < this.currentOptions.page)
                this.paginationDirection = -1;
            else
                this.paginationDirection = 1;
            const queryFrom = getPaginatedQuery(
                this.db.collection('transactions').where('from', '==', this.address),
                this.allTransactions,
                this.currentOptions,
                options
            );
            const queryTo = getPaginatedQuery(
                this.db.collection('transactions').where('to', '==', this.address),
                this.allTransactions,
                this.currentOptions,
                options
            );
            this.$bind('transactionsFrom', queryFrom, { reset: false }).then(() => this.loading = false);
            this.$bind('transactionsTo', queryTo, { reset: false }).then(() => this.loading = false);
            this.currentOptions = options;
        },
        refilterAllTransactions: function() {
            const sortBy = this.currentOptions.sortBy[0];
            const result = [...this.transactionsTo, ...this.transactionsFrom].sort((a, b) => {
                if (this.sortDirection == 'desc')
                    return a[sortBy] >= b[sortBy] ? -1 : 1;
                else
                    return a[sortBy] < b[sortBy] ? -1 : 1;
            });
            if (this.paginationDirection < 0)
                this.allTransactions = result.slice(this.currentOptions.itemsPerPage * -1);
            else
                this.allTransactions = result.slice(0, this.currentOptions.itemsPerPage);
        }
    },
    watch: {
        transactionsTo: { handler: 'refilterAllTransactions' },
        transactionsFrom: { handler: 'refilterAllTransactions' }
    },
    computed: {
        sortDirection: () => this && this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
    }
}
</script>
