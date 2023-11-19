<template>
    <v-container fluid>
        <template v-if="transaction.hash">
            <v-row>
                <v-col>
                    <v-alert dense text type="warning" class="my-2" v-if="transaction.state == 'syncing'">
                        Transaction has been picked up, and is currently still being processed.
                        Once it's finished, additional data will be displayed here.
                    </v-alert>
                    <h2 class="text-truncate mb-2">Tx {{ transaction.hash }}</h2>
                </v-col>
                <template v-if="!isPublicExplorer">
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
                </template>
            </v-row>
            <v-chip small class="success mr-2" v-show="txStatus == 'succeeded'">
                <v-icon small class="white--text mr-1">mdi-check</v-icon>Transaction Succeeded
            </v-chip>
            <v-chip small class="error mr-2" v-show="txStatus == 'failed'">
                <v-icon small class="white--text mr-1">mdi-alert-circle</v-icon>
                Transaction Failed
            </v-chip>
            <v-chip small class="grey mr-2" v-show="txStatus == 'unknown'">
                <v-icon small class="white--text mr-1">mdi-help-circle</v-icon>
                Unknown Transaction Status
            </v-chip>
            <v-chip small v-if="!transaction.to">
                <v-icon small class="mr-1">mdi-file</v-icon>
                Contract Creation
            </v-chip>
            <v-row class="mt-2" v-if="transaction.parsedError || transaction.rawError">
                <v-col>
                    <div class="text-overline">Error Message</div>
                    <v-card outlined>
                        <v-card-text style="white-space: pre-wrap;" v-if="transaction.parsedError">
                            {{ transaction.parsedError }}
                        </v-card-text>
                        <v-card-text v-else>
                            <b>Couldn't parse error message. Raw data:</b>
                            <div  style="white-space: pre-wrap;" class="mt-1">
                                {{ JSON.stringify(transaction.rawError, null, '\t\t') }}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
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
                    <Hash-Link v-if="transaction.receipt" :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" :withName="true" />
                    <v-chip small class="grey white--text" v-else>
                        Address Not Available
                    </v-chip>
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Gas Used</div>
                    <span v-if="transaction.receipt">{{ parseInt(transaction.receipt.gasUsed).toLocaleString() }}</span>
                    <v-chip small class="grey white--text" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Gas Price</div>
                    {{ transaction.gasPrice | fromWei('gwei', chain.token) }}
                </v-col>
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Cost</div>
                    <span v-if="transaction.receipt">{{ transaction.receipt.gasUsed * transaction.gasPrice | fromWei('ether', chain.token) }}</span>
                    <v-chip small class="grey white--text" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Value</div>
                    {{ transaction.value | fromWei('ether', chain.token) }}
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col lg="8" md="6" sm="12">
                    <v-row>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Block</div>
                            <router-link :to="'/block/' + transaction.blockNumber">{{ transaction.blockNumber }}</router-link>
                        </v-col>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Mined At</div>
                            {{ moment(transaction.block.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                            <small>{{ moment(transaction.block.timestamp).fromNow() }}</small>
                        </v-col>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Gas Limit</div>
                            {{ parseInt(transaction.gasLimit || transaction.block.gasLimit).toLocaleString() }}
                        </v-col>
                        <v-col lg="3" md="6" sm="12" v-for="(field, idx) in transaction.extraFields" :key="idx">
                            <div class="text-overline">{{ field.name }}</div>
                            <Custom-Field :name="field.name" :value="field.value" :type="field.type" :label="field.label" :decimals="field.decimals" :symbol="field.symbol" />
                        </v-col>
                    </v-row>
                </v-col>
            </v-row>

            <v-row class="my-2" v-if="transaction.tokenTransferCount > 0">
                <v-col>
                    <h3 class="mb-2">Token Transfers</h3>
                    <v-card outlined>
                        <v-card-text>
                            <Transaction-Token-Transfers :hash="transaction.hash" :withTokenData="true" />
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-row class="my-2" v-if="Object.keys(transaction.formattedBalanceChanges).length > 0">
                <v-col>
                    <h3 class="mb-2">Balance Changes</h3>
                    <Tokens-Balance-Diff v-for="(token, idx) in Object.keys(transaction.formattedBalanceChanges)"
                        :token="token"
                        :balanceChanges="transaction.formattedBalanceChanges[token]"
                        :blockNumber="transaction.blockNumber"
                        :key="idx" />
                </v-col>
            </v-row>

            <Transaction-Data :transaction="transaction" :withoutStorageHeader="true" />

            <v-row class="my-2" v-if="transaction.traceSteps.length">
                <v-col>
                    <h3 class="mb-2">Trace</h3>
                    <Trace-Step v-for="step in transaction.traceSteps" :step="step" :key="step.id" />
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
const moment = require('moment');
import { mapGetters } from 'vuex';
import HashLink from './HashLink';
import TransactionData from './TransactionData';
import TraceStep from './TraceStep';
import TransactionTokenTransfers from './TransactionTokenTransfers';
import TokensBalanceDiff from './TokensBalanceDiff';
import CustomField from './CustomField';
import FromWei from '../filters/FromWei';

export default {
    name: 'Transaction',
    props: ['hash'],
    components: {
        HashLink,
        TransactionData,
        TraceStep,
        TransactionTokenTransfers,
        TokensBalanceDiff,
        CustomField
    },
    filters: {
        FromWei
    },
    data: () => ({
        contract: null,
        transaction: {
            error: '',
            value: 0,
            gasPrice: 0,
            gasLimit: 0,
            trace: null,
            tokenTransferCount: 0,
            receipt: {
                gasUsed: 0,
                logs: []
            },
            formattedTokenBalanceChanges: {},
            block: {},
            contract: {},
            traceSteps: []
        },
        jsonInterface: null,
        parsedLogsData: [],
        processing: false,
        pusherUnsubscribe: null
    }),
    mounted() {
        this.pusherUnsubscribe = this.pusher.onNewTransaction(data => {
            if (data.hash == this.hash)
                this.loadTransaction(this.hash);
        }, this);
    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) { this.loadTransaction(hash); }
        }
    },
    methods: {
        moment: moment,
        loadTransaction(hash) {
            this.server.getTransaction(hash)
                .then(({ data }) => this.transaction = data)
                .catch(console.log);
        },
        reprocessTransaction: function() {
            this.processing = true
            this.server
                .reprocessTransaction(this.hash)
                .then(() => {
                    if (!this.isPublicExplorer)
                        this.server.processTransaction(this.currentWorkspace, this.transaction)
                            .catch(console.log)
                            .finally(() => this.processing = false);
                    else
                        this.processing = false;
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
            'currentWorkspace',
            'isPublicExplorer',
        ]),
        txStatus() {
            if (!this.transaction.receipt)
                return 'unknown';

            const receipt = this.transaction.receipt;
            if (receipt.status !== null && receipt.status !== undefined)
                return receipt.status ? 'succeeded' : 'failed';

            if (receipt.root && receipt.root != '0x' && parseInt(receipt.cumulativeGasUsed) >= parseInt(receipt.gasUsed))
                return 'succeeded';

            return 'failed';
        }
    }
}
</script>
