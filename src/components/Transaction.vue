<template>
    <v-container>
        <h2 class="text-truncate mb-2">Tx {{ transaction.hash }}</h2>
        <v-chip small class="success mr-2" v-if="transaction.receipt.status">
            <v-icon small class="white--text mr-1">mdi-check</v-icon>
            Transaction Succeeded
        </v-chip>
        <v-chip small class="error" v-else>
            <v-icon small class="white--text mr-1">mdi-alert-circle</v-icon>
            Transaction Failed
        </v-chip>
        <v-chip small v-if="!transaction.to">
            <v-icon small class="mr-1">mdi-file</v-icon>
            Contract Creation
        </v-chip>
        <v-row class="my-2">
            <v-col cols="5" class="text-truncate">
                <div class="text-overline">From</div>
                <Hash-Link :type="'address'" :hash="transaction.from" :fullHash="true" />
            </v-col>
            <v-col cols="5" class="text-truncate" v-if="transaction.to">
                <div class="text-overline">To</div>
                <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" />
            </v-col>
            <v-col cols="5" class="text-truncate" v-else>
                <div class="text-overline">Contract Created</div>
                <Hash-Link :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" />
            </v-col>
        </v-row>
        <v-row class="mb-4">
            <v-col cols="2">
                <div class="text-overline">Gas Used</div>
                {{ parseInt(transaction.receipt.gasUsed).toLocaleString() }}
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
                {{ parseInt(block.gasLimit).toLocaleString() }}
            </v-col>
        </v-row>

        <v-row class="my-2">
            <v-col>
                <h3>Data</h3>
                <div v-if="contract && contract.abi">
                    <Transaction-Data :abi="contract.abi" :transactionHash="hash" />
                </div>
                <div v-else class="pa-2 grey lighten-3">
                    <i>Couldn't decode data for this transaction. This probably means that you haven't <a target="_blank" href="https://doc.tryethernal.com/dashboard-pages/contracts/interacting-with-the-contract">synchronized contract metadata</a>. </i>
                </div>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import HashLink from './HashLink';
import TransactionData from './TransactionData';
import FromWei from '../filters/FromWei';

export default {
    name: 'Transaction',
    props: ['hash'],
    components: {
        HashLink,
        TransactionData,
    },
    filters: {
        FromWei
    },
    data: () => ({
        contract: null,
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
                this.$bind('transaction', this.db.collection('transactions').doc(hash)).then(() => {
                    this.$bind('block', this.db.collection('blocks').doc(this.transaction.blockNumber.toString()));
                    if (this.transaction.to) {
                        this.$bind('contract', this.db.collection('contracts').doc(this.transaction.to.toString()), this.db.contractSerializer);
                    }
                })
            }
        }
    }
}
</script>
