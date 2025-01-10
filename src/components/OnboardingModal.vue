<template>
    <v-dialog v-model="dialog" max-width="1000" :persistent="true">
        <v-card>
            <v-card-title>
                <h4>Ethernal Onboarding</h4>
            </v-card-title>
            <v-stepper-vertical flat v-model="stepperIndex">
                <v-stepper-vertical-item step="0" value="1" :complete="stepperIndex > 0">
                    <template v-slot:title>
                        Create a new workspace
                        <small v-show="stepperIndex > 1">{{ currentWorkspaceStore.name }} - {{ currentWorkspaceStore.rpcServer }}</small>
                    </template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <span class="text-body-2">Workspaces allow you to separate your different projects/server. You'll be able to add more and switch between them later.</span>
                    <Create-Workspace @workspaceCreated="onWorkspaceCreated" />
                </v-stepper-vertical-item>

                <v-stepper-vertical-item step="1" value="2" :complete="stepperIndex > 1">
                    <template v-slot:title>Start synchronizing</template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <p v-if="!canExit">
                        Waiting for a block...
                        <v-progress-linear indeterminate color="primary" class="mb-0" ></v-progress-linear>
                    </p>
                    <p v-else>
                        Block received, your dashboard is ready!
                    </p>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn variant="flat" color="primary" :disabled="!canExit" @click="goToDashboard()">Go to Dashboard</v-btn>
                    </v-card-actions>
                </v-stepper-vertical-item>
            </v-stepper-vertical>
        </v-card>
    </v-dialog>
</template>
<script>
import CreateWorkspace from './CreateWorkspace.vue';
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
        stepperIndex: 0,
        canExit: false,
        pusherChannelHandler: null
    }),
    methods: {
        onWorkspaceCreated(workspace) {
            this.stepperIndex = 2;
            this.currentWorkspaceStore.updateCurrentWorkspace(workspace);
            this.$pusher.init();
            this.currentWorkspaceStore.startBrowserSync();
            this.pusherChannelHandler = this.$pusher.onNewBlock(() => {
                this.canExit = true;
                this.pusherChannelHandler.unbind(null, null, this);
            }, this);
        },
        goToDashboard() {
            document.location.href = '/blocks';
        },
        open() {
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
