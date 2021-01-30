<template>
    <v-container fluid>
        <v-row>
            <v-col cols="5">
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
                    <v-card-text>
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
                            v-model="settings.gas"
                            class="mt-4"
                            hide-details="auto"
                            label="Default Maximum Gas">
                        </v-text-field>

                        <div justify="end">
                            <v-btn v-show="!updating" depressed color="primary" class="mt-1" @click="update()">Update</v-btn>
                            <v-btn v-show="updating" disabled depressed color="primary" class="mt-1" @click="update()"><v-icon>mdi-cached</v-icon>Updating...</v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <h4>Workspaces</h4>
                <Create-Workspace-Modal ref="createWorkspaceModal" />
                <v-card outlined class="mb-4">
                    <v-card-text>
                        <v-data-table
                            loading="true"
                            :items="workspaces"
                            :headers="workspacesDataTableHeaders">
                            <template v-slot:top>
                                <v-toolbar flat dense class="py-0">
                                    <v-spacer></v-spacer>
                                    <v-btn depressed color="primary" class="mr-2" @click="openCreateWorkspaceModal()"><v-icon>mdi-plus</v-icon>New Workspace</v-btn>
                                </v-toolbar>
                            </template>
                            <template v-slot:item.actions="{ item }">
                                <v-icon @click="switchWorkspace(item)">mdi-swap-horizontal</v-icon>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
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
        updating: false,
        updateSuccess: false,
        updateError: false,
    }),
    mounted: function() {
        this.$bind('workspaces', this.db.workspaces());
        this.$bind('settings', this.db.settings());
        this.$bind('accounts', this.db.collection('accounts'));
        this.settings = this.currentWorkspace.settings;
    },
    methods: {
        update: function() {
            this.updating = true;
            this.updateSuccess = false;
            this.updateError = false;
            this.db.settings().update({settings: Object.fromEntries(Object.entries(this.settings).filter(([, v]) => v != null))})
                .then(() => {
                    this.updateSuccess = true;
                    this.$store.dispatch('updateWorkspace', this.currentWorkspace);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.updating = false)

        },
        openCreateWorkspaceModal: function() {
            this.$refs.createWorkspaceModal.open({ workspaces: this.workspaces.map(ws => ws.id) })
        },
        switchWorkspace: function(workspace) {
            this.db.currentUser().update({ currentWorkspace: workspace.id }).then(() => document.location.reload() )
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>