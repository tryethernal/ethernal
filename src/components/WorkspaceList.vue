<template>
    <v-card outlined class="mb-4">
        <Create-Workspace-Modal ref="createWorkspaceModal" />
        <v-card-text>
            <v-alert v-if="errorMessage" dense text type="error" v-html="errorMessage"></v-alert>
            <v-data-table
                :loading="loading"
                :no-data-text="'No workspaces'"
                :items="workspaces"
                :headers="headers">
                <template v-slot:top>
                    <v-toolbar flat dense class="py-0">
                        <v-spacer></v-spacer>
                        <v-btn depressed color="primary" class="mr-2" @click="openCreateWorkspaceModal()"><v-icon>mdi-plus</v-icon>New Workspace</v-btn>
                    </v-toolbar>
                </template>
                <template v-slot:item.name="{ item }">
                    {{ item.name }} <v-chip x-small class="ml-2" v-if="item.id == currentWorkspace.id">current</v-chip>
                </template>
                <template v-slot:item.rpcServer="{ item }">
                    <div style="max-width: 60ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(item.rpcServer) }}</div>
                </template>
                <template v-slot:item.actions="{ item }">
                    <v-btn :disabled="disabled || item.id == currentWorkspace.id" icon><v-icon small :id="`switchTo-${item.id}`" @click="switchWorkspace(item.name)">mdi-swap-horizontal</v-icon></v-btn>
                    <v-btn :disabled="disabled" icon><v-icon color="error" small @click="deleteWorkspace(item)">mdi-delete</v-icon></v-btn>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script>
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { mapGetters } from 'vuex';
import { shortRpcUrl } from '@/lib/utils';

export default {
    name: 'WorkspaceList',
    components: {
        CreateWorkspaceModal
    },
    data: () => ({
        loading: false,
        disabled: false,
        errorMessage: null,
        workspaces: [],
        headers: [
            { text: 'Name', value: 'name', width: '30%' },
            { text: 'RPC Server', value: 'rpcServer' },
            { text: '', value: 'actions', width: '20%', align: 'center' }
        ]
    }),
    mounted() {
        this.getWorkspaces();
    },
    methods: {
        shortRpcUrl,
        deleteWorkspace(workspace) {
            this.errorMessage = null;
            this.loading = true;
            this.disabled = true;

            if (this.currentWorkspace.id == workspace.id)
                return this.errorMessage = `You can't delete your current workspace. Switch to another one first.`;

            if (workspace.explorer)
                return this.errorMessage = `This workspace has <a href="/explorers/${workspace.explorer.id}">an explorer</a> associated to it. Please delete it or change its associated workspace first.`;

            const text = 'This will delete all data associated with this workspace. It will not be recoverable. Are you sure?';
            if(!confirm(text))
                return;

            this.server.deleteWorkspace(workspace.id)
                .then(this.getWorkspaces)
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while deleting the workspace. Please retry';
                    this.loading = false;
                })
                .finally(() => this.disabled = false);
        },
        switchWorkspace(name) {
            this.server.setCurrentWorkspace(name).then(() => document.location.reload());
        },
        getWorkspaces() {
            this.loading = true;
            this.server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        openCreateWorkspaceModal() {
            this.$refs.createWorkspaceModal
                .open()
                .then((workspaceCreated) => {
                    if (workspaceCreated) {
                        document.location.reload();
                    }
                });
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
