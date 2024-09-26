<template>
    <v-dialog v-model="dialog" max-width="1000" :persistent="true">
        <v-stepper-vertical v-model="stepperIndex">
            <template v-slot:title>
                <h3 class="ml-6 mt-4">Ethernal Onboarding</h3>
            </template>

            <v-stepper-vertical-item step="1" :complete="stepperIndex > 1">
                <template v-slot:title>
                    Create a new workspace
                    <small v-show="stepperIndex > 1">{{ currentWorkspace.name }} - {{ currentWorkspace.rpcServer }}</small>
                </template>
                <span class="text-body-2">Workspaces allow you to separate your different projects/server. You'll be able to add more and switch between them later.</span>
                <Create-Workspace @workspaceCreated="onWorkspaceCreated" />
            </v-stepper-vertical-item>

            <v-stepper-vertical-item step="2" :complete="stepperIndex > 2">
                <template v-slot:title>Start synchronizing</template>
                <p v-if="!canExit">
                    Waiting for a block...
                    <v-progress-linear indeterminate color="primary" class="mb-0" ></v-progress-linear>
                </p>
                <p v-else>
                    Block received, your dashboard is ready!
                </p>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :variant="!canExit ? 'outlined' : undefined" color="primary" :disabled="!canExit" @click="goToDashboard()">Go to Dashboard</v-btn>
                </v-card-actions>
            </v-stepper-vertical-item>
        </v-stepper-vertical>
    </v-dialog>
</template>
<script>
import CreateWorkspace from './CreateWorkspace';
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

export default {
    name: 'OnboardingModal',
    components: {
        CreateWorkspace
    },
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        stepperIndex: 1,
        canExit: false,
        pusherChannelHandler: null
    }),
    methods: {
        onWorkspaceCreated: async function(workspace) {
            this.stepperIndex = 2;
            this.currentWorkspaceStore.updateCurrentWorkspace(workspace)
            this.currentWorkspaceStore.updateBrowserSyncStatus(true);
            this.pusherChannelHandler = this.$pusher.onNewBlock(() => {
                this.canExit = true;
                this.pusherChannelHandler.unbind(null, null, this);
            }, this);
        },
        goToDashboard: function() {
            document.location.href = '/blocks';
        },
        open: function() {
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore)
    }
}
</script>
