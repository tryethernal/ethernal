<template>
    <v-container fluid>
        <Transactions-List :transactions="transactions" />
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
        transactions: []
    }),
    mounted: function() {
        this.$bind('transactions', this.db.collection('transactions'));
    }
}
</script>
