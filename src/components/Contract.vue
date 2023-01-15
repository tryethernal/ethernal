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
                            <v-col v-if="isErc20" cols="6">
                                <small>Contract Name</small><br>
                                <v-skeleton-loader v-if="loadingContract" type="list-item"></v-skeleton-loader>
                                <span v-else class="text-h6 ml-2">{{ contract.name || 'N/A' }}</span>
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
        </v-row>

        <v-tabs v-model="tab">
            <v-tab id="transactionsTab" href="#transactions">Transactions</v-tab>
            <v-tab id="interactionsTab" href="#interactions">Read / Write</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="address" />
            </v-tab-item>

            <v-tab-item value="interactions">
                <Contract-Interaction :address="address" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';

const { formatNumber, formatContractPattern } = require('../lib/utils');

import AddressTransactionsList from './AddressTransactionsList';
import ContractInteraction from './ContractInteraction';
import HashLink from './HashLink';

export default {
    name: 'Contract',
    props: ['address'],
    components: {
        AddressTransactionsList,
        HashLink,
        ContractInteraction,
    },
    data: () => ({
        loadingContract: true,
        loadingStats: true,
        loadingBalance: false,
        contract: {
            patterns: []
        },
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
            'currentWorkspace'
        ]),
        isErc20() {
            return this.contract.patterns.indexOf('erc20') > -1;
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
