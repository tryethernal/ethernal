<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">New Workspace</v-card-title>

        <v-card-text>
            <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
            <v-text-field outlined v-model="name" label="Name*" hide-details="auto" class="mb-2" required></v-text-field>
            <v-text-field outlined v-model="rpcServer" label="RPC Server*" hide-details="auto" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn color="primary" :disabled="!name || !rpcServer || loading" text @click.stop="createWorkspace(name, rpcServer)">Create</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { functions } from '../plugins/firebase';

export default {
    name: 'CreateWorkspaceModal',
    data: () => ({
        existingWorkspaces: [],
        errorMessage: null,
        loading: false,
        name: null,
        rpcServer: null,
        dialog: false,
        resolve: null,
        reject: null,
    }),
    methods: {
        open: function(options) {
            this.existingWorkspaces = options.workspaces;
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve(false);
            this.reset();
        },
        createWorkspace: async function(name, rpcServer) {
            try {
                var workspace = await functions.httpsCallable('initRpcServer')({ rpcServer: rpcServer })

                var res = this.db.currentUser()
                    .collection('workspaces')
                    .doc(name).set(workspace.data);

                if (res) {
                    this.resolve({ name: name });
                    this.reset();
                }
            } catch(error) {
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.address = null;
        }
    }
}
</script>
