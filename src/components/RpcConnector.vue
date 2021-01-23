<template>
    <v-toolbar dense flat class="grey lighten-3 fixed">
        Workspace: {{ currentWorkspace }}
        <v-divider vertical inset class="mx-2"></v-divider>
        <v-icon class="mr-1" small :color="connected ? 'green darken-2' : 'red darken-2'">mdi-checkbox-blank-circle</v-icon>
        {{ connected ? `Connected to ${settings.rpcServer}` : 'Not connected' }}
        <v-divider vertical inset class="mx-2"></v-divider>
        Network Id: {{ connected ? networkId : '/' }}
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
    props: ['rpcServer'],
    data: () => ({
        connected: false,
        web3: null
    }),
    created: function() {
        if (auth().currentUser) {
            this.connect();
        }
    },
    methods: {
        connect: function() {
            this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.settings.rpcServer));
            this.web3.eth.net.getId().then(networkId => this.$store.dispatch('updateNetworkId', networkId));
            this.web3.eth.getBlockNumber().then(blockNumber => this.$store.dispatch('updateCurrentBlock', blockNumber));
            this.web3.eth.subscribe('newBlockHeaders')
                .on('connected', this.onConnected)
                .on('data', this.onNewBlock)
                .on('error', this.onError);
            bus.$on('syncAccount', this.syncAccount);
        },
        disconnect: function() {
            this.web3.eth.clearSubscriptions();
            this.connected = false;
        },
        onConnected: function() {
            this.connected = true;
            this.db.collection('accounts').get().then(doc => {
                if (doc.empty) {
                    this.web3.eth.getAccounts().then(accounts => {
                        accounts.forEach(function(account) {
                            this.db.collection('accounts').doc(account).set({ address: account, balance: '0' }).then(() => this.syncAccount(account));
                        }, this);
                    });
                }
                else {
                    doc.forEach(account => this.syncAccount(account.id), this);
                }
            })
        },
        onError: function(error) {
            if (error)
                console.log(error);
            this.connected = false;
            this.web3.eth.clearSubscriptions();
            setTimeout(this.connect, 5 * 1000);
        },
        onNewBlock: function(blockHeader, error) {
            if (error)
                return console.log(error);

            this.web3.eth.getBlock(blockHeader.hash, true).then(this.syncBlock);
        },
        syncAccount: function(account) {
            this.web3.eth.getBalance(account).then(balance => this.db.collection('accounts').doc(account).update({ balance: balance }));
        },
        syncBlock: function(block) {
            var sBlock = JSON.parse(JSON.stringify(block));
            this.db.collection('blocks').doc(sBlock.number.toString()).set(sBlock);
            this.$store.dispatch('updateCurrentBlock', block.number);

            sBlock.transactions.forEach(transaction => {
                this.web3.eth.getTransactionReceipt(transaction.hash).then(receipt => this.syncTransaction(sBlock, transaction, receipt));
            }, this);
        },
        syncTransaction: function(block, transaction, transactionReceipt) {
            var sTransaction = JSON.parse(JSON.stringify(transaction));
            var txSynced = {
                ...sTransaction,
                receipt: transactionReceipt,
                timestamp: block.timestamp
            }
            this.db.collection('transactions').doc(sTransaction.hash).set(txSynced);

            bus.$emit(`tx-${transaction.to}`, txSynced);
            bus.$emit(`tx-${transaction.from}`, txSynced);

            if (transaction.to === null) {
                var contractAddress = transactionReceipt.contractAddress;
                this.db.collection('contracts').doc(contractAddress).set({ address: contractAddress });
            }
        }
    },
    computed: {
        ...mapGetters([
            'networkId',
            'settings',
            'currentBlock',
            'currentWorkspace'
        ])
    },
    updated: function(){
        this.connect();
    },
    beforeDestroy: function() {
        this.disconnect();
    },
});
</script>
