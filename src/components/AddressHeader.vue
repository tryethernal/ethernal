<template>
    <v-row class="mb-1 align-stretch">
        <v-col cols="12" sm="6" lg="4">
            <v-card :loading="loadingBalance" class="h-100">
                <v-card-text class="d-flex flex-column ga-3">
                    <h3 class="font-weight-medium">Overview</h3>

                    <span v-if="contract && contract.name">
                        <h4 class="text-uppercase text-caption text-medium-emphasis">Contract Name</h4>
                        <span>{{ contract.name }}</span>
                    </span>

                    <span>
                        <h4 class="text-uppercase text-caption text-medium-emphasis">{{ currentWorkspaceStore.chain.token }} Balance</h4>
                        {{ fromWei(balance, 'ether', currentWorkspaceStore.chain.token) }}
                    </span>
                </v-card-text>
            </v-card>
        </v-col>
        <v-col cols="12" sm="6" lg="4">
            <v-card :loading="loadingStats" class="h-100">
                <v-card-text class="d-flex flex-column ga-4">
                    <h3 class="font-weight-medium">More Info</h3>

                    <template v-if="contract">
                        <div>
                            <h4 class="text-uppercase text-caption text-medium-emphasis">Contract Creator</h4>
                            <span v-if="contract.creationTransaction">
                                <Hash-Link :type="'address'" :hash="contract.creationTransaction.from" /> at txn <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                            </span>
                            <span v-else>N/A (creation transaction not indexed)</span>
                        </div>

                        <div>
                            <h4 class="text-uppercase text-caption text-medium-emphasis">Token Tracker</h4>
                            <router-link class="text-decoration-none" :to="`/token/${contract.address}`">
                                {{ contract.tokenName || contract.name || contract.address }} <span v-if="contract.tokenSymbol" class="text-caption text-medium-emphasis">({{ contract.tokenSymbol }})</span>
                            </router-link>
                        </div>
                    </template>
                    <template v-else>
                        <div>
                            <h4 class="text-uppercase text-caption text-medium-emphasis">Transactions</h4>
                            Latest:
                            <span class="font-weight-medium mr-3">
                                <router-link v-if="addressTransactionStats.last_transaction_hash" class="no-decoration" :to="`/transaction/${addressTransactionStats.last_transaction_hash}`">
                                    {{ dt.fromNow(addressTransactionStats.last_transaction_timestamp) }}
                                    <sup><v-icon size="small" icon="mdi-arrow-top-right"></v-icon></sup>
                                </router-link>
                                <span v-else>N/A</span>
                            </span>
                            First:
                            <span class="font-weight-medium">
                                <router-link v-if="addressTransactionStats.first_transaction_hash" class="no-decoration" :to="`/transaction/${addressTransactionStats.first_transaction_hash}`">
                                    {{ dt.fromNow(addressTransactionStats.first_transaction_timestamp) }}
                                    <sup><v-icon size="small" icon="mdi-arrow-top-right"></v-icon></sup>
                                </router-link>
                                <span v-else>N/A</span>
                            </span>
                        </div>
                    </template>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { inject } from 'vue';
import HashLink from './HashLink.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

const currentWorkspaceStore = useCurrentWorkspaceStore();

const dt = inject('$dt');
const fromWei = inject('$fromWei');

defineProps({
    loadingBalance: {
        type: Boolean,
        required: true
    },
    loadingStats: {
        type: Boolean,
        required: true
    },
    balance: {
        type: [String, Number],
        required: true
    },
    contract: {
        type: Object,
        default: null
    },
    addressTransactionStats: {
        type: Object,
        default: () => ({})
    }
});
</script> 