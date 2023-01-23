<template>
    <v-container fluid>
        <v-row class="mb-1">
            <v-col cols="12" lg="5" v-if="contract">
                <v-card outlined style="height: 100%">
                    <v-card-title v-if="contract.name">{{ contract.name }}</v-card-title>
                    <v-card-subtitle v-if="contract.patterns.length > 0">
                        <v-chip v-for="(pattern, idx) in contract.patterns" :key="idx" x-small class="success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </v-card-subtitle>
                    <v-card-text>
                        <v-row>
                            <v-col v-if="isErc20 || isErc721" cols="6">
                                <small>Token Name</small><br>
                                <span class="ml-2">
                                    <Hash-Link :type="'token'" :hash="contract.address" :withName="true" :withTokenName="true" />
                                </span>
                            </v-col>

                            <v-col v-if="isErc20 || isErc721" cols="6">
                                <small>Token Symbol</small><br>
                                <span class="text-h6 ml-2">{{ contract.tokenSymbol || 'N/A' }}</span>
                            </v-col>

                            <v-col cols="6">
                                <small>Contract</small><br>
                                <Hash-Link class="ml-2" :type="'contract'" :hash="contract.address" :withName="true" />
                            </v-col>

                            <v-col cols="6">
                                <small>Contract Creation</small><br>
                                <span v-if="contract.creationTransaction && contract.creationTransaction.hash" class="ml-2">
                                    <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                                </span>
                                <span v-else class="ml-2">N/A</span>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" lg="7">
                <v-row>
                    <v-col cols="12">
                        <v-card outlined>
                            <v-card-subtitle>Balance</v-card-subtitle>
                            <v-skeleton-loader v-if="loading" type="list-item"></v-skeleton-loader>
                            <v-card-text v-else class="text-h4" align="center">
                                {{ balance | fromWei('ether', chain.token) }}
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" lg="6">
                        <v-card outlined style="height: 100%;">
                            <v-card-subtitle>Transactions</v-card-subtitle>
                            <v-skeleton-loader v-if="loading" type="list-item"></v-skeleton-loader>
                            <v-card-text v-else class="text-h4" align="center">
                                <template v-if="!contract">
                                    {{ sentTransactionCount }}<v-icon>mdi-arrow-up-thin</v-icon>
                                    <v-divider vertical class="mx-4"></v-divider>
                                </template>
                                {{ receivedTransactionCount }}<v-icon v-if="!contract">mdi-arrow-down-thin</v-icon>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <v-col cols="12" lg="6">
                        <v-card outlined style="height: 100%;">
                            <v-card-subtitle>ERC-20 Transfers</v-card-subtitle>
                            <v-skeleton-loader v-if="loading" type="list-item"></v-skeleton-loader>
                            <v-card-text v-else class="text-h4" align="center">
                                {{ sentErc20TokenTransferCount }}<v-icon>mdi-arrow-up-thin</v-icon><v-divider vertical class="mx-4"></v-divider> {{ receivedErc20TokenTransferCount }}<v-icon>mdi-arrow-down-thin</v-icon>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>

        <v-tabs v-model="tab">
            <v-tab id="transactionsTab" href="#transactions">Transactions</v-tab>
            <v-tab id="transfersTab" href="#transfers">Transfers</v-tab>
            <v-tab id="erc20BalancesTab" href="#erc20Balances">ERC-20 Tokens</v-tab>
            <v-tab id="erc721BalancesTab" href="#erc721Balances">ERC-721 Tokens</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="address" />
            </v-tab-item>

            <v-tab-item value="transfers">
                <Address-Token-Transfers :address="address" />
            </v-tab-item>

            <v-tab-item value="erc20Balances">
                <Token-Balances :address="address" :patterns="['erc20']" />
            </v-tab-item>

            <v-tab-item value="erc721Balances">
                <Token-Balances :address="address" :patterns="['erc721']" :dense="true" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const ethers = require('ethers');
const { formatContractPattern } = require('../lib/utils');

import { mapGetters } from 'vuex';

import AddressTransactionsList from './AddressTransactionsList';
import AddressTokenTransfers from './AddressTokenTransfers';
import TokenBalances from './TokenBalances';
import FromWei from '../filters/FromWei';
import HashLink from './HashLink';

export default {
    name: 'Address',
    props: ['address'],
    components: {
        AddressTransactionsList,
        AddressTokenTransfers,
        TokenBalances,
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        balance: 0,
        loading: true,
        contract: null,
        sentTransactionCount: null,
        receivedTransactionCount: null,
        sentErc20TransferCount: null,
        receivedErc20TransferCount: null
    }),
    mounted() {
        this.server.getAccountBalance(this.address).then(balance => this.balance = ethers.BigNumber.from(balance).toString());
    },
    methods: {
        formatContractPattern: formatContractPattern,
        openRemoveContractConfirmationModal: function() {
            this.$refs.removeContractConfirmationModal
                .open({ address: this.lowerHash, workspace: this.currentWorkspace.name });
        }
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .catch(console.log);

                this.server.getAddressStats(address)
                    .then(({ data }) => {
                        this.sentTransactionCount = data.sentTransactionCount;
                        this.receivedTransactionCount = data.receivedTransactionCount;
                        this.sentErc20TokenTransferCount = data.sentErc20TokenTransferCount;
                        this.receivedErc20TokenTransferCount = data.receivedErc20TokenTransferCount;
                    })
                    .finally(() => this.loading = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain'
        ]),
        isErc20() {
            return this.contract &&
                this.contract.patterns &&
                this.contract.patterns.indexOf('erc20') > -1;
        },
        isErc721() {
            return this.contract &&
                this.contract.patterns &&
                this.contract.patterns.indexOf('erc721') > -1;
        },
        isContract: function() {
            return this.contract && this.contract.address;
        },
        tab: {
            set(tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } }).catch(()=>{});
            },
            get() {
                return this.$route.query.tab;
            }
        },
    }
}
</script>
<style scoped>
.v-window {
    overflow: visible;
}
</style>
