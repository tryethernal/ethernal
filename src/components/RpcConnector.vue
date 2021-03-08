<template>
    <v-toolbar dense flat class="grey lighten-3">
        Workspace: {{ currentWorkspace.name }}
        <v-spacer></v-spacer>
        <a href="https://doc.tryethernal.com" target="_blank">Documentation</a>
        <v-divider vertical inset class="mx-2"></v-divider>
        <a href="https://github.com/tryethernal/support/discussions" target="_blank">Community / Help</a>
    </v-toolbar>
</template>

<script>
import Vue from 'vue';
import Web3 from 'web3';
import { mapGetters } from 'vuex';

import { auth } from '../plugins/firebase.js';
import { bus } from '../bus.js';
import { getProvider } from '../lib/utils.js';

export default Vue.extend({
    name: 'RpcConnector',
    data: () => ({
        web3: null,
    }),
    created: function() {
        if (auth().currentUser) {
            this.web3 = new Web3(getProvider(this.currentWorkspace.rpcServer));
            bus.$on('syncAccount', this.syncAccount);
            this.web3.eth.getAccounts().then(accounts => accounts.forEach(this.syncAccount));
        }
    },
    methods: {
        syncAccount: function(account) {
            this.web3.eth.getBalance(account).then(balance => this.db.collection('accounts').doc(account).set({ balance: balance }));
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
});
</script>
