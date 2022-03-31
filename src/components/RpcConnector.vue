<template>
    <v-toolbar style="border-bottom: thin solid rgba(0, 0, 0, 0.12)" dense flat class="px-5 color--text">
        <template v-if="isPublicExplorer">
            {{ chain.name }}
        </template>
        <template v-else>
            Workspace: {{ currentWorkspace.name }} ({{ chain.name }})
        </template>
        <template v-if="!isPublicExplorer">
            <v-divider vertical inset class="mx-2"></v-divider>
            {{ currentWorkspace.rpcServer }}
        </template>
        <div v-show="currentBlock.number">
            <v-divider vertical inset class="mx-2"></v-divider>
            Latest Block: <router-link :to="'/block/' + currentBlock.number">{{ currentBlock.number }}</router-link>
        </div>
        <div v-show="processingContracts">
            <v-divider vertical inset class="mx-2"></v-divider>
            <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
        </div>
        <v-spacer></v-spacer>
        <a v-if="isFeedbackFishEnabled" data-feedback-fish :data-feedback-fish-userid="user.email" :data-feedback-fish-page="page">
            <v-icon color="primary" class="mr-1">mdi-comment-quote</v-icon>Feedback?
        </a>
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
        processingContracts: false,
        page: null,
        isFeedbackFishEnabled: false,
    }),
    created: function() {
        if (auth().currentUser && !this.isPublicExplorer) {
            bus.$on('syncAccount', this.syncAccount);
        }
        this.page = this.$route.path;
        this.isFeedbackFishEnabled = !!process.env.VUE_APP_FEEDBACK_FISH_PID;

        if (!this.isPublicExplorer) {
            this.server.getAccounts().then((data) => data.forEach(this.syncAccount));
            this.processContracts();
            this.db.onNewContract(this.processContracts);
            this.db.onNewProcessableTransactions(this.server.processTransactions);
            this.db.onNewFailedTransactions(this.server.processFailedTransactions);
        }
        this.db.onNewTransactionCount((count) => this.$store.dispatch('updateTransactionCount', count));
        this.db.onNewBlockCount((count) => this.$store.dispatch('updateBlockCount', count));
        this.db.onNewBlock((block) => this.$store.dispatch('updateCurrentBlock', block));
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
            'chain',
            'user',
            'isPublicExplorer',
            'currentBlock'
        ])
    }
});
</script>
