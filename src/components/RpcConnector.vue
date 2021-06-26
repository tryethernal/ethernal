<template>
    <v-toolbar dense flat class="grey lighten-3">
        Workspace: {{ currentWorkspace.name }}
        <v-divider vertical inset class="mx-2"></v-divider>
        {{ currentWorkspace.rpcServer }}
        <v-spacer></v-spacer>
        <a href="https://doc.tryethernal.com" target="_blank">Documentation</a>
        <v-divider vertical inset class="mx-2"></v-divider>
        <a href="https://discord.gg/jEAprf45jj" target="_blank">Discord</a>
    </v-toolbar>
</template>

<script>
const ethers = require('ethers');
import Vue from 'vue';
import { mapGetters } from 'vuex';

import { auth } from '../plugins/firebase.js';
import { bus } from '../bus.js';

export default Vue.extend({
    name: 'RpcConnector',
    created: function() {
        if (auth().currentUser) {
            bus.$on('syncAccount', this.syncAccount);
        }

        this.server.getAccounts()
            .then((data) => data.forEach(this.syncAccount));
    },
    methods: {
        syncAccount: function(account) {
            this.server
                .getAccountBalance(account)
                .then((data) => {
                    this.server.syncBalance(this.currentWorkspace.name, account, ethers.BigNumber.from(data).toString());
                });
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
});
</script>
