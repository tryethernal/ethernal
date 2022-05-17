<template>
    <v-container fluid>
        <Transactions-List
            :transactions="transactions"
            :loading="loading"
            :total="transactionCount"
            :currentAddress="address"
            :sortBy="currentOptions.sortBy[0]"
            @pagination="onPagination"
            @update:options="fetchTransactions" />
    </v-container>
</template>

<script>
const axios = require('axios');
import { mapGetters } from 'vuex';
import TransactionsList from './TransactionsList';

export default {
    name: 'AddressTransactionsList',
    props: ['address'],
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
            this.fetchTransactions(options);
        },
        fetchTransactions: function(options) {
            this.loading = true;
            this.currentOptions = options;
            const sortDirection = this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc';
            axios.get(`http://localhost:8888/api/addresses/${this.address}/transactions?firebaseAuthToken=${this.firebaseIdToken}&firebaseUserId=${this.currentWorkspace.userId}&workspace=${this.currentWorkspace.name}&page=${this.currentOptions.page}&itemsPerPage=${this.currentOptions.itemsPerPage}&order=${sortDirection}`)
                .then(({ data }) => {
                    this.transactions = data.items;
                    this.transactionCount = data.total;
                })
            .catch(console.log)
            .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapGetters([
            'firebaseIdToken',
            'currentWorkspace'
        ])
    }
}
</script>
