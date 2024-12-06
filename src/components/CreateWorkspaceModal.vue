<template>
<v-dialog v-model="dialog" max-width="700">
    <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <h4>Create Workspace</h4>
            <v-btn color="grey" variant="text" icon="mdi-close" @click="close(false)"></v-btn>
        </v-card-title>
        <Create-Workspace @workspaceCreated="onWorkspaceCreated" @goToBilling="goToBilling" />
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
    }),
    methods: {
        open: function() {
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
            this.$server.setCurrentWorkspace(workspaceData.name)
                .then(() => document.location = '/overview');
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
