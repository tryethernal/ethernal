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
            <v-row class="mb-1">
                <v-col cols="12" lg="5" v-if="contract">
                    <v-card style="height: 100%">
                        <v-card-title v-if="contract.name">{{ contract.name }}</v-card-title>
                        <v-card-subtitle v-if="contract.patterns.length > 0" class="mt-2">
                            <v-chip v-for="(pattern, idx) in contract.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                                {{ formatContractPattern(pattern) }}
                            </v-chip>
                        </v-card-subtitle>
                        <v-card-text>
                            <v-row>
                                <v-col v-if="isErc20 || isErc721" cols="6">
                                    <small>Token Name</small><br>
                                    <span class="ml-2">
                                        <Hash-Link :type="'token'" :contract="contract" :hash="contract.address" :withName="true" :withTokenName="true" />
                                    </span>
                                </v-col>

                                <v-col v-if="isErc20 || isErc721" cols="6">
                                    <small>Token Symbol</small><br>
                                    <span class="text-h6 ml-2">{{ contract.tokenSymbol || 'N/A' }}</span>
                                </v-col>

                                <v-col cols="6">
                                    <small>Deployment Transaction</small><br>
                                    <span v-if="contract.creationTransaction" class="ml-2">
                                        <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                                    </span>
                                    <span v-else class="ml-2">N/A</span>
                                </v-col>

                                <v-col cols="6">
                                    <small>Deployed By</small><br>
                                    <span v-if="contract.creationTransaction" class="ml-2">
                                        <Hash-Link :type="'address'" :hash="contract.creationTransaction.from" />
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
                            <v-card :loading="loadingStats">
                                <template v-slot:subtitle>
                                    Balance
                                </template>
                                <v-card-text class="text-h4 text-medium-emphasis" align="center">
                                    {{ $fromWei(balance, 'ether', currentWorkspaceStore.chain.token) }}
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12" lg="6">
                            <v-card style="height: 100%;" :loading="loadingStats">
                                <template v-slot:subtitle>
                                    Transactions
                                </template>
                                <v-card-text class="text-h4 text-medium-emphasis" align="center">
                                    <template v-if="!contract">
                                        {{ sentTransactionCount }}<v-icon size="x-small">mdi-arrow-up-thin</v-icon>
                                        <v-divider vertical class="mx-4"></v-divider>
                                    </template>
                                    {{ receivedTransactionCount }}<v-icon size="x-small" v-if="!contract">mdi-arrow-down-thin</v-icon>
                                </v-card-text>
                            </v-card>
                        </v-col>

                        <v-col cols="12" lg="6">
                            <v-card style="height: 100%;" :loading="loadingStats">
                                <template v-slot:subtitle>
                                    ERC-20 Transfers
                                </template>
                                <v-card-text class="text-h4 text-medium-emphasis" align="center">
                                    {{ sentErc20TokenTransferCount }}<v-icon size="x-small">mdi-arrow-up-thin</v-icon><v-divider vertical class="mx-4"></v-divider> {{ receivedErc20TokenTransferCount }}<v-icon size="x-small">mdi-arrow-down-thin</v-icon>
                                </v-card-text>
                            </v-card>
                        </v-col>
                    </v-row>
                </v-col>
            </v-row>

            <v-tabs v-model="tab">
                <v-tab class="text-medium-emphasis" color="primary" id="transactionsTab" value="transactions">Transactions</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" id="transfersTab" value="transfers">Transfers</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" id="erc20BalancesTab" value="erc20Balances">ERC-20 Tokens</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" id="erc721BalancesTab" value="erc721Balances">ERC-721 Tokens</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" v-if="contract" id="interactionsTab" value="interactions">Read / Write</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" v-if="contract" id="codeTab" value="code">Code</v-tab>
                <v-tab class="text-medium-emphasis" color="primary" v-if="contract" id="logsTab" value="logs">Logs</v-tab>
            </v-tabs>

            <v-tabs-window v-model="tab">
                <v-tabs-window-item value="transactions">
                    <v-card class="mt-3">
                        <v-card-text>
                            <Address-Transactions-List :address="address" :key="address" />
                        </v-card-text>
                    </v-card>
                </v-tabs-window-item>

                <v-tabs-window-item value="transfers">
                    <v-card class="mt-3">
                        <v-card-text>
                            <Address-Token-Transfers :address="address" :key="address" />
                        </v-card-text>
                    </v-card>
                </v-tabs-window-item>

                <v-tabs-window-item value="erc20Balances">
                    <div class="mt-3">
                        <Token-Balances :address="address" :patterns="['erc20']" :key="address" />
                    </div>
                </v-tabs-window-item>

                <v-tabs-window-item value="erc721Balances">
                    <div class="mt-3">
                        <Token-Balances :address="address" :patterns="['erc721']" :dense="true" :key="address" />
                    </div>
                </v-tabs-window-item>

                <template v-if="contract">
                    <v-tabs-window-item value="interactions">
                        <Contract-Interaction :address="address" :key="address" />
                    </v-tabs-window-item>

                    <v-tabs-window-item value="code">
                        <div class="mt-3">
                            <Contract-Code v-if="contract" :contract="contract" :key="address" />
                        </div>
                    </v-tabs-window-item>

                    <v-tabs-window-item value="logs">
                        <v-card class="mt-3">
                            <v-card-text>
                                <Contract-Logs :address="address" :key="address" />
                            </v-card-text>
                        </v-card>
                    </v-tabs-window-item>
                </template>
            </v-tabs-window>
        </template>
    </v-container>
</template>

<script>
const { formatContractPattern } = require('../lib/utils');

import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

import AddressTransactionsList from './AddressTransactionsList';
import AddressTokenTransfers from './AddressTokenTransfers';
import TokenBalances from './TokenBalances';
import ContractInteraction from './ContractInteraction';
import ContractCode from './ContractCode';
import ContractLogs from './ContractLogs';
import HashLink from './HashLink';

export default {
    name: 'Address',
    props: ['address'],
    components: {
        AddressTransactionsList,
        AddressTokenTransfers,
        TokenBalances,
        ContractInteraction,
        ContractCode,
        ContractLogs,
        HashLink
    },
    data: () => ({
        balance: 0,
        loadingContract: true,
        loadingStats: true,
        contract: null,
        sentTransactionCount: null,
        receivedTransactionCount: null,
        sentErc20TokenTransferCount: null,
        receivedErc20TokenTransferCount: null
    }),
    mounted() {
        this.$server.getNativeTokenBalance(this.address).then(({ data: { balance }}) => this.balance = balance || 0);
    },
    methods: {
        formatContractPattern
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.$server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .catch(console.log)
                    .finally(() => this.loadingContract = false);

                this.$server.getAddressStats(address)
                    .then(({ data }) => {
                        this.sentTransactionCount = data.sentTransactionCount;
                        this.receivedTransactionCount = data.receivedTransactionCount;
                        this.sentErc20TokenTransferCount = data.sentErc20TokenTransferCount;
                        this.receivedErc20TokenTransferCount = data.receivedErc20TokenTransferCount;
                    })
                    .catch(console.log)
                    .finally(() => this.loadingStats = false);
            }
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore),
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

.v-card-subtitle {
    opacity: 1;
}
</style>
