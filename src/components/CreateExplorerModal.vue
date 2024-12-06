<template>
    <v-dialog v-model="dialog" :max-width="stepperIndex * 900" :persistent="true">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Create Explorer</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close(false)"></v-btn>
            </v-card-title>
            <v-stepper-vertical flat v-model="stepperIndex">
                <v-stepper-vertical-item value="1" :complete="stepperIndex > 1">
                    <template v-slot:title>
                        <h4>Enter Setup Info</h4>
                    </template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                    <v-row>
                        <v-col cols="12">
                            <v-select label="Select Existing Workspace" v-model="workspace"
                                v-if="workspaces.length"
                                item-title="name"
                                :items="workspaces" return-object clearable class="mt-2">
                                <template v-slot:item="{ props, item }">
                                    <v-list-item class="py-2" v-bind="props" :subtitle="`${item.raw.rpcServer} | ${item.raw.networkId}`"></v-list-item>
                                </template>
                                <template v-slot:selection="{ item }">
                                    {{ item.raw.name }} ({{ item.raw.rpcServer }} | {{ item.raw.networkId }})
                                </template>
                            </v-select>
                            <template v-if="!workspace">
                                <h5 v-if="workspaces.length">Or create a new one:</h5>
                                <Create-Workspace :isPublic="true" @workspaceCreated="onWorkspaceCreated"/>
                            </template>
                            <v-card-actions v-else>
                                <v-spacer></v-spacer>
                                <v-btn id="selectWorkspace" :loading="loading" @click="selectWorkspace()">Continue</v-btn>
                            </v-card-actions>
                        </v-col>
                    </v-row>
                </v-stepper-vertical-item>

                <v-stepper-vertical-item v-if="envStore.isBillingEnabled" value="2" :complete="stepperIndex > 2">
                    <template v-slot:title>
                        <h4>Choose A Plan</h4>
                    </template>
                    <template v-slot:prev></template>
                    <template v-slot:next></template>
                    <v-card>
                        <v-card-text>
                            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                            <ul style="list-style: none;" v-if="!userStore.cryptoPaymentEnabled || userStore.canTrial" class="mb-4 pl-0">
                                <li v-if="!userStore.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</li>
                                <li v-if="userStore.canTrial">Each plan includes a 7 day free trial - No credit card needed.</li>
                            </ul>
                            <Explorer-Plan-Selector v-if="explorer"
                                :explorerId="explorer.id"
                                :stripeSuccessUrl="`http://app.${envStore.mainDomain}/explorers/${explorer.id}?justCreated=true`"
                                :stripeCancelUrl="`http://app.${envStore.mainDomain}/explorers/${explorer.id}`"
                                @planCreated="planCreated"></Explorer-Plan-Selector>
                        </v-card-text>
                    </v-card>
                </v-stepper-vertical-item>
            </v-stepper-vertical>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapStores } from 'pinia';
import { useUserStore } from '../stores/user';
import { useExplorerStore } from '../stores/explorer';
import { useEnvStore } from '../stores/env';

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
            this.$server.getWorkspaces()
                .then(({ data }) => this.workspaces = data.filter(w => !w.explorer))
                .catch(console.log);

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        selectWorkspace() {
            this.loading = true;
            this.errorMessage = null;
            this.$server.createExplorer(this.workspace.id)
                .then(({ data }) => {
                    this.explorer = data;
                    this.$emit('explorerCreated');

                    if (this.envStore.isBillingEnabled && !this.userStore.canUseDemoPlan)
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
        planCreated() {
            this.$router.push({ path: `/explorers/${this.explorer.id}?status=success` });
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
            this.stepperIndex = 1;
            this.workspaces = [];
            this.workspace = null;
            this.explorer = null;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapStores(useUserStore, useExplorerStore, useEnvStore)
    }
}
</script>
