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
            <v-btn text @click.stop="close()">Close</v-btn>
            <v-btn color="primary" :disabled="!name || !rpcServer || loading" text @click.stop="createWorkspace(name, rpcServer)">Create</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>

const Web3 = require('web3');

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
        createWorkspace: function(name, rpcServer) {
            try {
                if (this.existingWorkspaces.indexOf(name) > -1) {
                    return this.errorMessage = 'A workspace with this name already exists.';
                }
                
                var web3 = new Web3(new Web3.providers.WebsocketProvider(rpcServer));
                web3.eth.net.isListening()
                    .then((res) => {
                        if (res !== true) {
                            return this.errorMessage = res;
                        }
                        this.errorMessage = null;
                        this.loading = true;

                        this.db.currentUser().collection('workspaces').doc(name).set({
                            settings: {
                                rpcServer: rpcServer
                            }
                        }).then(() => {
                            this.resolve({ name: name });
                            this.reset();
                        }).catch((error) => {
                            this.errorMessage = error.message;
                            this.loading = false;
                        })
                    })
                    .catch(() => this.errorMessage = "Can't connect to server.");
            } catch(error) {
                this.errorMessage = error.message;
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