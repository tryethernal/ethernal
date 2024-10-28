<template>
    <v-container fluid>
        <template v-if="loading">
            <v-row>
                <v-col>
                    <h2 class="text-truncate mb-2">Tx {{ hash }}</h2>
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="4">
                    <v-skeleton-loader class="transparent-skeleton" type="list-item-three-line"></v-skeleton-loader>
                </v-col>
                <v-col cols="4">
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="4">
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-col>
                <v-col cols="4">
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="4">
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-col>
                <v-col cols="4">
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-col>
            </v-row>
        </template>
        <template v-else-if="transaction.hash && !loading">
            <v-row>
                <v-col>
                    <v-alert density="compact" text type="warning" class="my-2" v-if="transaction.state == 'syncing'">
                        Transaction has been picked up by the indexer, and is currently still being processed.
                        Once it's finished, additional data will be displayed.
                    </v-alert>
                    <h2 class="text-truncate mb-2">Tx {{ transaction.hash }}</h2>
                </v-col>
                <template v-if="!explorerStore">
                    <v-spacer></v-spacer>
                    <v-col align="right">
                        <v-progress-circular v-show="processing" indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>
                        <v-menu :location="true ? 'right' : undefined">
                            <template v-slot:activator="{ props }">
                                <v-btn icon v-bind="props">
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
            <v-chip size="small" class="bg-success mr-2" v-show="txStatus == 'succeeded'">
                <v-icon size="small" class="text-white mr-1">mdi-check</v-icon>Transaction Succeeded
            </v-chip>
            <v-chip size="small" class="bg-error mr-2" v-show="txStatus == 'failed'">
                <v-icon size="small" class="text-white mr-1">mdi-alert-circle</v-icon>
                Transaction Failed
            </v-chip>
            <v-chip size="small" class="bg-grey mr-2" v-show="txStatus == 'unknown'">
                <v-icon size="small" class="text-white mr-1">mdi-help-circle</v-icon>
                Unknown Transaction Status
            </v-chip>
            <v-chip size="small" v-if="!transaction.to">
                <v-icon size="small" class="mr-1">mdi-file</v-icon>
                Contract Creation
            </v-chip>
            <v-row class="mt-2" v-if="transaction.parsedError || transaction.rawError">
                <v-col>
                    <div class="text-overline">Error Message</div>
                    <v-card border flat>
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
                    <Hash-Link :type="'address'" :hash="transaction.to" :fullHash="true" :withName="true" :contract="transaction.contract" />
                </v-col>
                <v-col cols="5" class="text-truncate" v-else>
                    <div class="text-overline">Contract Created</div>
                    <Hash-Link v-if="transaction.receipt" :type="'address'" :hash="transaction.receipt.contractAddress" :fullHash="true" :withName="true" />
                    <v-chip size="small" class="bg-grey text-white" v-else>
                        Address Not Available
                    </v-chip>
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col lg="2" md="6" sm="12" v-if="transaction.receipt">
                    <div class="text-overline">Gas Used</div>
                    <span v-if="transaction.receipt">{{ parseInt(transaction.receipt.gasUsed).toLocaleString() }}</span>
                    <v-chip size="small" class="bg-grey text-white" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col lg="2" md="6" sm="12" v-if="transaction.receipt">
                    <div class="text-overline">Gas Price</div>
                    {{ $fromWei(getGasPriceFromTransaction(transaction), 'gwei', currentWorkspaceStore.chain.token) }}
                </v-col>
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Cost</div>
                    <span v-if="transaction.receipt">{{ $fromWei(transaction.receipt.gasUsed * getGasPriceFromTransaction(transaction), 'ether', currentWorkspaceStore.chain.token) }}</span>
                    <v-chip size="small" class="bg-grey text-white" v-else>
                        Not Available
                    </v-chip>
                </v-col>
                <v-col lg="2" md="6" sm="12">
                    <div class="text-overline">Value</div>
                    {{  $fromWei(transaction.value, 'ether', currentWorkspaceStore.chain.token) }}
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col lg="8" md="6" sm="12">
                    <v-row>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Block</div>
                            <router-link style="text-decoration: none;" :to="'/block/' + transaction.blockNumber">{{ commify(transaction.blockNumber) }}</router-link>
                        </v-col>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Mined At</div>
                            {{ $dt.shortDate(transaction.timestamp) }}<br>
                            <small>{{ $dt.fromNow(transaction.timestamp) }}</small>
                        </v-col>
                        <v-col lg="3" md="6" sm="12">
                            <div class="text-overline">Gas Limit</div>
                            {{ parseInt(transaction.gasLimit || transaction.block.gasLimit).toLocaleString() }}
                        </v-col>
                        <v-col v-if="explorerStore && explorerStore.l1Explorer && transaction.block.l1BlockNumber" lg="3" md="6" sm="12">
                            <div class="text-overline">L1 Block</div>
                            <a :href="`${explorerStore.l1Explorer}/block/${transaction.block.l1BlockNumber}`" target="_blank">{{ commify(transaction.block.l1BlockNumber) }}</a>
                        </v-col>
                        <v-col lg="3" md="6" sm="12" v-for="(field, idx) in transaction.extraFields" :key="idx">
                            <div class="text-overline">{{ field.name }}</div>
                            <Custom-Field :name="field.name" :value="field.value" :type="field.type" :label="field.label" :decimals="field.decimals" :symbol="field.symbol" :title="field.title" />
                        </v-col>
                    </v-row>
                </v-col>
            </v-row>

            <v-row class="my-2" v-if="transaction.tokenTransferCount > 0">
                <v-col>
                    <h3 class="mb-2">Token Transfers</h3>
                    <v-card border flat>
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
                    <v-card border flat class="pb-2">
                        <v-card-text class="pt-2">
                            <Trace-Step v-for="step in transaction.traceSteps" :step="step" :key="step.id" />
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else>
            <h2 class="text-truncate mb-2">Tx {{ hash }}</h2>
            <v-row>
                <v-col>
                    Cannot find transaction. If you just sent it, it might not have been picked up yet by our indexer.
                    This page will refresh automatically as soon as we find it.
                </v-col>
            </v-row>
        </template>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
const { getGasPriceFromTransaction } = require('../lib/utils');
import HashLink from './HashLink';
import TransactionData from './TransactionData';
import TraceStep from './TraceStep';
import TransactionTokenTransfers from './TransactionTokenTransfers';
import TokensBalanceDiff from './TokensBalanceDiff';
import CustomField from './CustomField';

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
        pusherUnsubscribe: null,
        loading: false
    }),
    mounted() {
        this.pusherUnsubscribe = this.$pusher.onNewTransaction(data => {
            if (data.hash == this.hash)
                this.loadTransaction(this.hash);
        }, this);
    },
    destroyed() {
        if (this.pusherUnsubscribe)
            this.pusherUnsubscribe();
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) { this.loadTransaction(hash); }
        }
    },
    methods: {
        moment,
        getGasPriceFromTransaction,
        commify: ethers.utils.commify,
        loadTransaction(hash) {
            this.loading = true;
            this.$server.getTransaction(hash)
                .then(({ data }) => this.transaction = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        reprocessTransaction: function() {
            this.processing = true
            this.server
                .reprocessTransaction(this.hash)
                .then(() => {
                    if (!this.explorerStore)
                        this.$server.processTransaction(this.currentWorkspaceStore, this.transaction)
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
        ...mapStores(useExplorerStore, useCurrentWorkspaceStore),
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
<style scoped lang="sass">
.v-skeleton-loader > .v-skeleton-loader__bone
    background: transparent !important
</style>
