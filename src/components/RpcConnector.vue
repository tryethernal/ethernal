<template>
    <v-toolbar style="border-bottom: thin solid rgba(0, 0, 0, 0.12)" dense flat class="pl-3 p-5 color--text">
        <v-icon @click="showSearchBar = !showSearchBar">mdi-magnify</v-icon>
        <v-slide-x-transition>
            <v-row v-show="showSearchBar">
                <v-col cols="12">
                    <v-autocomplete hide-details="auto" dense class="ml-2" append-icon=""
                        :items="searchItems"
                        :loading="isSearchLoading"
                        :search-input.sync="search"
                        hide-no-data
                        hide-selected
                        no-filter
                        autofocus
                        return-object>
                        <template v-slot:item="data">
                            <v-list-item-content v-show="data.item.type == 'transaction'">
                                <v-list-item-title>Transaction</v-list-item-title>
                                <v-list-item-subtitle>{{ data.item.data.hash }}</v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-content v-show="data.item.type == 'block'">
                                <v-list-item-title>Block #{{ data.item.data.number }}</v-list-item-title>
                                <v-list-item-subtitle>Hash: {{ data.item.data.hash }}</v-list-item-subtitle>
                                <v-list-item-subtitle>Transactions count: {{ data.item.data.transactionsCount }}</v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-content v-show="data.item.type == 'contract'">
                                <v-list-item-title>Contract</v-list-item-title>
                                <v-list-item-subtitle v-if="data.item.data.name">{{ data.item.data.name }} - {{ data.item.data.address }}</v-list-item-subtitle>
                                <v-list-item-subtitle v-else>{{ data.item.data.address }}</v-list-item-subtitle>

                                <v-divider v-if="data.item.data.tokenSymbol || data.item.data.tokenName" class="my-2"></v-divider>

                                <v-list-item-title v-if="data.item.data.tokenSymbol || data.item.data.tokenName">Token Info</v-list-item-title>
                                <v-list-item-subtitle v-if="data.item.data.tokenSymbol">Symbol: {{ data.item.data.tokenSymbol }}</v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.tokenName">Name: {{ data.item.data.tokenName }}</v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.patterns.length">
                                    <v-chip v-for="(pattern, idx) in data.item.data.patterns" :key="idx" x-small class="success mr-2">
                                        {{ formatContractPattern(pattern) }}
                                    </v-chip>
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </template>
                    </v-autocomplete>
                </v-col>
            </v-row>
        </v-slide-x-transition>
        <template>
            <template v-if="isPublicExplorer">
                <v-divider vertical inset class="mx-2"></v-divider>
                {{ chain.name }}
            </template>
            <template v-else>
                <v-divider vertical inset class="mx-2"></v-divider>
                Workspace: {{ currentWorkspace.name }} ({{ chain.name }})
            </template>
            <template v-if="!isPublicExplorer">
                <v-divider vertical inset class="mx-2"></v-divider>
                {{ currentWorkspace.rpcServer }}
            </template>
            <div v-show="currentBlock.number">
                <v-divider vertical inset class="mx-2"></v-divider>
                Latest Block: <router-link :to="'/block/' + currentBlock.number">{{ currentBlock.number }}</router-link>
            </div>
            <div v-show="processingContracts">
                <v-divider vertical inset class="mx-2"></v-divider>
                <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
            </div>
            <v-spacer></v-spacer>
            <a class="ml-4" v-if="isFeedbackFishEnabled" data-feedback-fish :data-feedback-fish-userid="user.email" :data-feedback-fish-page="page">
                <v-icon color="primary" class="mr-1">mdi-comment-quote</v-icon>Feedback?
            </a>
        </template>
    </v-toolbar>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';

import { auth } from '../plugins/firebase.js';
import { bus } from '../bus.js';
import { formatContractPattern } from '@/lib/utils';

export default Vue.extend({
    name: 'RpcConnector',
    data: () => ({
        model: null,
        searchItems: [],
        isSearchLoading: false,
        search: null,
        searchType: null,
        showSearchBar: false,
        processingContracts: false,
        page: null,
        isFeedbackFishEnabled: false,
    }),
    created: function() {
        if (auth().currentUser && !this.isPublicExplorer) {
            bus.$on('syncAccount', this.syncAccount);
        }
        this.page = this.$route.path;
        this.isFeedbackFishEnabled = !!process.env.VUE_APP_FEEDBACK_FISH_PID;

        this.server.getBlocks({ page: 1, itemsPerPage: 1 }).then(({ data: { items }}) => {
            if (items.length) {
                this.$store.dispatch('updateCurrentBlock', items[0]);
            }
        });

        if (!this.isPublicExplorer) {
            this.processContracts();
            this.processTransactions();
            this.processFailedTransactions();
            this.pusher.onNewContract(this.processContracts, this);
            this.pusher.onNewProcessableTransactions((transaction) => this.server.processTransactions(this.currentWorkspace, [transaction]), this);
            this.pusher.onNewFailedTransactions((transaction) => this.server.processFailedTransactions([transaction], this.currentWorkspace), this);
        }
        this.pusher.onNewBlock((block) => this.$store.dispatch('updateCurrentBlock', block), this);
    },
    methods: {
        formatContractPattern,
        getItemText: function(val) {
            return String(val.data.id);
        },
        processContracts: function() {
            this.processingContracts = true;
            this.server.processContracts(this.currentWorkspace.name)
                .catch(console.log)
                .finally(() => this.processingContracts = false );
        },
        processTransactions: function() {
            this.server.getProcessableTransactions()
                .then(({ data }) => this.server.processTransactions(this.currentWorkspace, data))
                .catch(console.log);
        },
        processFailedTransactions: function() {
            this.server.getFailedProcessableTransactions()
                .then(({ data }) => this.server.processFailedTransactions(data, this.currentWorkspace))
                .catch(console.log);
        }
    },
    watch: {
        search: function(val) {
            if (!val) return this.searchItems = [];
            if (val === this.model) return;

            this.isSearchLoading = true;
            this.searchType = 'text';
            if (val.startsWith('0x')) {
                if (val.length == 66) {
                    this.searchType = 'hash';
                }
                else if (val.length == 42) {
                    this.searchType = 'address';
                }
            }
            else if (!isNaN(parseFloat(val)) && parseFloat(val) % 1 === 0) {
                this.searchType = 'number';
            }
            this.server.search(this.searchType, val)
                .then(({ data }) => {
                    console.log(data);
                    this.searchItems = data;
                })
                .catch(console.log)
                .finally(() => this.isSearchLoading = false);
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain',
            'user',
            'isPublicExplorer',
            'currentBlock'
        ])
    }
});
</script>
