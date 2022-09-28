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
                        <span v-show="item.privateKey">
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
                            <v-btn id="resyncAllAccounts" :disabled="loading" v-bind="attrs" v-on="on" small depressed color="primary" class="mr-2" @click="syncAccounts()">
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
                <span v-if="item.balance">
                    {{ item.balance | fromWei('ether', chain.token)  }}
                </span>
                <span v-else>N/A</span>
            </template>
            <template v-slot:item.actions="{ item }">
                <a href="#" @click.prevent="openUnlockAccountModal(item)">Set Private Key</a>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import { bus } from '../bus';

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
    mounted() {
        this.pusher.onUpdatedAccount(() => this.getAccounts());
    },
    methods: {
        syncAccounts() {
            bus.$emit('syncAccounts');
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
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        openAddAccountModal() {
            this.$refs.addAccountModalRef.open()
                .then(refresh => {
                    if (refresh)
                        this.syncAccounts();
                });
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
