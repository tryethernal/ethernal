<template>
    <v-container fluid>
        <Add-Account-Modal ref="addAccountModalRef" />
        <Unlock-Account-Modal ref="openUnlockAccountModalRef" />
        <v-data-table
            :loading="loading"
            no-data-text="No Accounts"
            :items="accounts"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="accountCount"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            :headers="headers"
            @update:options="getAccounts">
            <template v-slot:no-data>
                No Accounts Available - Try to resync them.
            </template>
            <template v-slot:item.address="{ item }">
                <v-tooltip top>
                    <template v-slot:activator="{ on, attrs }">
                        <span v-show="item.unlocked">
                            <v-icon v-bind="attrs" v-on="on" small class="mr-2">mdi-lock-open-outline</v-icon>
                        </span>
                    </template>
                    <span>Account has been unlocked with private key.</span>
                </v-tooltip>
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:top>
                <v-toolbar flat dense class="py-0">
                    <v-spacer></v-spacer>
                    <v-tooltip bottom>
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn id="resyncAllAccounts" :disabled="loading" v-bind="attrs" v-on="on" small depressed color="primary" class="mr-2" @click="getRpcAccounts()">
                                <v-icon small class="mr-1">mdi-sync</v-icon>Resync
                            </v-btn>
                        </template>
                        This will send a request with the 'eth_accounts' method to the RPC server, and add returned addresses to your accounts list.
                    </v-tooltip>
                    <v-btn small depressed color="primary" class="mr-2" @click="openAddAccountModal()">
                        <v-icon small class="mr-1">mdi-plus</v-icon>Add Account
                    </v-btn>
                </v-toolbar>
            </template>
            <template v-slot:item.balance="{ item }">
                {{ item.balance | fromWei('ether', chain.token)  }}
            </template>
            <template v-slot:item.actions="{ item }">
                <a href="#" @click.prevent="openUnlockAccountModal(item)">Set Private Key</a>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';

import AddAccountModal from './AddAccountModal';
import UnlockAccountModal from './UnlockAccountModal';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'Accounts',
    components: {
        HashLink,
        AddAccountModal,
        UnlockAccountModal
    },
    filters: {
        FromWei
    },
    data: () => ({
        accounts: [],
        accountCount: 0,
        headers: [
            {
                text: 'Address',
                value: 'address'
            },
            {
                text: 'Balance',
                value: 'balance'
            },
            {
                text: 'Actions',
                value: 'actions'
            }
        ],
        loading: false,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['address'], sortDesc: [true] }
    }),
    methods: {
        getRpcAccounts() {
            this.loading = true;
            this.server.getRpcAccounts(this.currentWorkspace.rpcServer)
                .then((accounts) => {
                    this.syncAccounts(accounts);
                    this.accountCount = accounts.length;
                })
                .catch(error => {
                    console.log(error)
                    this.loading = false;
                });
        },
        getAccounts(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };
            this.server.getAccounts(options)
                .then(({ data }) => {
                    this.accounts = data.items;
                    this.accountCount = data.total;
                    if (this.accountCount > 0)
                        this.syncAccounts(this.accounts.map(account => account.address));
                    else
                        this.getRpcAccounts();
                })
                .catch(error => {
                    console.log(error);
                });
        },
        syncAccounts(accounts) {
            this.accounts = [];
            this.loading = true;
            accounts.forEach(address => {
                this.server.getAccountBalance(address)
                    .then(rawBalance => {
                        const balance = ethers.BigNumber.from(rawBalance).toString();
                        this.server.syncBalance(address, balance)
                            .then(() => {
                                this.accounts.push({ address: address, balance: balance });
                            });
                    });
            });
            this.loading = false;
        },
        openAddAccountModal() {
            this.$refs.addAccountModalRef.open();
        },
        openUnlockAccountModal(account) {
          this.$refs.openUnlockAccountModalRef.open({ address: account.address })
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain'
        ])
    }
}
</script>
