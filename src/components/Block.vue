<template>
    <v-container fluid>
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
                {{ parseInt(block.timestamp) | moment('YYYY-MM-DD h:mm:ss A') }}
            </v-col>
            <v-divider vertical></v-divider>
            <v-col cols="2">
                <v-subheader class="text-overline">Hash</v-subheader>
                {{ block.hash }}
            </v-col>
        </v-row>
        <h4>Transactions</h4>
        <v-card outlined>
            <Transactions-List :transactions="transactions" :loading="loadingTx" />
        </v-card>
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList';

export default {
    name: 'Block',
    props: ['number'],
    components: {
        TransactionsList
    },
    data: () => ({
        block: {
            gasLimit: 0
        },
        transactions: [],
        contract: {
            abi: {}
        },
        loadingTx: true
    }),
    watch: {
        number: {
            immediate: true,
            handler(number) {
                this.$bind('block', this.db.collection('blocks').doc(number));
                this.$bind('transactions', this.db.collection('transactions').where('blockNumber', '==', parseInt(number))).then(() => this.loadingTx = false);
            }
        }
    }
}
</script>
