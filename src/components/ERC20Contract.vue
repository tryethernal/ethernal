<template>
    <v-container fluid>
        <v-row v-if="contract.tokenName">
            <v-col cols="12" lg="5">
                <v-card outlined style="height: 100%">
                    <v-card-title>{{ contract.tokenName }}</v-card-title>
                    <v-card-subtitle>
                        <v-chip v-for="(pattern, idx) in contract.patterns" :key="idx" x-small class="success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </v-card-subtitle>
                    <v-card-text>
                        <v-row>
                            <v-col cols="6">
                                <small>Total Supply</small><br>
                                <span class="text-h6 ml-2">{{ formatNumber(contract.tokenTotalSupply, { decimals: contract.tokenDecimals }) }} {{ contract.tokenSymbol }}</span>
                            </v-col>

                            <v-col cols="6">
                                <small>Decimals</small><br>
                                <span class="text-h6 ml-2">{{ contract.tokenDecimals }}</span>
                            </v-col>
                        </v-row>

                        <v-row>
                            <v-col cols="6">
                                <small>Contract Name</small><br>
                                <span class="text-h6 ml-2">{{ contract.name }}</span>
                            </v-col>

                            <v-col cols="6">
                                <small>Contract Creation</small><br>
                                <span class="ml-2">
                                    <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                                </span>
                            </v-col>

                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" lg="7">
                <v-row>
                    <v-col cols="12" sm="6" lg="6" v-if="contractStats.tokenHolderCount">
                        <Stat-Number :title="'Holders'" :value="contractStats.tokenHolderCount" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6" v-if="contractStats.erc20TransferCount">
                        <Stat-Number :title="'Transfers'" :value="contractStats.erc20TransferCount" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6" v-if="contractStats.erc20CirculatingSupply">
                        <Stat-Number :title="'Circulating Supply'" :value="contractStats.erc20CirculatingSupply" :infoTooltip="'Number of minted tokens'" />
                    </v-col>

                    <v-col cols="12" sm="6" lg="6">
                        <v-card outlined style="height: 100%">
                            <v-card-subtitle v-if="connectedAccountBalance">
                                <div style="position: absolute;">Your Balance</div>
                                <div class="text-right" v-if="connectedAccountBalance">
                                    <Hash-Link :type="'address'" :hash="metamaskData.account" />
                                </div>
                            </v-card-subtitle>
                            <v-card-subtitle v-else>Your Balance</v-card-subtitle>
                            <v-card-text class="text-h3" align="center" v-if="connectedAccountBalance">
                                {{ formatNumber(connectedAccountBalance, { short: true }) }} {{ contract.tokenSymbol }}
                            </v-card-text>
                            <v-card-text v-else>
                                <Metamask class="mt-1" @rpcConnectionStatusChanged="onRpcConnectionStatusChanged"></Metamask>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>
        <v-tabs v-model="tab">
            <v-tab id="transactionsTab" href="#transactions">Transactions</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="address" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';

const { formatNumber, formatContractPattern } = require('../lib/utils');

import AddressTransactionsList from './AddressTransactionsList';
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
    },
    data: () => ({
        loading: true,
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
                this.server.callContractReadMethod(
                    this.contract,
                    'balanceOf(address)',
                    { from: null },
                    { 0: data.account },
                    this.currentWorkspace.rpcServer,
                    window.ethereum
                ).then(([balance]) => this.connectedAccountBalance = balance);
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
                    .then(({ data }) => this.contract = data);

                this.server.getContractStats(address)
                    .then(({ data }) => this.contractStats = data);

            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer',
            'isUserAdmin'
        ]),
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
</style>
