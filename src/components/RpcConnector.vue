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

        this.server.getBlocks({ page: 1, itemsPerPage: 1 }).then(({ data: { items }}) => {
            if (items.length) {
                this.$store.dispatch('updateCurrentBlock', items[0]);
            }
        });

        if (!this.isPublicExplorer) {
            this.processContracts();
            this.processTransactions();
            this.processFailedTransactions();
            this.pusher.onNewContract(this.processContracts, this);
            this.pusher.onNewProcessableTransactions((transaction) => this.server.processTransactions(this.currentWorkspace, [transaction]), this);
            this.pusher.onNewFailedTransactions((transaction) => this.server.processFailedTransactions([transaction], this.currentWorkspace), this);
        }
        this.pusher.onNewBlock((block) => this.$store.dispatch('updateCurrentBlock', block), this);
    },
    methods: {
        processContracts: function() {
            this.processingContracts = true;
            this.server.processContracts(this.currentWorkspace.name)
                .catch(console.log)
                .finally(() => this.processingContracts = false );
        },
        processTransactions: function() {
            this.server.getProcessableTransactions()
                .then(({ data }) => this.server.processTransactions(this.currentWorkspace, data))
                .catch(console.log);
        },
        processFailedTransactions: function() {
            this.server.getFailedProcessableTransactions()
                .then(({ data }) => this.server.processFailedTransactions(data, this.currentWorkspace))
                .catch(console.log);
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
