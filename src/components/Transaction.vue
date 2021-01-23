<template>
    <v-container>
        <h2 class="text-truncate">Tx {{ transaction.hash }}</h2>
        <v-row class="my-2">
            <v-col cols="5" class="text-truncate">
                <div class="text-overline">From</div>
                <Hash-Link :type="'address'" :hash="transaction.from" :fullHash="true" />
            </v-col>
            <v-col cols="5" class="text-truncate">
                <div class="text-overline">To</div>
                <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" />
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col cols="2">
                <div class="text-overline">Gas Used</div>
                {{ transaction.receipt.gasUsed.toLocaleString() }}
            </v-col>
            <v-col cols="2">
                <div class="text-overline">Gas Price</div>
                {{ transaction.gasPrice | fromWei('gwei') }}
            </v-col>
            <v-col cols="2">
                <div class="text-overline">Cost</div>
                {{ transaction.receipt.gasUsed * transaction.gasPrice | fromWei }}
            </v-col>
            <v-col cols="2">
                <div class="text-overline">Value</div>
                {{ transaction.value | fromWei }}
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col cols="2">
                <div class="text-overline">Block</div>
                <router-link :to="'/block/' + transaction.blockNumber">{{ transaction.blockNumber }}</router-link>
            </v-col>
            <v-col cols="2">
                <div class="text-overline">Gas Limit</div>
                {{ block.gasLimit.toLocaleString() }}
            </v-col>
        </v-row>

        <v-row class="my-2">
            <v-col>
                <h3>Data</h3>
                <Transaction-Data :jsonInterface="jsonInterface" :transaction="transaction" />
            </v-col>
        </v-row>

        <v-row class="my-2">
            <v-col>
                <h3>Events</h3>
                <Transaction-Event v-for="(log, idx) in transaction.receipt.logs" :jsonInterface="jsonInterface" :log="log" :key="idx" />
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import HashLink from './HashLink';
import TransactionData from './TransactionData';
import TransactionEvent from './TransactionEvent';
import FromWei from '../filters/FromWei';

import { ethers } from 'ethers';

export default {
    name: 'Transaction',
    props: ['hash'],
    components: {
        HashLink,
        TransactionData,
        TransactionEvent
    },
    filters: {
        FromWei
    },
    data: () => ({
        contract: {},
        transaction: {
            value: 0,
            gasPrice: 0,
            receipt: {
                gasUsed: 0,
                logs: []
            }
        },
        jsonInterface: null,
        parsedLogsData: [],
        block: {
            gasLimit: 0
        }
    }),
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.$bind('transaction', this.db.collection('transactions').doc(hash));
            }
        },
        transaction: function(transaction) {
            this.$bind('block', this.db.collection('blocks').doc(transaction.blockNumber.toString()));
            this.$bind('contract', this.db.collection('contracts').doc(transaction.to.toString()), this.db.contractSerializer)
                .then(() => this.jsonInterface = new ethers.utils.Interface(this.contract.artifact.abi))
        }
    }
}
</script>
