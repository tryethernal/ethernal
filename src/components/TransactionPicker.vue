<template>
    <v-card border flat>
        <v-card-text v-if="transactions.length">
            <v-list lines="three" v-model="selectedTransaction">
                <div v-for="(transaction, index) in transactions" :key="transaction.hash">
                    <v-list-item :value="transaction">

                            <v-list-item-title v-text="`${transaction.hash.slice(0, 15)}...`"></v-list-item-title>
                            <v-list-item-subtitle>
                                {{ parseInt(transaction.timestamp) | moment('MM/DD hh:mm:ss') }} |
                                {{ transaction.blockNumber }}
                            </v-list-item-subtitle>
                            <v-list-item-subtitle>
                                {{ signatureForTx(transaction) }}
                            </v-list-item-subtitle>

                    </v-list-item>
                    <v-divider v-if="index < transactions.length - 1" :key="index"></v-divider>
                </div>
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
    mounted() {
        this.selectedTransaction = this.transactions[0];
        this.selectedTransactionChanged(this.selectedTransaction);
    },
    methods: {
        signatureForTx(transaction) {
            if (transaction.methodDetails) {
                return transaction.methodDetails.signature ? transaction.methodDetails.signature : transaction.methodDetails.sighash;
            }
            return null;
        }
    },
    watch: {
        selectedTransaction() {
            this.$emit('selectedTransactionChanged', this.selectedTransaction);
        }
    }
}
</script>
