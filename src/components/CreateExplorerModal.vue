<template>
    <v-dialog v-model="dialog" max-width="1200">
        <v-stepper vertical v-model="stepperIndex">
            <h3 class="ml-6 mt-4">Public Explorer Creation</h3>
            <v-stepper-step step="1" :complete="stepperIndex > 1">Setup The Workspace</v-stepper-step>
            <v-stepper-content step="1">
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-row>
                    <v-col cols="12">
                        <v-select primary outlined label="Select Existing Workspace" v-model="workspace" item-text="name"
                            :items="workspaces" return-object clearable class="mt-2">
                            <template v-slot:item="{ item }">
                                {{ item.name }}<small class="ml-2">({{ item.rpcServer }} | {{  item.networkId }})</small>
                            </template>
                            <template v-slot:selection="{ item }">
                                {{ item.name }}<small class="ml-2">({{ item.rpcServer }} | {{  item.networkId }})</small>
                            </template>
                        </v-select>
                        <template v-if="!workspace">
                            <h5>Create New Workspace</h5>
                            <Create-Workspace :isPublic="true" @workspaceCreated="onWorkspaceCreated"/>
                        </template>
                        <v-card-actions v-else>
                            <v-spacer></v-spacer>
                            <v-btn id="selectWorkspace" :loading="loading" color="primary" @click="selectWorkspace()">Continue</v-btn>
                        </v-card-actions>
                    </v-col>
                </v-row>
            </v-stepper-content>

            <v-stepper-step v-if="isBillingEnabled" step="2" :complete="stepperIndex > 2">Choose A Plan</v-stepper-step>
            <v-stepper-content v-if="isBillingEnabled" step="2">
                <v-card>
                    <v-card-text>
                        <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                        <ul style="list-style: none;" v-if="!user.cryptoPaymentEnabled || user.canTrial" class="mb-4">
                            <li v-if="!user.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</li>
                            <li v-if="user.canTrial">Each plan includes a 7 day free trial - No credit card needed.</li>
                        </ul>
                        <Explorer-Plan-Selector v-if="explorer"
                            :explorerId="explorer.id"
                            :stripeSuccessUrl="`http://app.${mainDomain}/explorers/${explorer.id}?justCreated=true`"
                            :stripeCancelUrl="`http://app.${mainDomain}/explorers/${explorer.id}`"></Explorer-Plan-Selector>
                    </v-card-text>
                </v-card>
            </v-stepper-content>
        </v-stepper>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import CreateWorkspace from './CreateWorkspace.vue';
import ExplorerPlanSelector from './ExplorerPlanSelector.vue';

export default {
    name: 'CreateExplorerModal',
    components: {
        ExplorerPlanSelector,
        CreateWorkspace
    },
    data: () => ({
        stepperIndex: 1,
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        errorMessage: null,
        workspaces: [],
        workspace: null,
        explorer: null,
    }),
    methods: {
        open() {
            this.dialog = true;
            this.server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log);

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        selectWorkspace() {
            this.loading = true;
            this.errorMessage = null;
            this.server.createExplorer(this.workspace.id)
                .then(({ data }) => {
                    this.explorer = data;
                    this.$emit('explorerCreated');

                    if (this.isBillingEnabled && !this.user.canUseDemoPlan)
                        this.stepperIndex = 2;
                    else
                        this.$router.push({ path: `/explorers/${this.explorer.id}?status=success`});
                })
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while creating explorer. Please retry.';
                })
                .finally(() => this.loading = false);
        },
        onWorkspaceCreated(workspace) {
            this.workspace = workspace;
            this.selectWorkspace();
        },
        close() {
            this.resolve();
            this.reset();
        },
        reset() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'mainDomain',
            'isBillingEnabled'
        ])
    }
}
</script>
