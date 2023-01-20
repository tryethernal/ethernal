<template>
    <v-container fluid>
        <v-row class="mb-1">
            <v-col cols="12" lg="5">
                <v-card outlined style="height: 100%">
                    <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                    <v-card-title v-else-if="contract.name">{{ contract.name }}</v-card-title>
                    <v-card-subtitle>
                        <v-skeleton-loader v-if="loadingContract" type="chip"></v-skeleton-loader>
                        <v-chip v-else v-for="(pattern, idx) in contract.patterns" :key="idx" x-small class="success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </v-card-subtitle>
                    <v-card-text>
                        <v-row>
                            <v-col v-if="isErc20 || isErc721" cols="6">
                                <small>Token Name</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else-if="contract.tokenName" class="ml-2">
                                    <Hash-Link :type="tokenType" :hash="contract.address" :withName="true" :withTokenName="true" />
                                </span>
                                <span v-else>
                                    N/A
                                </span>
                            </v-col>

                            <v-col v-if="isErc20 || isErc721" cols="6">
                                <small>Token Symbol</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else class="text-h6 ml-2">{{ contract.tokenSymbol || 'N/A' }}</span>
                            </v-col>


                            <v-col cols="6">
                                <small>Address</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else class="ml-2">
                                    <Hash-Link :type="'address'" :hash="contract.address" />
                                </span>
                            </v-col>

                            <v-col cols="6">
                                <small>Contract Creation</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else-if="contract.creationTransaction && contract.creationTransaction.hash" class="ml-2">
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
                            <v-skeleton-loader v-if="loadingStats" type="list-item"></v-skeleton-loader>
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
                            <v-skeleton-loader v-if="loadingStats" type="list-item"></v-skeleton-loader>
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
                            <v-skeleton-loader v-if="loadingStats" type="list-item"></v-skeleton-loader>
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
            <v-tab id="interactionsTab" href="#interactions">Read / Write</v-tab>
            <v-tab id="logsTab" href="#logs">Logs</v-tab>
            <v-tab id="codeTab" href="#code">Code</v-tab>
            <v-tab id="storageTab" href="#storage">Storage</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="address" />
            </v-tab-item>

            <v-tab-item value="interactions">
                <Contract-Interaction :address="address" />
            </v-tab-item>

            <v-tab-item value="logs">
                <Contract-Logs :address="address" />
            </v-tab-item>

            <v-tab-item value="storage">
                <Contract-Storage :address="address" />
            </v-tab-item>

            <v-tab-item value="code">
                <Contract-Code :address="address" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { mapGetters } from 'vuex';

const { formatNumber, formatContractPattern } = require('../lib/utils');

import AddressTransactionsList from './AddressTransactionsList';
import ContractInteraction from './ContractInteraction';
import ContractStorage from './ContractStorage';
import ContractLogs from './ContractLogs';
import ContractCode from './ContractCode';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'Contract',
    props: ['address'],
    components: {
        AddressTransactionsList,
        HashLink,
        ContractInteraction,
        ContractLogs,
        ContractStorage,
        ContractCode
    },
    filters: {
        FromWei
    },
    data: () => ({
        balance: 0,
        loadingContract: true,
        loadingStats: true,
        loadingBalance: false,
        contract: {
            patterns: []
        },
        receivedTransactionCount: null,
        sentErc20TokenTransferCount: null,
        receivedErc20TokenTransferCount: null,
        metamaskData: {},
        connectedAccountBalance: null,
    }),
    mounted() {
        this.server.getAccountBalance(this.address).then(balance => this.balance = ethers.BigNumber.from(balance).toString());
    },
    methods: {
        moment: moment,
        formatNumber: formatNumber,
        formatContractPattern: formatContractPattern,
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .finally(() => this.loadingContract = false);

                this.server.getAddressStats(address)
                    .then(({ data }) => {
                        this.receivedTransactionCount = data.receivedTransactionCount;
                        this.sentErc20TokenTransferCount = data.sentErc20TokenTransferCount;
                        this.receivedErc20TokenTransferCount = data.receivedErc20TokenTransferCount;
                    })
                    .finally(() => this.loadingStats = false);
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain'
        ]),
        isErc20() {
            return this.contract.patterns.indexOf('erc20') > -1;
        },
        isErc721() {
            return this.contract.patterns.indexOf('erc721') > -1;
        },
        tokenType() {
            if (this.isErc20) return 'token';
            if (this.isErc721) return 'nft';
            else return 'contract';
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
