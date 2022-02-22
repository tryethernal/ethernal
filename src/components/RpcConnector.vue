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
        if (auth().currentUser) {
            bus.$on('syncAccount', this.syncAccount);
        }
        this.page = this.$route.path;
        this.isFeedbackFishEnabled = !!process.env.VUE_APP_FEEDBACK_FISH_PID;
        this.server.getAccounts().then((data) => data.forEach(this.syncAccount));
        this.processContracts();
        this.db.onNewContract(this.processContracts);
        this.db.onNewTransactionCount((count) => this.$store.dispatch('updateTransactionCount', count));
        this.db.onNewBlockCount((count) => this.$store.dispatch('updateBlockCount', count));
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
            'user'
        ])
    }
});
</script>
