<template>
    <v-container fluid>
        <v-row class="mb-1">
            <v-col cols="12" lg="5">
                <v-card outlined style="height: 100%">
                    <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                    <v-card-title v-else>
                        <v-tooltip top v-if="contract.verification">
                            <template v-slot:activator="{on, attrs}">
                                <v-icon v-bind="attrs" v-on="on" class="success--text mr-1" small v-if="contract.verification">mdi-check-circle</v-icon>
                            </template>
                            Verified contract.
                        </v-tooltip>
                        {{ contract.tokenName }}
                    </v-card-title>
                    <v-card-subtitle>
                        <v-skeleton-loader v-if="loadingContract" type="chip"></v-skeleton-loader>
                        <v-chip v-else v-for="(pattern, idx) in contract.patterns" :key="idx" x-small class="success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </v-card-subtitle>
                    <v-card-text>
                        <v-row>
                            <v-col cols="6">
                                <small>Total Supply</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span class="text-h6 ml-2" v-else-if="contract.tokenTotalSupply">{{ formatNumber(contract.tokenTotalSupply, { decimals: contract.tokenDecimals }) }} {{ contract.tokenSymbol }}</span>
                                <span class="text-h6 ml-2" v-else>N/A</span>
                            </v-col>

                            <v-col cols="6">
                                <small>Decimals</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else class="text-h6 ml-2">{{ contract.tokenDecimals || 'N/A' }}</span>
                            </v-col>
                        </v-row>

                        <v-row>
                            <v-col cols="6">
                                <small>Contract</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <Hash-Link class="ml-2" :type="'contract'" :hash="contract.address" :withName="true" />
                            </v-col>

                            <v-col cols="6">
                                <small>Contract Creation</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else-if="contract.creationTransaction && contract.creationTransaction.hash" class="ml-2">
                                    <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                                </span>
                                <span v-else class="text-h6 ml-2">N/A</span>
                            </v-col>

                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" lg="7">
                <v-row>
                    <v-col cols="12" sm="6" lg="6">
                        <Stat-Number :loading="loadingStats" :title="'Holders'" :value="contractStats.tokenHolderCount" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6">
                        <Stat-Number :loading="loadingStats" :title="'Transfers'" :value="contractStats.tokenTransferCount" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6">
                        <Stat-Number :loading="loadingStats" :title="'Circulating Supply'" :value="contractStats.tokenCirculatingSupply" :decimals="contract.tokenDecimals" :infoTooltip="'Number of tokens currently in circulation'" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6">
                        <v-card outlined style="height: 100%">
                            <v-card-subtitle v-if="metamaskData.account && metamaskData.isReady">
                                <div style="position: absolute;">Your Balance</div>
                                <div class="text-right" v-if="metamaskData.account">
                                    <Hash-Link :type="'address'" :hash="metamaskData.account" />
                                </div>
                            </v-card-subtitle>
                            <v-card-subtitle v-else>Your Balance</v-card-subtitle>
                            <v-card-text class="text-h3" align="center" v-if="metamaskData.account && metamaskData.isReady">
                                <v-skeleton-loader v-if="loadingBalance" type="list-item"></v-skeleton-loader>
                                <template v-else-if="connectedAccountBalance">{{ formatNumber(connectedAccountBalance, { short: true }) }} {{ contract.tokenSymbol }}</template>
                                <template v-else>N/A</template>
                            </v-card-text>
                            <v-card-text v-else>
                                <Metamask class="mt-1" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>

        <v-card outlined>
            <v-tabs v-model="tab">
                <v-tab id="transactionsTab" href="#transactions">Transactions</v-tab>
                <v-tab id="interactionsTab" href="#interactions">Read / Write</v-tab>
                <v-tab id="holdersTab" href="#holders">Holders</v-tab>
                <v-tab id="transfersTab" href="#transfers">Transfers</v-tab>
                <v-tab id="analyticsTab" href="#analytics">Analytics</v-tab>
            </v-tabs>

            <v-tabs-items :value="tab">
                <v-tab-item value="transactions">
                    <Address-Transactions-List :address="address" />
                </v-tab-item>

                <v-tab-item value="interactions">
                    <Contract-Interaction :address="address" />
                </v-tab-item>

                <v-tab-item value="holders">
                    <ERC-20-Token-Holders :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" />
                </v-tab-item>

                <v-tab-item value="analytics">
                    <ERC-20-Contract-Analytics :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" />
                </v-tab-item>

                <v-tab-item value="transfers">
                    <ERC-20-Token-Transfers :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" />
                </v-tab-item>
            </v-tabs-items>
        </v-card>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';

const { formatNumber, formatContractPattern } = require('../lib/utils');
const ERC20_ABI = require('../abis/erc20.json');

import AddressTransactionsList from './AddressTransactionsList';
import ContractInteraction from './ContractInteraction';
import ERC20TokenHolders from './ERC20TokenHolders';
import ERC20ContractAnalytics from './ERC20ContractAnalytics';
import ERC20TokenTransfers from './ERC20TokenTransfers';
import StatNumber from './StatNumber';
import HashLink from './HashLink';
import Metamask from './Metamask';

export default {
    name: 'ERC20Contract',
    props: ['address'],
    components: {
        AddressTransactionsList,
        StatNumber,
        HashLink,
        Metamask,
        ContractInteraction,
        ERC20TokenHolders,
        ERC20ContractAnalytics,
        ERC20TokenTransfers
    },
    data: () => ({
        loadingContract: true,
        loadingStats: true,
        loadingBalance: false,
        contract: {},
        contractStats: {},
        metamaskData: {},
        connectedAccountBalance: null,
    }),
    mounted() {
    },
    methods: {
        moment: moment,
        formatNumber: formatNumber,
        formatContractPattern: formatContractPattern,
        onRpcConnectionStatusChanged(data) {
            this.metamaskData = data;
            if (data.account && data.isReady) {
                this.loadingBalance = true;
                this.server.callContractReadMethod(
                    { address: this.address, abi: ERC20_ABI },
                    'balanceOf(address)',
                    { from: null },
                    { 0: data.account },
                    this.rpcServer,
                    window.ethereum
                )
                .then(([balance]) => this.connectedAccountBalance = balance)
                .finally(() => this.loadingBalance = false);
            }
            else
                this.connectedAccountBalance = null;
        },
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .finally(() => this.loadingContract = false);

                this.server.getContractStats(address)
                    .then(({ data }) => this.contractStats = data)
                    .finally(() => this.loadingStats = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'rpcServer'
        ]),
        tab: {
            set(tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } }).catch(()=>{});
            },
            get() {
                return this.$route.query.tab;
            }
        }
    }
}
</script>
