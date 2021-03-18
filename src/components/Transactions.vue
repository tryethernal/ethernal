<template>
    <v-container fluid>
        <Transactions-List :transactions="transactions" :loading="loading" />
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
        loading: true
    }),
    mounted: function() {
        this.$bind('transactions', this.db.collection('transactions')).then(() => this.loading = false);
    }
}
</script>
