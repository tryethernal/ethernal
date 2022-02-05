<template>
    <v-dialog v-model="dialog" max-width="600" :persistent="true">
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

            <v-stepper-step step="2" :complete="stepperIndex > 2">Set up the client</v-stepper-step>
            <v-stepper-content step="2">
                <p>
                    Install the <a href="https://github.com/tryethernal/ethernal-cli" target="_blank">CLI</a> with <code>npm install ethernal -g</code>
                </p>
                <p>
                    And sign-in with <code>ethernal login</code>
                </p>
                <p>
                    If you have troubles signing in with <code>ethernal login</code>, you can run the <code>ethernal</code> CLI or Hardhat commands with env variables instead: <code>ETHERNAL_EMAIL=your@email.com ETHERNAL_PASSWORD=pwd npx hardhat node for example.</code>
                </p>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="stepperIndex = 3">Next</v-btn>
                </v-card-actions>
            </v-stepper-content>

            <v-stepper-step step="3" :complete="stepperIndex > 3">Listen for transactions</v-stepper-step>
            <v-stepper-content step="3">
                <h5>For Ganache</h5>
                <p>
                    Run <code>ethernal listen</code> to listen to transactions (<a href="https://doc.tryethernal.com/getting-started/cli" target="_blank">doc</a>).
                </p>
                <h5>For Hardhat</h5>
                <p>
                    Add the <a href="https://github.com/tryethernal/hardhat-ethernal" target="_blank">plugin</a> to your project with <code>yarn add hardhat-ethernal</code><br>
                </p>
                <p>
                    Add <code>require('hardhat-ethernal');</code> in your <code>hardhat-config.js</code> file.
                </p>
                <p>
                    Restart your Hardhat node and you are good to go :) the plugin will automatically synchronize all blocks and transactions.
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
        onWorkspaceCreated: async function(workspaceData) {
            this.stepperIndex = 2;
            this.server.setCurrentWorkspace(workspaceData.name)
                .then(() => {
                    this.$store.dispatch('updateCurrentWorkspace', { ...workspaceData.workspace, name: workspaceData.name, localNetwork: workspaceData.localNetwork, chain: workspaceData.chain })
                        .then(() => this.$bind('transactions', this.db.collection('transactions')));
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
            'currentWorkspace'
        ])
    }
}
</script>
