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
                            outlined
                            label="Default From Account"
                            hide-details="auto"
                            v-model="settings.defaultAccount"
                            :item-text="'id'"
                            :items="accounts">
                        </v-select>
                        <v-text-field
                            outlined
                            v-model="settings.gasPrice"
                            class="mt-4"
                            hide-details="auto"
                            label="Default Gas Price (wei)">
                        </v-text-field>
                        <v-text-field
                            outlined
                            v-model="settings.gasLimit"
                            class="mt-4"
                            hide-details="auto"
                            label="Default Maximum Gas">
                        </v-text-field>

                        <div justify="end">
                            <v-btn :loading="loading" depressed color="primary" class="mt-1" @click="update()">Update</v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <h4>Workspaces</h4>
                <Create-Workspace-Modal ref="createWorkspaceModal" />
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
                                <v-icon @click="switchWorkspace(item.id)">mdi-swap-horizontal</v-icon>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>

                <h4 class="error--text">Danger Zone</h4>
                <v-sheet outlined class="pa-0 error" rounded>
                    <v-card class="elevation-0">
                        <v-card-text class="font-weight-medium error--text">
                            <div>
                                Resetting this workspace will remove all accounts/transactions/blocks/contracts from your dashboard.
                                You will need to resync them.
                                This cannot be undone.
                            </div>
                            <v-btn :loading="resetWorkspaceLoading" depressed color="error" class="mt-2" @click="resetWorkspace()"><v-icon>mdi-sync</v-icon>Reset Workspace</v-btn>
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

export default {
    name: 'Settings',
    components: {
        CreateWorkspaceModal
    },
    data: () => ({
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
        workspaces: [],
        accounts: [],
        loading: false,
        updateSuccess: false,
        updateError: false,
        optionsLoader: false,
        loadingWorkspaces: true,
        resetWorkspaceLoading: false
    }),
    mounted: function() {
        this.$bind('workspaces', this.db.workspaces()).then(() => this.loadingWorkspaces = false);
        this.optionsLoader = true;
        this.$bind('settings', this.db.settings()).finally(() => this.optionsLoader = false);
        this.$bind('accounts', this.db.collection('accounts'));
    },
    methods: {
        update: function() {
            this.loading = true;
            this.updateSuccess = false;
            this.updateError = false;
            this.db.settings().update({settings: Object.fromEntries(Object.entries(this.settings).filter(([, v]) => v != null))})
                .then(() => {
                    this.updateSuccess = true;
                    this.currentWorkspace.settings = this.settings;
                    this.$store.dispatch('updateCurrentWorkspace', this.currentWorkspace);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.loading = false)

        },
        openCreateWorkspaceModal: function() {
            this.$refs.createWorkspaceModal
                .open({ workspaces: this.workspaces.map(ws => ws.id) })
                .then((name) => this.switchWorkspace(name));
        },
        switchWorkspace: async function(name) {
            var wsRef = await this.db.getWorkspace(name);
            await this.db.currentUser().update({ currentWorkspace: wsRef });
            document.location.reload();
        },
        resetWorkspace: function() {
            if (confirm(`Are you sure you want to reset the workspace ${this.currentWorkspace.name}? This action is definitive.`)) {
                this.resetWorkspaceLoading = true;
                this.db.functions
                    .httpsCallable('resetWorkspace')({ workspace: this.currentWorkspace.name })
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
