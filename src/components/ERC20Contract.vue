<template>
    <v-container fluid>
        <v-card v-if="loadingContract" border>
            <v-card-text>
                <v-row>
                    <v-col cols="4">
                        <v-skeleton-loader type="card"></v-skeleton-loader>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <v-skeleton-loader max-height="40vh" type="table"></v-skeleton-loader>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
        <template v-else>
            <v-card v-if="notAContract" border>
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-file</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col class="text-body-1 text-center">
                            There doesn't seem to be a contract at this address.
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
            <template v-else>
                    <v-row class="mb-1">
                        <v-col cols="12" lg="5">
                            <v-card style="height: 100%">
                            <v-card-title>
                                <v-tooltip location="top" v-if="contract.verification">
                                    <template v-slot:activator="{props}">
                                        <v-icon v-bind="props" class="text-success mr-1" size="small" v-if="contract.verification">mdi-check-circle</v-icon>
                                    </template>
                                    Verified contract.
                                </v-tooltip>
                                {{ contract.tokenName }}
                            </v-card-title>
                            <v-card-subtitle>
                                <v-chip v-for="(pattern, idx) in contract.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                                    {{ formatContractPattern(pattern) }}
                                </v-chip>
                            </v-card-subtitle>
                            <v-card-text>
                                <v-row>
                                    <v-col cols="6">
                                        <small>Total Supply</small><br>
                                        <span class="text-h6 ml-2" v-if="contract.tokenTotalSupply">{{ formatNumber(contract.tokenTotalSupply, { decimals: contract.tokenDecimals }) }} {{ contract.tokenSymbol }}</span>
                                        <span class="text-h6 ml-2" v-else>N/A</span>
                                    </v-col>

                                    <v-col cols="6">
                                        <small>Decimals</small><br>
                                        <span class="text-h6 ml-2">{{ contract.tokenDecimals || 'N/A' }}</span>
                                    </v-col>
                                </v-row>

                                <v-row>
                                    <v-col cols="6">
                                        <small>Address</small><br>
                                        <Hash-Link class="ml-2" :type="'address'" :hash="contract.address" />
                                    </v-col>

                                    <v-col cols="6">
                                        <small>Contract Creation</small><br>
                                        <span v-if="contract.creationTransaction && contract.creationTransaction.hash" class="ml-2">
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
                                <Stat-Number :loading="loadingStats" :title="'Circulating Supply'" :value="contractStats.tokenCirculatingSupply" :decimals="contract.tokenDecimals" :infoTooltip="'Number of tokens currently in circulation'" :tokenType="tokenType" :key="contract.id" />
                            </v-col>

                            <v-col cols="12" sm="6" lg="6">
                                <v-card style="height: 100%">
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

                <div v-if="!loadingContract">
                    <v-tabs v-model="tab">
                        <v-tab id="transactionsTab" value="transactions">Transactions</v-tab>
                        <v-tab id="transfersTab" value="transfers">Transfers</v-tab>
                        <v-tab id="holdersTab" value="holders">Holders</v-tab>
                        <v-tab id="interactionsTab" value="interactions">Read / Write</v-tab>
                        <v-tab id="codeTab" value="code">Code</v-tab>
                        <v-tab id="analyticsTab" value="analytics">Analytics</v-tab>
                    </v-tabs>

                    <v-tabs-window v-model="tab">
                        <v-tabs-window-item value="transactions">
                            <v-card class="mt-3">
                                <v-card-text>
                                    <Address-Transactions-List :address="address" />
                                </v-card-text>
                            </v-card>
                        </v-tabs-window-item>

                        <v-tabs-window-item value="transfers">
                            <v-card class="mt-3">
                                <v-card-text>
                                    <ERC-20-Token-Transfers :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" />
                                </v-card-text>
                            </v-card>
                        </v-tabs-window-item>

                        <v-tabs-window-item value="holders">
                            <v-card class="mt-3">
                                <v-card-text>
                                    <ERC-20-Token-Holders :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" />
                                </v-card-text>
                            </v-card>
                        </v-tabs-window-item>

                        <v-tabs-window-item value="interactions">
                            <Contract-Interaction :address="address" />
                        </v-tabs-window-item>

                        <v-tabs-window-item value="code">
                            <Contract-Code v-if="contract" :contract="contract" />
                        </v-tabs-window-item>

                        <v-tabs-window-item value="analytics">
                            <v-card class="mt-3">
                                <v-card-text>
                                    <ERC-20-Contract-Analytics :address="address" :tokenDecimals="contract.tokenDecimals" :tokenSymbol="contract.tokenSymbol" :tokenType="tokenType" :key="contract.id" />
                                </v-card-text>
                            </v-card>
                        </v-tabs-window-item>
                    </v-tabs-window>
                </div>
            </template>
        </template>
    </v-container>
</template>

<script>
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

const { formatNumber, formatContractPattern } = require('../lib/utils');
const ERC20_ABI = require('../abis/erc20.json');

import AddressTransactionsList from './AddressTransactionsList';
import ContractInteraction from './ContractInteraction';
import ERC20TokenHolders from './ERC20TokenHolders';
import ERC20ContractAnalytics from './ERC20ContractAnalytics';
import ERC20TokenTransfers from './ERC20TokenTransfers';
import ContractCode from './ContractCode';
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
        ERC20TokenTransfers,
        ContractCode
    },
    data: () => ({
        loadingContract: true,
        loadingStats: true,
        loadingBalance: false,
        contract: {},
        contractStats: {},
        metamaskData: {},
        connectedAccountBalance: null,
        notAContract: false,
    }),
    mounted() {
    },
    methods: {
        formatNumber,
        formatContractPattern,
        onRpcConnectionStatusChanged(data) {
            this.metamaskData = data;
            if (data.account && data.isReady) {
                this.loadingBalance = true;
                this.$server.callContractReadMethod(
                    { address: this.address, abi: ERC20_ABI },
                    'balanceOf(address)',
                    { from: null },
                    { 0: data.account },
                    this.currentWorkspaceStore.rpcServer,
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
                this.$server.getContract(address)
                    .then(({ data }) => {
                        if (data)
                            this.contract = data;
                        else
                            this.notAContract = true;
                    })
                    .finally(() => this.loadingContract = false);

                this.$server.getContractStats(address)
                    .then(({ data }) => this.contractStats = data)
                    .finally(() => this.loadingStats = false);
            }
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore),
        tokenType() {
            if (this.contract && this.contract.patterns)
                return this.contract.patterns[0];
            else
                return 'erc20';
        },
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
