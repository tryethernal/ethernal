<template>
    <v-toolbar style="border-bottom: thin solid rgba(0, 0, 0, 0.12);overflow-x:auto; white-space: nowrap;" dense flat class="px-3 color--text">
        <v-app-bar-nav-icon @click.stop="toggleMenu()" v-if="$vuetify.breakpoint.mobile"></v-app-bar-nav-icon>
        <v-icon @click="showSearchBar = !showSearchBar">mdi-magnify</v-icon>
        <v-slide-x-transition>
            <v-row v-show="showSearchBar">
                <v-col cols="12">
                    <v-autocomplete hide-details="auto" dense class="ml-2" append-icon=""
                        v-model="searchSelectedItem"
                        :items="orderedItems"
                        :loading="isSearchLoading"
                        :search-input.sync="search"
                        :item-text="getItemText"
                        item-value="data.id"
                        hide-no-data
                        no-filter
                        autofocus
                        return-object
                        @blur="showSearchBar=false"
                        @change="clearSearchBar()">
                        <template v-slot:item="data">
                            <v-list-item-content v-if="data.item.type == 'address'">
                                <v-list-item-subtitle>{{ data.item.data.address }}</v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-content v-if="data.item.type == 'transaction'">
                                <v-list-item-subtitle>{{ data.item.data.hash }}</v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-content v-if="data.item.type == 'block'">
                                <v-list-item-subtitle>#{{ data.item.data.number }}</v-list-item-subtitle>
                                <v-list-item-subtitle>Hash: {{ data.item.data.hash }}</v-list-item-subtitle>
                                <v-list-item-subtitle>Transactions count: {{ data.item.data.transactionsCount }}</v-list-item-subtitle>
                            </v-list-item-content>

                            <v-list-item-content v-if="data.item.type == 'contract'">
                                <v-list-item-subtitle v-if="data.item.data.name">{{ data.item.data.name }}</v-list-item-subtitle>
                                <v-list-item-subtitle v-else>{{ data.item.data.address }}</v-list-item-subtitle>
                                <br>

                                <v-list-item-subtitle v-if="data.item.data.name">Address: <b>{{ data.item.data.address }}</b></v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.tokenSymbol">Token Symbol: <b>{{ data.item.data.tokenSymbol }}</b></v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.tokenName">Token Name: <b>{{ data.item.data.tokenName }}</b></v-list-item-subtitle>
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
            <template v-if="isUserAdmin">
                <v-divider vertical inset class="mx-2"></v-divider>
                Workspace: {{ currentWorkspace.name }}<template v-if="!isPublicExplorer"> ({{ chain.name }})</template>
            </template>
            <template v-if="isUserAdmin">
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
            <a v-if="isFeedbackEnabled" class="ml-4" data-feedbackfin-button>
                <v-icon color="primary" class="mr-1">mdi-comment-quote</v-icon>Feedback?
            </a>
        </template>
    </v-toolbar>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';

import { formatContractPattern } from '@/lib/utils';

export default Vue.extend({
    name: 'RpcConnector',
    data: () => ({
        searchSelectedItem: null,
        searchItems: [],
        isSearchLoading: false,
        search: null,
        searchType: null,
        showSearchBar: false,
        processingContracts: false,
        page: null,
        isFeedbackEnabled: false,
    }),
    created: function() {
        this.getAccounts();
        this.page = this.$route.path;

        if (process.env.VUE_APP_ENABLE_FEEDBACK && window.feedbackfin) {
            this.isFeedbackEnabled = true;
            window.feedbackfin.config.user = {
                domain: location.host,
                page: location.pathname,
                ...window.feedbackfin.config.user
            };
        }

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
            this.pusher.onNewProcessableTransactions((transaction) => this.server.processTransaction(this.currentWorkspace, transaction), this);
            this.pusher.onNewFailedTransactions((transaction) => this.server.processFailedTransactions([transaction], this.currentWorkspace.rpcServer), this);
        }
        this.pusher.onNewBlock((block) => this.$store.dispatch('updateCurrentBlock', block), this);
    },
    methods: {
        formatContractPattern,
        toggleMenu() {
            this.$emit('toggleMenu');
        },
        clearSearchBar: function() {
            this.search = null;
            this.showSearchBar = false;
        },
        getItemText: function() {
            return this.search;
        },
        processContracts: function() {
            this.processingContracts = true;
            this.server.processContracts(this.currentWorkspace.rpcServer)
                .catch(console.log)
                .finally(() => this.processingContracts = false );
        },
        processTransactions: function() {
            this.server.getProcessableTransactions()
                .then(({ data }) => data.forEach(transaction => this.server.processTransaction(this.currentWorkspace, transaction)))
                .catch(console.log);
        },
        processFailedTransactions: function() {
            this.server.getFailedProcessableTransactions()
                .then(({ data }) => this.server.processFailedTransactions(data, this.currentWorkspace))
                .catch(console.log);
        },
        getAccounts() {
            this.server.getAccounts({ page: -1 })
                .then(({ data: { items } }) => this.$store.dispatch('updateAccounts', items));
        }
    },
    watch: {
        searchSelectedItem: function(item) {
            switch(item.type) {
                case 'address':
                case 'contract':
                    this.$router.push(`/address/${item.data.address}`);
                    break;
                case 'transaction':
                    this.$router.push(`/transaction/${item.data.hash}`);
                    break;
                case 'block':
                    this.$router.push(`/block/${item.data.number}`);
                    break;
            }

        },
        search: function(val) {
            if (!val) return this.searchItems = [];
            if (val === this.model || typeof val == 'object') return;

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

            if (this.searchType == 'text' && val.length < 3) return;
            this.server.search(this.searchType, val)
                .then(({ data }) => {
                    this.searchItems = data;
                    if (this.searchType == 'address' && !data.length)
                        this.searchItems.push({ type: 'address', data: { address: val }});
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
            'currentBlock',
            'isUserAdmin'
        ]),
        orderedItems: function() {
            const items = {
                'address': [],
                'transaction': [],
                'block': [],
                'contract': []
            };

            this.searchItems.forEach(item => items[item.type].push(item));

            const result = [];

            if (items.address.length)
                result.push({ header: 'Address' }, ...items.address);

            if (result.length && (items.transaction.length || items.block.length || items.contract.length))
                result.push({ divider: true });

            if (items.transaction.length)
                result.push({ header: 'Transactions' }, ...items.transaction);

            if (result.length && (items.block.length || items.contract.length))
                result.push({ divider: true });

            if (items.block.length)
                result.push({ header: 'Blocks' }, ...items.block);

            if (result.length && items.contract.length)
                result.push({ divider: true });

            if (items.contract.length)
                result.push({ header: 'Contracts' }, ...items.contract);

            return result;
        }
    }
});
</script>
<style lang="scss">
:root {
    --feedbackfin-primary-color: var(--v-primary-base);
}
#feedbackfin__container {
    font-family: 'Roboto';
}
</style>
