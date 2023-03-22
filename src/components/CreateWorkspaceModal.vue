<template>
<v-dialog v-model="dialog" max-width="700">
    <v-card>
        <v-card-title class="headline">
            New Workspace
            <v-spacer></v-spacer>
            <v-btn icon @click="close(false)"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <Create-Workspace :existingWorkspaces="existingWorkspaces" @workspaceCreated="onWorkspaceCreated" @goToBilling="goToBilling" />
    </v-card>
</v-dialog>
</template>
<script>
import CreateWorkspace from './CreateWorkspace';

export default {
    name: 'CreateWorkspaceModal',
    components: {
        CreateWorkspace
    },
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        existingWorkspaces: []
    }),
    methods: {
        open: function(options) {
            this.existingWorkspaces = options && options.workspaces ? options.workspaces : [];
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function(workspaceCreated = false) {
            const resolve = this.resolve;
            this.reset();
            resolve(workspaceCreated);
        },
        onWorkspaceCreated: function(workspaceData) {
            this.server.setCurrentWorkspace(workspaceData.name)
                .then(() => document.location = '/blocks');
        },
        goToBilling: function() {
            this.close(false);
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    }
}
</script>
