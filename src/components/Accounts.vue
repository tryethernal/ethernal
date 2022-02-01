<template>
    <v-container fluid>
        <Add-Account-Modal ref="addAccountModalRef" />
        <Unlock-Account-Modal ref="openUnlockAccountModalRef" />
        <v-data-table
            :loading="loading"
            no-data-text="No Accounts"
            :items="accounts"
            :headers="headers">
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
                            <v-btn id="resyncAllAccounts" :disabled="loading" v-bind="attrs" v-on="on" small depressed color="primary" class="mr-2" @click="syncAll()">
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
        loading: false
    }),
    mounted: function() {
        this.loading = true;
        this.$bind('accounts', this.db.collection('accounts'), { serialize: (snapshot) => {
            return {
                address: snapshot.id,
                balance: snapshot.data().balance,
                unlocked: snapshot.data().privateKey ? true : false
            };
        }})
        .then(accounts => {
            this.loading = false;
            accounts.forEach(this.syncAccount);
        })
    },
    methods: {
        syncAccount: function(account) {
            this.server
                .getAccountBalance(account)
                .then((data) => {
                    this.server.syncBalance(this.currentWorkspace.name, account, ethers.BigNumber.from(data).toString());
                });
        },
        syncAll: function() {
            this.loading = true;
            this.server.getAccounts().then(accounts => {
                accounts.forEach(this.syncAccount, this);
                this.loading = false;
            });
        },
        openAddAccountModal: function() {
            this.$refs.addAccountModalRef.open();
        },
        openUnlockAccountModal: function(account) {
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
