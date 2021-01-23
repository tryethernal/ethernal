<template>
    <v-container fluid>
        <Add-Account-Modal ref="addAccountModalRef" />
        <v-data-table
            loading="true"
            :items="accounts"
            :headers="headers">
            <template v-slot:top>
                <v-toolbar flat dense class="py-0">
                    <v-spacer></v-spacer>
                    <v-btn depressed color="primary" class="mr-2" @click="openAddAccountModal()"><v-icon>mdi-plus</v-icon>Add Account</v-btn>
                </v-toolbar>
            </template>
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.balance="{ item }">
                {{ item.balance | fromWei  }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import { bus } from '../bus';

import AddAccountModal from './AddAccountModal';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'Accounts',
    components: {
        HashLink,
        AddAccountModal
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
            }
        ]
    }),
    mounted: function() {
        this.$bind('accounts', this.db.collection('accounts'), { serialize: snapshot => Object.defineProperty(snapshot.data(), 'address', { value: snapshot.id })})
            .then(accounts => {
                accounts.forEach(account => bus.$emit('syncAccount', account.address), this);
            })

    },
    methods: {
        openAddAccountModal: function() {
            this.$refs.addAccountModalRef.open()
        }
    }
}
</script>
