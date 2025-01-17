<template>
    <v-main>
        <v-container fluid>
            <v-skeleton-loader v-if="loading" type="list-item-three-line"></v-skeleton-loader>
            <template v-else-if="traceSteps.length">
                <Trace-Step v-for="step in traceSteps" :step="step" :key="step.id" />
            </template>
            <template v-else>Trace not available.</template>
        </v-container>
    </v-main>
</template>

<script>
import TraceStep from './TraceStep.vue';
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';

export default {
    name: 'TransactionTraceEmbedded',
    props: ['hash'],
    components: {
        TraceStep
    },
    data: () => ({
        loading: false,
        chain: { token: 'ether' },
        traceSteps: []
    }),
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.loading = true;
                this.$server.searchExplorer(window.location.host)
                .then(({ data: { explorer }}) => {
                    this.explorerStore.updateExplorer(explorer);
                    this.currentWorkspaceStore.updateCurrentWorkspace({ ...explorer.workspace, firebaseUserId: explorer.admin.firebaseUserId });

                    this.$server.getTransaction(hash)
                        .then(({ data: { traceSteps }}) => this.traceSteps = traceSteps || [])
                        .catch(console.log)
                        .finally(() => this.loading = false);
                })
                .catch(console.log);
            }
        }
    },
    computed: {
        ...mapStores(useExplorerStore, useCurrentWorkspaceStore)
    }
};
</script>
