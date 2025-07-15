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
                    :items-length="accountCount"
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
                            {{ fromWei(item.balance, 'ether', currentWorkspaceStore.chain.token) }}
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
<script setup>
import { ref, inject, onMounted, onUnmounted } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useEnvStore } from '../stores/env';
import { useExplorerStore } from '../stores/explorer';
import AddAccountModal from './AddAccountModal.vue';
import UnlockAccountModal from './UnlockAccountModal.vue';
import HashLink from './HashLink.vue';
import fromWei from '../filters/FromWei';
import { ethers } from 'ethers';

const $server = inject('$server');
const $pusher = inject('$pusher');

const addAccountModalRef = ref();
const openUnlockAccountModalRef = ref();

const currentWorkspaceStore = useCurrentWorkspaceStore();
const envStore = useEnvStore();
const explorerStore = useExplorerStore();

const accounts = ref([]);
const accountCount = ref(0);
const loading = ref(false);
const currentOptions = ref({ page: 1, itemsPerPage: 10, orderBy: 'address', order: 'desc' });
const headers = ref([
    { title: 'Address', key: 'address' },
    { title: 'Balance', key: 'balance' }
]);

let pusherUnsubscribe = null;

onMounted(() => {
    pusherUnsubscribe = $pusher.onUpdatedAccount(() => getAccounts());
    if (envStore.isAdmin) {
        headers.value.push({ title: 'Actions', key: 'actions' });
    }
});

onUnmounted(() => {
    if (pusherUnsubscribe) pusherUnsubscribe();
});

function syncAccounts() {
    loading.value = true;
    const rpcServer = explorerStore.rpcServer || currentWorkspaceStore.rpcServer;
    $server.getRpcAccounts(rpcServer)
        .then(accs => {
            const promises = [];
            for (let i = 0; i < accs.length; i++)
                promises.push($server.syncBalance(accs[i], '0'));
            Promise.all(promises).then(() => getAccounts(currentOptions.value));
        })
        .catch(() => loading.value = false);
}

function getAccounts({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;
    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        loading.value = false;
        return;
    }
    if (
        currentOptions.value.page == page &&
        currentOptions.value.itemsPerPage == itemsPerPage &&
        currentOptions.value.sortBy == sortBy[0].key &&
        currentOptions.value.sort == sortBy[0].order
    ) {
        loading.value = false;
        return;
    }
    currentOptions.value = {
        page,
        itemsPerPage,
        orderBy: sortBy[0].key,
        order: sortBy[0].order
    };
    $server.getAccounts(currentOptions.value)
        .then(({ data }) => {
            currentWorkspaceStore.updateAccounts(data.items);
            accounts.value = data.items;
            accountCount.value = data.total;
            for (let i = 0; i < accounts.value.length; i++) {
                $server.getAccountBalance(accounts.value[i].address)
                    .then(rawBalance => {
                        const balance = ethers.BigNumber.from(rawBalance).toString();
                        accounts.value[i].balance = balance;
                    });
            }
        })
        .catch(console.log)
        .finally(() => loading.value = false);
}

function openAddAccountModal() {
    addAccountModalRef.value.open()
        .then(refresh => {
            if (refresh)
                getAccounts(currentOptions.value);
        });
}

function openUnlockAccountModal(account) {
    openUnlockAccountModalRef.value.open({ address: account.address });
}
</script>
