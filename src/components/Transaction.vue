<template>
    <v-container fluid>
        <template v-if="transaction">
            <v-row>
                <v-col>
                    <h2 class="text-truncate mb-2">Tx {{ transaction.hash }}</h2>
                </v-col>
                <v-spacer></v-spacer>
                <v-col align="right">
                    <v-progress-circular v-show="processing" indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>
                    <v-menu :right="true">
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn icon v-bind="attrs" v-on="on">
                                <v-icon>mdi-dots-vertical</v-icon>
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item :disabled="!transaction.hash || processing" link @click="reprocessTransaction()">Reprocess Transaction</v-list-item>
                        </v-list>
                    </v-menu>
                </v-col>
            </v-row>
            <span v-if="transaction.receipt">
                <v-chip small class="success mr-2" v-if="transaction.receipt.status">
                    <v-icon small class="white--text mr-1">mdi-check</v-icon>
                    Transaction Succeeded
                </v-chip>
                <v-chip small class="error" v-else>
                    <v-icon small class="white--text mr-1">mdi-alert-circle</v-icon>
                    Transaction Failed
                </v-chip>
            </span>
            <div v-else class="mb-1">
                Couldn't not retrieve receipt for this tx. Status and other information might not be available. You can try to resync the block with <code>ethernal sync -f {{ block.number }} -t {{ block.number + 1 }}</code>
            </div>
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
                    <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" :withName="true" />
                </v-col>
                <v-col cols="5" class="text-truncate" v-else>
                    <div class="text-overline">Contract Created</div>
                    <Hash-Link v-if="transaction.receipt" :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" />
                    <v-chip small class="grey white--text" v-else>
                        Address Not Available
                    </v-chip>
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col cols="2">
                    <div class="text-overline">Gas Used</div>
                    <span v-if="transaction.receipt">{{ parseInt(transaction.receipt.gasUsed).toLocaleString() }}</span>
                    <v-chip small class="grey white--text" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col cols="2">
                    <div class="text-overline">Gas Price</div>
                    {{ transaction.gasPrice | fromWei('gwei') }}
                </v-col>
                <v-col cols="2">
                    <div class="text-overline">Cost</div>
                    <span v-if="transaction.receipt">{{ transaction.receipt.gasUsed * transaction.gasPrice | fromWei('ether', chain.token) }}</span>
                    <v-chip small class="grey white--text" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col cols="2">
                    <div class="text-overline">Value</div>
                    {{ transaction.value | fromWei('ether', chain.token) }}
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

            <v-row class="my-2" v-show="transaction.tokenTransfers.length">
                <v-col>
                    <h3 class="mb-2">Token Transfers</h3>
                    <Token-Transfers :transfers="transaction.tokenTransfers" />
                </v-col>
            </v-row>

            <v-row class="my-2" v-show="Object.keys(transaction.tokenBalanceChanges).length">
                <v-col>
                    <h3 class="mb-2">Balance Changes</h3>
                    <Tokens-Balance-Diff v-for="(token, idx) in Object.keys(transaction.tokenBalanceChanges)"
                        class="my-6"
                        :token="token"
                        :balanceChanges="transaction.tokenBalanceChanges[token]"
                        :blockNumber="transaction.blockNumber"
                        :key="idx" />
                </v-col>
            </v-row>

            <v-row v-if="transaction.to">
                <v-col>
                    <Transaction-Data v-if="contract && contract.abi" :abi="contract.abi" :transaction="transaction" :withoutStorageHeader="true" />
                    <v-card v-else outlined>
                        <v-card-text>
                            <i>Couldn't decode data for this transaction. This probably means that you haven't <a target="_blank" href="https://doc.tryethernal.com/dashboard-pages/contracts/interacting-with-the-contract">synchronized contract metadata</a>. </i>
                        </v-card-text>
                    </v-card>
            </v-col>
            </v-row>

            <v-row class="my-2" v-if="transaction.trace">
                <v-col v-if="transaction.trace.length">
                    <h4 class="mb-2">Trace</h4>
                    <Trace-Step v-for="(step, idx) in transaction.trace" :step="step" :key="idx" />
                </v-col>
                <v-col v-else>
                    <h4 class="mb-2">Trace</h4>
                    Empty trace (only CREATE(2) and CALLs are shown).
                </v-col>
            </v-row>
        </template>
        <template v-else>
            <h2 class="text-truncate mb-2">Tx {{ hash }}</h2>
            <v-row>
                <v-col>
                    Cannot find transaction. If it just happened, it might still be in the mempool. Data will automatically appear when available.
                </v-col>
            </v-row>
        </template>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import HashLink from './HashLink';
import TransactionData from './TransactionData';
import TraceStep from './TraceStep';
import TokenTransfers from './TokenTransfers';
import TokensBalanceDiff from './TokensBalanceDiff';
import FromWei from '../filters/FromWei';

export default {
    name: 'Transaction',
    props: ['hash'],
    components: {
        HashLink,
        TransactionData,
        TraceStep,
        TokenTransfers,
        TokensBalanceDiff
    },
    filters: {
        FromWei
    },
    data: () => ({
        contract: null,
        transaction: {
            value: 0,
            gasPrice: 0,
            trace: null,
            receipt: {
                gasUsed: 0,
                logs: []
            },
            tokenTransfers: [],
            tokenBalanceChanges: {}
        },
        jsonInterface: null,
        parsedLogsData: [],
        block: {
            gasLimit: 0
        },
        processing: false
    }),
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.$bind('transaction', this.db.collection('transactions').doc(hash), { serialize: (snapshot) => {
                    const data = snapshot.data();
                    if (!data.tokenTransfers)
                        Object.defineProperty(data, 'tokenTransfers', { value: [] });
                    if (!data.tokenBalanceChanges)
                        Object.defineProperty(data, 'tokenBalanceChanges', { value: {} });

                    return data;
                }},
                { wait: true });
            }
        },
        transaction: function() {
            if (this.transaction && this.transaction.hash) {
                this.$bind('block', this.db.collection('blocks').doc(this.transaction.blockNumber.toString()), { wait: true });
                if (this.transaction.to) {
                    this.$bind('contract', this.db.collection('contracts').doc(this.transaction.to.toLowerCase()), this.db.contractSerializer)
                        .then(() => {
                            if (this.contract && this.contract.proxy)
                                this.$bind('contract', this.db.collection('contracts').doc(this.contract.proxy), this.db.contractSerializer);
                        })
                }
            }
        }
    },
    methods: {
        reprocessTransaction: function() {
            this.processing = true
            this.server
                .processTransaction(this.currentWorkspace.name, this.hash)
                .then(() => {
                    this.server.processTransactions(this.currentWorkspace, [this.transaction])
                        .catch(console.log)
                        .finally(() => this.processing = false);
                })
                .catch((error) => {
                    console.log(error);
                    this.processing = false;
                });
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'chain',
            'currentWorkspace'
        ])
    }
}
</script>
