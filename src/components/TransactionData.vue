<template>
    <v-card outlined>
        <v-card-text v-if="transaction">
            <div class="text-right">
                <router-link :to="`/transaction/${transaction.hash}`">{{ transaction.hash.slice(0, 15) }}...</router-link>
                <v-divider vertical class="mx-2"></v-divider>
                <router-link :to="`/block/${transaction.blockNumber}`">{{ transaction.blockNumber }}</router-link>
                <v-divider vertical class="ml-2"></v-divider>
                <v-btn @click="reload" icon text class="primary--text">
                    <v-icon small class="link">mdi-reload</v-icon>
                </v-btn>
            </div>
            <pre>{{ transaction.storage }}</pre>
            <Transaction-Function-Call class="my-1" :data="transaction.data" :value="transaction.value" :abi="abi" :to="transaction.to" />
            <Transaction-Event v-for="(log, idx) in filteredLogs" :abi="abi" :log="log" :key="idx" />
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
    props: ['transaction', 'abi'],
    components: {
        TransactionFunctionCall,
        TransactionEvent
    },
    data: () => ({
        keyStorage: 0,
        jsonInterface: null
    }),
    mounted: function() {
        if (this.abi) {
            this.jsonInterface = new ethers.utils.Interface(this.abi);
        }
    },
    methods: {
        reload: function() {
            if (this.transaction.blockNumber)
                this.$emit('decodeTx', this.transaction);
        }
    },
    computed: {
        filteredLogs: function() {
            if (!this.transaction || !this.transaction.receipt.logs) return [];
            return this.transaction.receipt.logs.filter(log => log.address.toLowerCase() == this.transaction.to.toLowerCase());
        }
    }
}
</script>
