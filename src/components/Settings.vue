<template>
    <v-container fluid>
        <v-row>
            <v-col lg="5">
                <v-alert v-show="updateSuccess" dense text type="success">Settings updated</v-alert>
                <v-alert v-show="updateError" dense text type="error">Error while updating settings</v-alert>
                <h4>Server</h4>
                <v-card outlined class="mb-4">
                    <v-card-text>
                        <v-text-field
                            outlined
                            disabled
                            v-model="currentWorkspace.rpcServer"
                            hide-details="auto"
                            label="RPC Server">
                        </v-text-field>
                        To use another server, create another workspace.
                    </v-card-text>
                </v-card>

                <h4>Default Contracts Call Options</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader type="list-item-three-line" v-if="optionsLoader"></v-skeleton-loader>
                    <v-card-text v-else>
                       <v-select
                            id="defaultAccount"
                            outlined
                            label="Default From Account"
                            hide-details="auto"
                            v-model="settings.defaultAccount"
                            :item-text="'id'"
                            :items="accounts">
                            <template v-slot:item="{ item }">
                                <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.id }}
                            </template>
                            <template v-slot:selection="{ item }">
                                <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                {{ item.id }}
                            </template>
                        </v-select>
                        <v-text-field
                            id="gasPrice"
                            outlined
                            v-model="settings.gasPrice"
                            class="mt-4"
                            hide-details="auto"
                            label="Default Gas Price (wei)">
                        </v-text-field>
                        <v-text-field
                            id="gasLimit"
                            outlined
                            v-model="settings.gasLimit"
                            class="mt-4"
                            hide-details="auto"
                            label="Default Maximum Gas">
                        </v-text-field>

                        <v-row class="mt-2 pb-1 mr-2">
                            <v-spacer></v-spacer>
                            <v-btn id="updateCallOptions" :loading="loading" depressed color="primary" class="mt-1" @click="update()">Update</v-btn>
                        </v-row>
                    </v-card-text>
                </v-card>

                <Alchemy-Integration-Modal ref="alchemyIntegrationModal" />
                <h4>Integrations</h4>
                <v-card outlined class="mb-4">
                    <v-card-text>
                        <v-data-table
                            :hide-default-header="true"
                            :hide-default-footer="true"
                            :items="integrations.items"
                            :headers="integrations.headers">
                            <template v-slot:item.status="{ item }">
                                {{ isIntegrationEnabled(item.slug) ? 'Enabled' : 'Disabled' }}
                            </template>
                            <template v-slot:item.actions="{ item }">
                                <v-btn color="primary" @click="callFunction(item.action)">Manage</v-btn>
                            </template>
                        </v-data-table>
                        <h4>Each workspace has separate integration settings.</h4>
                    </v-card-text>
                </v-card>

                <Create-Workspace-Modal ref="createWorkspaceModal" />
                <h4>Workspaces</h4>
                <v-card outlined class="mb-4">
                    <v-card-text>
                        <v-data-table
                            :loading="loadingWorkspaces"
                            :no-data-text="'No workspaces'"
                            :items="workspaces"
                            :headers="workspacesDataTableHeaders">
                            <template v-slot:top>
                                <v-toolbar flat dense class="py-0">
                                    <v-spacer></v-spacer>
                                    <v-btn depressed color="primary" class="mr-2" @click="openCreateWorkspaceModal()"><v-icon>mdi-plus</v-icon>New Workspace</v-btn>
                                </v-toolbar>
                            </template>
                            <template v-slot:item.actions="{ item }">
                                <v-icon :id="`switchTo-${item.id}`" @click="switchWorkspace(item.id)">mdi-swap-horizontal</v-icon>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>

                <h4>Advanced Options</h4>
                <v-card outlined class="mb-4">
                    <v-skeleton-loader type="list-item-three-line" v-if="advancedOptionsLoading"></v-skeleton-loader>
                    <v-card-text v-else>
                        <v-row>
                            <v-col align-self="center">
                                Transactions Tracing <a style="text-decoration: none" target="_blank" href="https://doc.tryethernal.com/dashboard-pages/transactions#trace"><v-icon small>mdi-help-circle-outline</v-icon></a>
                            </v-col>
                            <v-col>
                                <v-select dense outlined hide-details="auto" label="Status"
                                    :items="advancedOptionsDesc[0].choices"
                                    item-text="label"
                                    item-value="slug"
                                    v-model="advancedOptions.tracing">
                                </v-select>
                            </v-col>
                        </v-row>
                        <v-row class="mt-2 pb-1 mr-1">
                            <v-spacer></v-spacer>
                            <v-btn :loading="advancedOptionsLoading" depressed color="primary" class="mt-2" @click="updateAdvancedOptions()">Update</v-btn>
                        </v-row>
                    </v-card-text>
                </v-card>

                <h4 class="error--text">Danger Zone</h4>
                <v-sheet outlined class="pa-0 error" rounded>
                    <v-card class="elevation-0">
                        <v-card-text class="font-weight-medium error--text">
                            <v-row>
                                Resetting this workspace will remove all accounts/transactions/blocks/contracts from your dashboard.
                                You will need to resync them.
                                This cannot be undone.
                            </v-row>
                            <v-row class="mt-2 pb-1">
                                <v-spacer></v-spacer>
                                <v-btn id="resetWorkspace" :loading="resetWorkspaceLoading" depressed color="error" class="mt-2" @click="resetWorkspace()"><v-icon>mdi-sync</v-icon>Reset Workspace</v-btn>
                            </v-row>
                        </v-card-text>
                    </v-card>
                </v-sheet>
            </v-col>
        </v-row>
    </v-container>
