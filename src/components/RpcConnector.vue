<template>
    <v-toolbar height="48" style="background-color: white; border-bottom: thin solid rgba(0, 0, 0, 0.12); white-space: nowrap;" dense flat class="px-3 color--text">
        <v-app-bar-nav-icon @click.stop="toggleMenu()" v-if="$vuetify.display.mobile"></v-app-bar-nav-icon>
        <v-icon @click="showSearchBar = !showSearchBar">mdi-magnify</v-icon>
        <v-slide-x-transition>
            <v-row v-show="showSearchBar">
                <v-col cols="12">
                    <v-autocomplete hide-details="auto" density="compact" class="ml-2" append-icon=""
                        v-model="searchSelectedItem"
                        @update:search="search"
                        :items="orderedItems"
                        :loading="isSearchLoading"
                        return-object
                        hide-no-data
                        no-filter
                        autofocus>
                        <template v-slot:selection></template>
                        <template v-slot:item="{ props, item }">
                            <template v-if="item.raw.header">
                                <v-list-item v-bind="props" title="" disabled :subtitle="item.raw.header"></v-list-item>
                            </template>

                            <template v-if="item.raw.divider">
                                <v-divider v-bind="props"></v-divider>
                            </template>

                            <template v-if="item.raw.type == 'address'">
                                <v-list-item v-bind="props" :title="item.raw.data.address" class="mb-2 ml-2"></v-list-item>
                            </template>

                            <template v-if="item.raw.type == 'transaction'">
                                <v-list-item v-bind="props" :title="item.raw.data.hash" class="mb-2 ml-2"></v-list-item>
                            </template>

                            <template v-if="item.raw.type == 'block'">
                                <v-list-item v-bind="props" :title="`#${item.raw.data.number}`" :subtitle="`${item.raw.data.transactionsCount} transactions`" class="mb-2 ml-2"></v-list-item>
                            </template>

                            <template v-if="item.raw.type == 'contract'">
                                <v-list-item v-bind="props" :title="item.raw.data.name || item.raw.data.address" class="mb-2 ml-2">
                                    <small v-if="item.raw.data.name">Address: <b>{{ item.raw.data.address }}</b><br></small>
                                    <small v-if="item.raw.data.tokenSymbol">Token Symbol: <b>{{ item.raw.data.tokenSymbol }}</b><br></small>
                                    <small v-if="item.raw.data.tokenName">Token Name: <b>{{ item.raw.data.tokenName }}</b><br></small>
                                    <div v-if="item.raw.data.patterns.length">
                                        <v-chip v-for="(pattern, idx) in item.raw.data.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                                            {{ formatContractPattern(pattern) }}
                                        </v-chip>
                                    </div>
                                </v-list-item>
                            </template>
                        </template>
                    </v-autocomplete>
                </v-col>
            </v-row>
        </v-slide-x-transition>
        <template v-if="isUserAdmin">
            <v-divider vertical inset class="mx-2"></v-divider>
            Workspace: {{ currentWorkspaceStore.name }}
        </template>
        <template v-if="isUserAdmin && !currentWorkspaceStore.public">
            <v-divider vertical inset class="mx-2"></v-divider>
            <span style="max-width: 50ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(currentWorkspaceStore.rpcServer) }}</span>
        </template>
        <template v-if="currentWorkspaceStore.currentBlock.number">
            <v-divider vertical inset class="mx-2"></v-divider>
            Latest Block: <router-link class="text-decoration-none ml-1" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link>
        </template>
        <template v-if="explorerStore.id && explorerStore.gasAnalyticsEnabled && gasPrice">
            <v-divider vertical inset class="mx-2"></v-divider>
            Gas: <router-link class="text-decoration-none ml-1" :to="'/gas'">{{ gasPrice }}</router-link>
        </template>
        <div v-show="processingContracts">
            <v-divider vertical inset class="mx-2"></v-divider>
            <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
        </div>
        <v-spacer></v-spacer>
        <WalletConnector :key="2" />
    </v-toolbar>
</template>

<script>
const ethers = require('ethers');
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';
import { useEnvStore } from '../stores/env';
import { mapStores } from 'pinia';
import { formatContractPattern, shortRpcUrl } from '@/lib/utils';
import WalletConnector from './WalletConnector.vue';

const MINIMUM_DISPLAY_GWEI = 10000000;

export default {
    name: 'RpcConnector',
    components: {
        WalletConnector
    },
    data: () => ({
        searchSelectedItem: null,
        searchItems: [],
        isSearchLoading: false,
        searchType: null,
        showSearchBar: false,
        processingContracts: false,
        page: null,
        gasPrice: null
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
            if (this.currentWorkspaceStore.browserSyncEnabled == true)
                this.currentWorkspaceStore.startBrowserSync();
        }
        this.$pusher.onNewBlock(block => {
            if (block.number > this.currentWorkspaceStore.currentBlock.number)
                this.currentWorkspaceStore.updateCurrentBlock(block);
        }, this);

        if (this.explorerStore.id && this.explorerStore.gasAnalyticsEnabled) {
            this.$pusher.onNewBlockEvent(blockEvent => {
                if (blockEvent.gasPrice < 0)
                    this.gasPrice = '0 gwei';
            else if (blockEvent.gasPrice < MINIMUM_DISPLAY_GWEI)
                this.gasPrice = `<0.01 gwei`;
            else
                this.gasPrice = this.$fromWei(blockEvent.gasPrice, 'gwei', 'gwei', false, 2);
            }, this);
        }
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
            this.searchType = null;
            this.showSearchBar = false;
            this.searchSelectedItem = null;
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
        },
        search(val) {
            if (!val) {
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

            if (this.searchType == 'text' && val.length < 3)
                return;

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
    watch: {
        searchSelectedItem(item) {
            if (!item)
                return;

            switch(item.type) {
                case 'address':
                case 'contract':
                    this.$router.push({ path: `/address/${item.data.address}`, query: { tab: 'transactions' } });
                    break;
                case 'transaction':
                    this.$router.push({ path: `/transaction/${item.data.hash}` });
                    break;
                case 'block':
                    this.$router.push({ path: `/block/${item.data.number}` });
                    break;
            }
            this.clearSearchBar();
        }
    },
    computed: {
        ...mapStores(
            useCurrentWorkspaceStore,
            useEnvStore,
            useExplorerStore
        ),
        isUserAdmin() {
            return this.envStore.isAdmin;
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
