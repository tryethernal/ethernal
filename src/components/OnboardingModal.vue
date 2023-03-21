<template>
    <v-dialog v-model="dialog" max-width="1000" :persistent="true">
        <v-stepper vertical v-model="stepperIndex">
            <h3 class="ml-6 mt-4">Ethernal Onboarding</h3>
            <v-stepper-step step="1" :complete="stepperIndex > 1">
                Create a new workspace
                <small v-show="stepperIndex > 1">{{ currentWorkspace.name }} - {{ currentWorkspace.rpcServer }}</small>
            </v-stepper-step>
            <v-stepper-content step="1">
                <span class="text-body-2">Workspaces allow you to separate your different projects/server. You'll be able to add more and switch between them later.</span>
                <Create-Workspace :existingWorkspaces="[]" @workspaceCreated="onWorkspaceCreated" />
            </v-stepper-content>

            <v-stepper-step step="2" :complete="stepperIndex > 3">Listening for blocks</v-stepper-step>
            <v-stepper-content step="3">
                <p v-if="!canExit">
                    Waiting for a block...
                    <v-progress-linear indeterminate color="primary" class="mb-0" ></v-progress-linear>
                </p>
                <p v-else>
                    Block received, your dashboard is ready!
                </p>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn outlined color="primary" @click="stepperIndex = 2">Back</v-btn>
                    <v-btn :outlined="!canExit" color="primary" :disabled="!canExit" @click="goToDashboard()">Go to Dashboard</v-btn>
                </v-card-actions>
            </v-stepper-content>
        </v-stepper>
    </v-dialog>
</template>
<script>
import CreateWorkspace from './CreateWorkspace';
import { mapGetters } from 'vuex';
import Vue from 'vue';
import { pusherPlugin } from '../plugins/pusher';
import store from '../plugins/store';

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
    }),
    methods: {
        onWorkspaceCreated: async function(workspace) {
            this.stepperIndex = 2;
            this.$store.dispatch('updateCurrentWorkspace', workspace)
                .then(() => {
                    Vue.use(pusherPlugin, { store: store });
                    this.pusher.onNewBlock(() => this.canExit = true, this);
                });
        },
        goToDashboard: function() {
            document.location.href = '/transactions';
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
        ...mapGetters([
            'currentWorkspace',
            'user'
        ])
    }
}
</script>
