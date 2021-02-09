<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <h2>Block {{ block.number }}</h2>
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col cols="2">
                <v-subheader class="text-overline">Gas Limit</v-subheader>
                {{ block.gasLimit.toLocaleString() }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col cols="2">
                <v-subheader class="text-overline">Mined On</v-subheader>
                {{ block.timestamp | moment('YYYY-MM-DD hh:mm:ss') }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col cols="2">
                <v-subheader class="text-overline">Hash</v-subheader>
                {{ block.hash }}
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="3">
                <h4>Transactions</h4>
                <Transaction-Picker :transactions="transactions" @selectedTransactionChanged="selectedTransactionChanged" />
            </v-col>
            <v-col cols="9">
                <h4>Data</h4>
                <Transaction-Data v-if="selectedTransaction.hash" :transactionHash="selectedTransaction.hash" :abi="contract.artifact.abi" :key="selectedTransaction.hash" />
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import TransactionPicker from './TransactionPicker';
import TransactionData from './TransactionData';
import FromWei from '../filters/FromWei';

export default {
    name: 'Block',
    props: ['number'],
    components: {
        TransactionPicker,
        TransactionData
    },
    filters: {
        FromWei
    },
    data: () => ({
        block: {
            gasLimit: 0
        },
        transactions: [],
        selectedTransaction: {},
        contract: {
            abi: {}
        }
    }),
    methods: {
        selectedTransactionChanged: function(transaction) {
            if (transaction.to) {
                this.$bind('contract', this.db.collection('contracts').doc(transaction.to), this.db.contractSerializer).then(() => {
                    this.selectedTransaction = transaction;
                })
            }
        },
    },
    watch: {
        number: {
            immediate: true,
            handler(number) {
                this.$bind('block', this.db.collection('blocks').doc(number));
                this.$bind('transactions', this.db.collection('transactions').where('blockNumber', '==', parseInt(number)));
            }
        }
    }
}
</script>
