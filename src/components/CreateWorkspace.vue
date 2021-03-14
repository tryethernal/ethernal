<template>
<v-card elevation="0">
    <v-card-text>
        <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
        <v-text-field outlined v-model="name" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-2" required></v-text-field>
        <v-text-field outlined v-model="rpcServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" required></v-text-field>
    </v-card-text>

    <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :loading="loading" color="primary" :disabled="!name || !rpcServer" @click="createWorkspace(name, rpcServer)">Create</v-btn>
    </v-card-actions>
</v-card>
</template>
<script>
export default {
    name: 'CreateWorkspace',
    data: () => ({
        existingWorkspaces: [],
        errorMessage: null,
        loading: false,
        name: null,
        rpcServer: null,
    }),
    methods: {
        createWorkspace: async function(name, rpcServer) {
            try {
                this.loading = true;
                if (this.existingWorkspaces.indexOf(name) > -1) {
                    return this.errorMessage = 'A workspace with this name already exists.';
                }

                var workspace = await this.server.initRpcServer(rpcServer);

                await this.db.currentUser()
                    .collection('workspaces')
                    .doc(name)
                    .set(workspace);

                this.$emit('workspaceCreated', { workspace: workspace, name: name });
                this.loading = false;
            } catch(error) {
                console.log(error);
                this.loading = false;
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        }
    }
}
</script>
