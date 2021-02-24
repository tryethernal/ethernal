<template>
    <v-dialog v-model="dialog" max-width="600" :persistent="true">
        <v-stepper vertical v-model="stepperIndex">
            <h3 class="ml-6 mt-4">Ethernal Onboarding</h3>
            <v-stepper-step step="1" :complete="stepperIndex > 1">
                Create a new workspace
                <small v-show="stepperIndex > 1">{{ currentWorkspace.name }} - {{ currentWorkspace.rpcServer }}</small>
            </v-stepper-step>
            <v-stepper-content step="1">
                <span class="text-body-2">Workspaces allow you to separate your different projects/blockchains. You'll be able to add more and switch between them in the "Settings" tab.</span>
                <Create-Workspace @workspaceCreated="onWorkspaceCreated" />
            </v-stepper-content>

            <v-stepper-step step="2" :complete="stepperIndex > 2">Set up the CLI</v-stepper-step>
            <v-stepper-content step="2">
                <p>
                    Ethernal uses a <a href="https://www.npmjs.com/package/ethernal" target="_blank">CLI</a> to synchronize your transactions and display them on your dashboard (<a href="https://doc.tryethernal.com" target="_blank">doc</a>).
                </p>
                <p>
                    Install it with <code>npm install ethernal -g</code>
                </p>
                <p>
                    And sign-in with <code>ethernal login</code>
                </p>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="stepperIndex = 3">Next</v-btn>
                </v-card-actions>
            </v-stepper-content>

            <v-stepper-step step="3" :complete="stepperIndex > 3">Listen for transactions</v-stepper-step>
            <v-stepper-content step="3">
                <p>
                    Run <code>ethernal listen</code> to listen to transactions (<a href="https://doc.tryethernal.com" target="_blank">doc</a>).
                </p>
                <p v-if="!transactions.length">
                    Waiting for your first transaction...
                    <v-progress-linear indeterminate color="primary" class="mb-0" ></v-progress-linear>
                </p>
                <p v-else>
                    Transaction received, your dashboard is ready!
                </p>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn outlined color="primary" @click="stepperIndex = 2">Back</v-btn>
                    <v-btn :outlined="!transactions.length" color="primary" :disabled="!transactions.length" @click="goToDashboard()">Go to Dashboard</v-btn>
                </v-card-actions>
            </v-stepper-content>
        </v-stepper>
    </v-dialog>
</template>
<script>
import CreateWorkspace from './CreateWorkspace';
import { mapGetters } from 'vuex';

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
        transactions: []
    }),
    methods: {
        onWorkspaceCreated: function(workspace) {
            this.$store.dispatch('updateCurrentWorkspace', workspace);
            this.stepperIndex = 2;
            this.$bind('transactions', this.db.collection('transactions'))
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
            'currentWorkspace'
        ])
    }
}
</script>
