<template>
    <v-container fluid>
        <v-card>
            <v-card-text>
                <Add-Account-Modal ref="addAccountModalRef" v-if="envStore.isAdmin" />
                <Unlock-Account-Modal ref="openUnlockAccountModalRef" v-if="envStore.isAdmin" />
                <v-data-table-server
                    class="hide-table-count"
                    :loading="loading"
                    no-data-text="No accounts available"
                    :items="accounts"
                    :items-length="0"
                    :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
                    :must-sort="true"
                    items-per-page-text="Rows per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    :headers="headers"
                    @update:options="getAccounts">
                    <template v-slot:item.address="{ item }">
                        <v-tooltip location="top">
                            <template v-slot:activator="{ props }">
                                <span v-show="item.privateKey">
                                    <v-icon v-bind="props" size="small" class="mr-2">mdi-lock-open-outline</v-icon>
                                </span>
                            </template>
                            <span>Account has been unlocked with private key.</span>
                        </v-tooltip>
                        <Hash-Link :type="'address'" :hash="item.address" />
                    </template>
                    <template v-slot:top>
                        <div class="d-flex justify-end">
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props }">
                                    <v-btn id="resyncAllAccounts" :disabled="loading" v-bind="props" size="small" variant="flat" color="primary" class="mr-2" @click="syncAccounts()">
                                        <v-icon size="small" class="mr-1">mdi-sync</v-icon>Resync
                                    </v-btn>
                                </template>
                                This will send a request with the 'eth_accounts' method to the RPC server, and add returned addresses to your accounts list.
                            </v-tooltip>
                            <v-btn size="small" variant="flat" color="primary" class="mr-2" @click="openAddAccountModal()">
                                <v-icon size="small" class="mr-1">mdi-plus</v-icon>Add Account
                            </v-btn>
                        </div>
                    </template>
                    <template v-slot:item.balance="{ item }">
                        <span v-if="item.balance">
                            {{ $fromWei(item.balance, 'ether', currentWorkspaceStore.chain.token) }}
                        </span>
                        <span v-else>N/A</span>
                    </template>
                    <template v-slot:item.actions="{ item }" v-if="envStore.isAdmin">
                        <a href="#" @click.prevent="openUnlockAccountModal(item)">Set Private Key</a>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
const ethers = require('ethers');
import { mapStores } from 'pinia';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useEnvStore } from '../stores/env';

import AddAccountModal from './AddAccountModal.vue';
import UnlockAccountModal from './UnlockAccountModal.vue';
import HashLink from './HashLink.vue';

export default {
    name: 'Accounts',
    components: {
        HashLink,
        AddAccountModal,
        UnlockAccountModal
    },
    data: () => ({
        accounts: [],
        accountCount: 0,
        headers: [
            { title: 'Address', key: 'address' },
            { title: 'Balance', key: 'balance' }
        ],
        loading: false,
        currentOptions: { page: 1, itemsPerPage: 10, orderBy: 'address', order: 'desc' },
        pusherUnsubscribe: null
    }),
    mounted() {
        this.pusherUnsubscribe = this.$pusher.onUpdatedAccount(() => this.getAccounts());
        if (this.envStore.isAdmin)
            this.headers.push({ title: 'Actions', key: 'actions' });
    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        syncAccounts() {
            this.loading = true;
            this.$server.getRpcAccounts(this.currentWorkspaceStore.rpcServer)
                .then(accounts => {
                    const promises = [];
                    for (let i = 0; i < accounts.length; i++)
                        promises.push(this.$server.syncBalance(accounts[i], '0'));

                    Promise.all(promises).then(() => this.getAccounts(this.currentOptions));
                })
                .catch(() => this.loading = false);
        },
        getAccounts({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            if (this.currentOptions.page == page && this.currentOptions.itemsPerPage == itemsPerPage && this.currentOptions.sortBy == sortBy[0].key && this.currentOptions.sort == sortBy[0].order)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order
            };

            this.$server.getAccounts(this.currentOptions)
                .then(({ data }) => {
                    this.currentWorkspaceStore.updateAccounts(data.items);
                    this.accounts = data.items;
                    this.accountCount = data.total;
                    for (let i = 0; i < this.accounts.length; i++) {
                        this.$server.getAccountBalance(this.accounts[i].address)
                            .then(rawBalance => {
                                const balance = ethers.BigNumber.from(rawBalance).toString();
                                this.accounts[i].balance = balance;
                            });
                    }
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        openAddAccountModal() {
            this.$refs.addAccountModalRef.open()
                .then(refresh => {
                    if (refresh)
                        this.getAccounts();
                });
        },
        openUnlockAccountModal(account) {
          this.$refs.openUnlockAccountModalRef.open({ address: account.address })
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore, useEnvStore),
    }
}
</script>
