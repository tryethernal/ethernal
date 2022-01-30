<template>
    <div v-if="transaction && transaction.hash">
        <div class="text-right" v-if="!withoutStorageHeader">
            <router-link :to="`/transaction/${transaction.hash}`">{{ transaction.hash.slice(0, 15) }}...</router-link>
            <v-divider vertical class="mx-2"></v-divider>
            <router-link :to="`/block/${transaction.blockNumber}`">{{ transaction.blockNumber }}</router-link>
            <v-divider vertical class="ml-2"></v-divider>
            <v-btn @click="reload" icon text class="primary--text">
                <v-icon small class="link">mdi-reload</v-icon>
            </v-btn>
        </div>
        <template v-if="transaction.storage && Object.keys(transaction.storage).length > 0">
            <h4>Storage</h4>
            <v-card outlined>
                <v-card-text>
                    <pre>{{ transaction.storage }}</pre>
                </v-card-text>
            </v-card>
        </template>
        <h4 class="mt-3">Called Function</h4>
        <Transaction-Function-Call :data="transaction.data" :value="transaction.value" :abi="abi" :to="transaction.to" />
        <h4 class="mt-3" v-if="transaction.receipt.logs.length > 0">Emitted Events</h4>
        <Transaction-Event v-for="(log, idx) in transaction.receipt.logs" :log="log" :key="idx" />
    </div>
    <div v-else>
        <i>Select a transaction.</i>
    </div>
</template>
<script>
import TransactionFunctionCall from './TransactionFunctionCall';
import TransactionEvent from './TransactionEvent';

export default {
    name: 'TransactionData',
    props: ['transaction', 'abi', 'withoutStorageHeader'],
    components: {
        TransactionFunctionCall,
        TransactionEvent
    },
    methods: {
        reload: function() {
            if (this.transaction.blockNumber)
                this.$emit('decodeTx', this.transaction);
        }
    }
}
</script>
