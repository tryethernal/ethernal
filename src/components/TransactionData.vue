<template>
    <v-card outlined>
        <v-card-text v-if="transactionHash">
            <pre>{{ transaction.storage }}</pre>
            <Transaction-Function-Call class="my-1" :jsonInterface="jsonInterface" :transaction="transaction"  />
            <Transaction-Event v-for="(log, idx) in transaction.receipt.logs" :jsonInterface="jsonInterface" :log="log" :key="idx" />
        </v-card-text>
        <v-card-text v-else>
            <i>Select a transaction.</i>
        </v-card-text>
    </v-card>
</template>
<script>
import { ethers } from 'ethers';

import TransactionFunctionCall from './TransactionFunctionCall';
import TransactionEvent from './TransactionEvent';

export default {
    name: 'TransactionData',
    props: ['transactionHash', 'abi'],
    components: {
        TransactionFunctionCall,
        TransactionEvent
    },
    data: () => ({
        keyStorage: 0,
        jsonInterface: null,
        transaction: {
            receipt: {}
        }
    }),
    mounted: function() {
        this.$bind('transaction', this.db.collection('transactions').doc(this.transactionHash)).then(() => {
            if (this.abi) {
                this.jsonInterface = new ethers.utils.Interface(this.abi);
            }
        })
    }
}
</script>