</template>
<script>
import { mapGetters } from 'vuex';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import AlchemyIntegrationModal from './AlchemyIntegrationModal';

export default {
    name: 'Settings',
    components: {
        CreateWorkspaceModal,
        AlchemyIntegrationModal
    },
    data: () => ({
        advancedOptionsDesc: [
            {
                slug: 'tracing',
                choices: [
                    { label: 'Disabled', slug: 'disabled' },
                    { label: 'Trace on a Hardhat network', slug: 'hardhat' },
                    { label: 'Trace on a non-Hardhat network', slug: 'other' }
                ]
            }
        ],
        integrations: {
            headers: [
                {
                    text: '',
                    value: 'name'
                },
                {
                    text: '',
                    value: 'status'
                },
                {
                    text: '',
                    value: 'actions',
                    align: 'right'
                }
            ],
            items: [
                {
                    name: 'Alchemy API',
                    slug: 'alchemy',
                    action:  'openAlchemyIntegrationModal'
                }
            ]
        },
        workspacesDataTableHeaders: [
            {
                text: 'Name',
                value: 'id'
            },
            {
                text: 'RPC Server',
                value: 'rpcServer'
            },
            {
                text: '',
                value: 'actions'
            }
        ],
        settings: {},
        advancedOptions: {},
        workspaces: [],
        accounts: [],
        loading: false,
        updateSuccess: false,
        updateError: false,
        optionsLoader: true,
        loadingWorkspaces: true,
        resetWorkspaceLoading: false,
        advancedOptionsLoading: true
    }),
    mounted: function() {
        this.$bind('workspaces', this.db.workspaces()).then(() => this.loadingWorkspaces = false);
        this.$bind('settings', this.db.settings()).finally(() => this.optionsLoader = false);
        this.$bind('advancedOptions', this.db.advancedOptions()).finally(() => this.advancedOptionsLoading = false);
        this.$bind('accounts', this.db.collection('accounts'));
    },
    methods: {
        updateAdvancedOptions: function() {
            this.advancedOptionsLoading = true;
            this.updateSuccess = false;
            this.updateError = false;

            this.server.updateWorkspaceSettings(this.currentWorkspace.name, { advancedOptions: this.advancedOptions })
                .then(() => {
                    this.updateSuccess = true;
                    this.currentWorkspace.advancedOptions = this.advancedOptions;
                    this.$store.dispatch('updateCurrentWorkspace', this.currentWorkspace);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.advancedOptionsLoading = false);
        },
        update: function() {
            this.loading = true;
            this.updateSuccess = false;
            this.updateError = false;

            this.server.updateWorkspaceSettings(this.currentWorkspace.name, { settings: this.settings })
                .then(() => {
                    this.updateSuccess = true;
                    this.currentWorkspace.settings = this.settings;
                    this.$store.dispatch('updateCurrentWorkspace', this.currentWorkspace);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.loading = false);
        },
        openCreateWorkspaceModal: function() {
            this.$refs.createWorkspaceModal
                .open({ workspaces: this.workspaces.map(ws => ws.id) })
                .then((workspaceCreated) => {
                    if (workspaceCreated) {
                        document.location.reload();
                    }
                });
        },
        callFunction: function(name) {
            this[name]();
        },
        switchWorkspace: function(name) {
            this.server.setCurrentWorkspace(name).then(() => document.location.reload());
        },
        openAlchemyIntegrationModal: function() {
            this.$refs.alchemyIntegrationModal.open({
                enabled: this.isIntegrationEnabled('alchemy')
            });
        },
        isIntegrationEnabled: function(slug) {
            return this.currentWorkspace.settings.integrations ? this.currentWorkspace.settings.integrations.indexOf(slug) > -1 : false;
        },
        resetWorkspace: function() {
            if (confirm(`Are you sure you want to reset the workspace ${this.currentWorkspace.name}? This action is definitive.`)) {
                this.resetWorkspaceLoading = true;
                this.server.resetWorkspace(this.currentWorkspace.name)
                    .then(() => {
                        alert('Workspace reset finished!');
                    })
                    .catch((error) => {
                        alert('Error while resetting the workspace, please retry');
                        console.log(error);
                    })
                    .finally(() => this.resetWorkspaceLoading = false)
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
