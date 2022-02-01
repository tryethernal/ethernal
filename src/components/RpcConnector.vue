<template>
    <v-toolbar dense flat class="grey lighten-3">
        Workspace: {{ currentWorkspace.name }} ({{ chain.name }})
        <v-divider vertical inset class="mx-2"></v-divider>
        {{ currentWorkspace.rpcServer }}
        <v-divider vertical inset class="mx-2"></v-divider>
        <span v-show="processingContracts">
            <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
        </span>
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
    data: () => ({
        processingContracts: false
    }),
    created: function() {
        if (auth().currentUser) {
            bus.$on('syncAccount', this.syncAccount);
        }

        this.server.getAccounts().then((data) => data.forEach(this.syncAccount));
        this.processContracts();
        this.db.onNewContract(this.processContracts);
    },
    methods: {
        syncAccount: function(account) {
            const lowercasedAccount = account.toLowerCase();
            this.server
                .getAccountBalance(lowercasedAccount)
                .then((data) => {
                    this.server.syncBalance(this.currentWorkspace.name, lowercasedAccount, ethers.BigNumber.from(data).toString());
                });
        },
        processContracts: function() {
            this.processingContracts = true;
            this.server.processContracts(this.currentWorkspace.name)
                .catch(console.log)
                .finally(() => this.processingContracts = false );
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'chain'
        ])
    }
});
</script>
