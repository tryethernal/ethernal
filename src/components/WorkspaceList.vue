<template>
    <v-card border flat class="mb-4">
        <Create-Workspace-Modal ref="createWorkspaceModal" />
        <v-card-text>
            <v-alert v-if="errorMessage" density="compact" text type="error" v-html="errorMessage"></v-alert>
            <v-data-table
                :loading="loading"
                :no-data-text="'No workspaces'"
                :items="workspaces"
                :headers="headers">
                <template v-slot:top>
                    <div class="d-flex justify-end">
                        <v-spacer></v-spacer>
                        <v-btn variant="flat" color="primary" class="mr-2" @click="openCreateWorkspaceModal()"><v-icon>mdi-plus</v-icon>New Workspace</v-btn>
                    </div>
                </template>
                <template v-slot:item.name="{ item }">
                    {{ item.name }} <v-chip size="x-small" class="ml-2" v-if="item.id == currentWorkspaceStore.id">current</v-chip>
                </template>
                <template v-slot:item.rpcServer="{ item }">
                    <div style="max-width: 60ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(item.rpcServer) }}</div>
                </template>
                <template v-slot:item.actions="{ item }">
                    <v-btn :disabled="disabled || item.id == currentWorkspaceStore.id" class="text-medium-emphasis" icon="mdi-swap-horizontal" variant="text" @click="switchWorkspace(item.name)" size="small"></v-btn>
                    <v-btn :disabled="disabled" icon="mdi-delete" variant="text" @click="deleteWorkspace(item)" color="error" size="small"></v-btn>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>

<script>
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
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
            { text: '', value: 'actions', width: '20%', align: 'center' },
            { text: 'Name', value: 'name', width: '30%' },
            { text: 'RPC Server', value: 'rpcServer' },
        ]
    }),
    mounted() {
        this.getWorkspaces();
    },
    methods: {
        shortRpcUrl,
        deleteWorkspace(workspace) {
            this.errorMessage = null;

            if (this.currentWorkspaceStore.id == workspace.id)
                return this.errorMessage = `You can't delete your current workspace. Switch to another one first.`;

            if (workspace.explorer)
                return this.errorMessage = `This workspace has <a href="/explorers/${workspace.explorer.id}">an explorer</a> associated to it. Please delete it or change its associated workspace first.`;

            const text = 'This will delete all data associated with this workspace. It will not be recoverable. Are you sure?';
            if(!confirm(text))
                return;

            this.loading = true;
            this.disabled = true;

            this.$server.deleteWorkspace(workspace.id)
                .then(this.getWorkspaces)
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while deleting the workspace. Please retry';
                })
                .finally(() => {
                    this.disabled = false;
                    this.loading = false;
                });
        },
        switchWorkspace(name) {
            this.$server.setCurrentWorkspace(name).then(() => document.location.reload());
        },
        getWorkspaces() {
            this.loading = true;
            this.$server.getWorkspaces()
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
        ...mapStores(useCurrentWorkspaceStore)
    }
}
</script>
