<template>
    <v-toolbar dense flat class="grey lighten-3">
        Workspace: {{ currentWorkspace.name }}
        <v-divider vertical inset class="mx-2"></v-divider>
        <v-icon class="mr-1" small :color="connected ? 'green darken-2' : 'red darken-2'">mdi-checkbox-blank-circle</v-icon>
        {{ connected ? `Connected to ${currentWorkspace.rpcServer}` : 'Not connected' }}
        <v-divider vertical inset class="mx-2"></v-divider>
        Network Id: {{ connected ? currentWorkspace.networkId : '/' }}
        <v-divider vertical inset class="mx-2"></v-divider>
        Current Block: {{ connected ? currentBlock : '/' }}
    </v-toolbar>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';

import { auth } from '../plugins/firebase.js';
import { bus } from '../bus.js';

const Web3 = require('web3');

export default Vue.extend({
    name: 'RpcConnector',
    data: () => ({
        web3: null,
        connected: false
    }),
    created: function() {
        if (auth().currentUser) {
            this.initWeb3();
        }
    },
    methods: {
        initWeb3: function() {
            this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.currentWorkspace.rpcServer));
            this.web3.eth.net.isListening()
                .then(isListening => {
                    if (isListening === true)
                        this.connect();
                    else
                        setTimeout(this.initWeb3, 5 * 1000);
                })
                .catch(() => setTimeout(this.initWeb3, 5 * 1000));
        },
        connect: function() {
            this.web3.eth.getBlockNumber().then(blockNumber => this.$store.dispatch('updateCurrentBlock', blockNumber));
            this.web3.eth.subscribe('newBlockHeaders')
                .on('error', this.onError);
            this.web3.eth.getAccounts().then(accounts => accounts.forEach(this.syncAccount));
            bus.$on('syncAccount', this.syncAccount);
            this.connected = true;
        },
        onError: function(error) {
            if (error)
                console.log(error);
            this.connected = false;
            setTimeout(this.initWeb3, 5 * 1000);
        },
        syncAccount: function(account) {
            this.web3.eth.getBalance(account).then(balance => this.db.collection('accounts').doc(account).set({ balance: balance }));
        }
    },
    computed: {
        ...mapGetters([
            'networkId',
            'settings',
            'currentBlock',
            'currentWorkspace'
        ])
    }
});
</script>
