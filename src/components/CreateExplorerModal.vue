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
                            <v-btn :loading="loading" color="primary" @click="selectWorkspace()">Continue</v-btn>
                        </v-card-actions>
                    </v-col>
                </v-row>
            </v-stepper-content>

            <v-stepper-step v-if="isBillingEnabled" step="2" :complete="stepperIndex > 2">Choose A Plan</v-stepper-step>
            <v-stepper-content v-if="isBillingEnabled" step="2">
                <v-card>
                    <v-card-text>
                        <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                        <template v-if="!user.cryptoPaymentEnabled">Payment in crypto also available. Reach out to contact@tryethernal.com to set it up.</template>
                        <v-row>
                            <v-col cols="3" v-for="(plan, idx) in plans" :key="idx">
                                <Explorer-Plan-Card
                                    :plan="plan"
                                    :loading="selectedPlanSlug && selectedPlanSlug == plan.slug"
                                    :disabled="selectedPlanSlug && selectedPlanSlug != plan.slug"
                                    @updatePlan="onPlanSelected"></Explorer-Plan-Card>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-stepper-content>
        </v-stepper>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import ExplorerPlanCard from './ExplorerPlanCard.vue';
import CreateWorkspace from './CreateWorkspace.vue';

export default {
    name: 'CreateExplorerModal',
    components: {
        ExplorerPlanCard,
        CreateWorkspace
    },
    data: () => ({
        stepperIndex: 1,
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        plans: null,
        errorMessage: null,
        workspaces: [],
        workspace: null,
        explorer: null,
        selectedPlanSlug: null,
    }),
    methods: {
        open() {
            this.dialog = true;
            if (this.isBillingEnabled)
                this.server.getExplorerPlans()
                    .then(({ data }) => this.plans = data.sort((a, b) => a.price - b.price))
                    .catch(console.log);

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
                    if (this.isBillingEnabled)
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
            this.stepperIndex = 2;
            this.explorer = workspace.explorer;
        },
        onPlanSelected(slug) {
            this.selectedPlanSlug = slug;
            this.errorMessage = null;
            this.loading = true;
            this.user.cryptoPaymentEnabled ? this.useCryptoPayment() : this.useStripePayment();
        },
        useCryptoPayment() {
            this.server.startCryptoSubscription(this.selectedPlanSlug, this.explorer.id)
                .then(() => this.$router.push({ path: `/explorers/${this.explorer.id}?status=success`}))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.loading = false;
                    this.selectedPlanSlug = null;
                });
        },
        useStripePayment() {
            const successPath = `/explorers/${this.explorer.id}?status=success`;
            const cancelPath = `/explorers/${this.explorer.id}`;
            this.server.createStripeCheckoutSession(this.selectedPlanSlug, successPath, cancelPath, { explorerId: this.explorer.id })
                .then(({ data }) => document.location.href = data.url)
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.selectedPlanSlug = null;
                });
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
            'isBillingEnabled'
        ])
    }
}
</script>
