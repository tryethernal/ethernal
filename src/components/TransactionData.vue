<template>
    <v-card outlined>
        <v-card-text>
            <pre>{{ transaction.storage }}</pre>
            <Transaction-Function-Call class="my-1" :jsonInterface="jsonInterface" :transaction="transaction"  />
            <Transaction-Event v-for="(log, idx) in transaction.receipt.logs" :jsonInterface="jsonInterface" :log="log" :key="idx" />
        </v-card-text>
    </v-card>
</template>
<script>
import { ethers } from 'ethers';

import TransactionFunctionCall from './TransactionFunctionCall';
import TransactionEvent from './TransactionEvent';

export default {
    name: 'TransactionData',
    props: ['transaction', 'abi'],
    components: {
        TransactionFunctionCall,
        TransactionEvent
    },
    data: () => ({
        jsonInterface: null
    }),
    mounted: function() {
        this.jsonInterface = new ethers.utils.Interface(this.abi);
    }
}
</script>
