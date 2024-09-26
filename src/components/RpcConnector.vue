<template>
    <v-toolbar height="48" style="background-color: white; border-bottom: thin solid rgba(0, 0, 0, 0.12); white-space: nowrap;" dense flat class="px-3 color--text">
        <v-app-bar-nav-icon @click.stop="toggleMenu()" v-if="$vuetify.display.mobile"></v-app-bar-nav-icon>
        <v-icon @click="showSearchBar = !showSearchBar">mdi-magnify</v-icon>
        <v-slide-x-transition>
            <v-row v-show="showSearchBar">
                <v-col cols="12">
                    <v-autocomplete hide-details="auto" density="compact" class="ml-2" append-icon=""
                        v-model="searchSelectedItem"
                        :items="orderedItems"
                        :loading="isSearchLoading"
                        :search.sync="search"
                        :item-title="getItemText"
                        item-value="data.id"
                        hide-no-data
                        no-filter
                        autofocus
                        return-object
                        :key="autocompleteKey"
                        @blur="showSearchBar=false"
                        @update:model-value="clearSearchBar()">
                        <template v-slot:item="data">
                            <div v-if="data.item.type == 'address'">
                                <v-list-item-subtitle>{{ data.item.data.address }}</v-list-item-subtitle>
                            </div>

                            <div v-if="data.item.type == 'transaction'">
                                <v-list-item-subtitle>{{ data.item.data.hash }}</v-list-item-subtitle>
                            </div>

                            <div v-if="data.item.type == 'block'">
                                <v-list-item-subtitle>#{{ data.item.data.number }}</v-list-item-subtitle>
                                <v-list-item-subtitle>Hash: {{ data.item.data.hash }}</v-list-item-subtitle>
                                <v-list-item-subtitle>Transactions count: {{ data.item.data.transactionsCount }}</v-list-item-subtitle>
                            </div>

                            <div v-if="data.item.type == 'contract'">
                                <v-list-item-subtitle v-if="data.item.data.name">{{ data.item.data.name }}</v-list-item-subtitle>
                                <v-list-item-subtitle v-else>{{ data.item.data.address }}</v-list-item-subtitle>
                                <br>

                                <v-list-item-subtitle v-if="data.item.data.name">Address: <b>{{ data.item.data.address }}</b></v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.tokenSymbol">Token Symbol: <b>{{ data.item.data.tokenSymbol }}</b></v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.tokenName">Token Name: <b>{{ data.item.data.tokenName }}</b></v-list-item-subtitle>
                                <v-list-item-subtitle v-if="data.item.data.patterns.length">
                                    <v-chip v-for="(pattern, idx) in data.item.data.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                                        {{ formatContractPattern(pattern) }}
                                    </v-chip>
                                </v-list-item-subtitle>
                            </div>
                        </template>
                    </v-autocomplete>
                </v-col>
            </v-row>
        </v-slide-x-transition>
        <template v-if="isUserAdmin">
            <v-divider vertical inset class="mx-2"></v-divider>
            Workspace: {{ currentWorkspaceStore.name }}<template v-if="!currentWorkspaceStore.explorer"> ({{ currentWorkspaceStore.chain.name }})</template>
        </template>
        <template v-if="isUserAdmin">
            <v-divider vertical inset class="mx-2"></v-divider>
            <span style="max-width: 50ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(currentWorkspaceStore.rpcServer) }}</span>
        </template>
        <div v-show="currentWorkspaceStore.currentBlock.number">
            <v-divider vertical inset class="mx-2"></v-divider>
            Latest Block: <router-link style="text-decoration: none;" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link>
        </div>
        <div v-show="processingContracts">
            <v-divider vertical inset class="mx-2"></v-divider>
            <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
        </div>
        <template v-if="isUserAdmin">
            <v-spacer></v-spacer>
            <v-btn id="feedbackfin__back" @click="openFeedbackWindow" size="small" color="primary" variant="outlined" data-feedbackfin-button>
                <v-icon class="mr-1">mdi-chat-processing-outline</v-icon>Feedback
            </v-btn>
        </template>
    </v-toolbar>
</template>

<script>
const ethers = require('ethers');
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useUserStore } from '../stores/user';
import { mapStores } from 'pinia';
import { formatContractPattern, shortRpcUrl } from '@/lib/utils';

export default {
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
        autocompleteKey: 0
    }),
    created() {
        this.page = this.$route.path;

        this.$server.getBlocks({ page: 1, itemsPerPage: 1 }, false).then(({ data: { items }}) => {
            if (items.length)
                this.currentWorkspaceStore.updateCurrentBlock(items[0]);
        });

        if (!this.currentWorkspaceStore.public) {
            this.getAccounts();
            this.processContracts();
            this.processTransactions();
            this.processFailedTransactions();
            this.$pusher.onNewContract(this.processContracts, this);
            this.$pusher.onNewProcessableTransactions((transaction) => this.$server.processTransaction(this.currentWorkspace, transaction), this);
            this.$pusher.onNewFailedTransactions((transaction) => this.$server.processFailedTransactions([transaction], this.currentWorkspaceStore.rpcServer), this);
        }
        this.$pusher.onNewBlock(block => {
            if (block.number > this.currentWorkspaceStore.currentBlock.number)
                this.currentWorkspaceStore.updateCurrentBlock(block);
        }, this);
    },
    methods: {
        formatContractPattern, shortRpcUrl,
        commify: ethers.utils.commify,
        openFeedbackWindow(event) {
            window.feedbackfin.open(event);
        },
        toggleMenu() {
            this.$emit('toggleMenu');
        },
        clearSearchBar() {
            this.search = null;
            this.showSearchBar = false;
        },
        getItemText() {
            return this.search;
        },
        processContracts() {
            this.processingContracts = true;
            this.$server.processContracts(this.currentWorkspaceStore.rpcServer)
                .catch(console.log)
                .finally(() => this.processingContracts = false );
        },
        processTransactions() {
            this.$server.getProcessableTransactions()
                .then(({ data }) => data.forEach(transaction => this.$server.processTransaction(this.currentWorkspace, transaction)))
                .catch(console.log);
        },
        processFailedTransactions() {
            this.$server.getFailedProcessableTransactions()
                .then(({ data }) => this.$server.processFailedTransactions(data, this.currentWorkspace))
                .catch(console.log);
        },
        getAccounts() {
            this.$server.getAccounts({ page: -1 })
                .then(({ data: { items } }) => this.currentWorkspaceStore.updateAccounts(items));
        }
    },
    watch: {
        searchSelectedItem(item) {
            if (!item)
                return;
            this.autocompleteKey++;
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
            this.searchSelectedItem = null;
            this.clearSearchBar();

        },
        search(val) {
            if (!val) {
                this.search = null;
                return this.searchItems = [];
            }
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
            this.$server.search(this.searchType, val)
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
        ...mapStores(
            useCurrentWorkspaceStore,
            useUserStore
        ),
        isUserAdmin() {
            return this.userStore.isAdmin;
        },
        orderedItems() {
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
};
</script>
