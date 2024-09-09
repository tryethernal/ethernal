<template>
    <v-card outlined>
        <v-card-text v-if="transactions.length">
            <v-list three-line>
                <v-list-item-group @change="selectedTransactionChanged" :value="selectedTransaction" active-class="primary--text">
                    <template v-for="(transaction, index) in transactions" :key="transaction.hash">
                        <v-list-item :value="transaction">
                            <v-list-item-content>
                                <v-list-item-title v-text="`${transaction.hash.slice(0, 15)}...`"></v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ parseInt(transaction.timestamp) | moment('MM/DD hh:mm:ss') }} |
                                    {{ transaction.blockNumber }}
                                </v-list-item-subtitle>
                                <v-list-item-subtitle>
                                    {{ signatureForTx(transaction) }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-divider v-if="index < transactions.length - 1" :key="index"></v-divider>
                    </template>
                </v-list-item-group>
            </v-list>
        </v-card-text>
        <v-card-text v-else>
            <i>No transactions here yet.</i>
        </v-card-text>
    </v-card>
</template>
<script>
export default {
    name: 'TransactionPicker',
    props: ['transactions'],
    data: () => ({
        selectedTransaction: {}
    }),
    mounted: function() {
        this.selectedTransaction = this.transactions[0];
        this.selectedTransactionChanged(this.selectedTransaction);
    },
    methods: {
        selectedTransactionChanged: function(transaction) {
            this.$emit('selectedTransactionChanged', transaction || {});
        },
        signatureForTx: function(transaction) {
            if (transaction.methodDetails) {
                return transaction.methodDetails.signature ? transaction.methodDetails.signature : transaction.methodDetails.sighash;
            }
            return null;
        }
    }
}
</script>
