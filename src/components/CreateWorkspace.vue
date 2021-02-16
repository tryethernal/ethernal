<template>
<v-card elevation="0">
    <v-card-text>
        <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
        <v-text-field outlined v-model="name" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-2" required></v-text-field>
        <v-text-field outlined v-model="rpcServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" required></v-text-field>
    </v-card-text>
    
    <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" :disabled="!name || !rpcServer || loading" @click="createWorkspace(name, rpcServer)">Create</v-btn>
    </v-card-actions>
</v-card>
</template>
<script>
const Web3 = require('web3');

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

                        web3.eth.net.getId().then((id) => {
                            this.db.currentUser().collection('workspaces').doc(name).set({
                                networkId: String(id),
                                rpcServer: rpcServer,
                                settings: {
                                    defaultAccount: ''
                                }
                            }).then(() => {
                                this.$emit('workspaceCreated', { name: name, rpcServer: rpcServer, networkId: id, settings: {} });
                            }).catch((error) => {
                                this.errorMessage = error.message;
                                this.loading = false;
                            })
                        });
                    })
                    .catch(() => this.errorMessage = "Can't connect to server.");
            } catch(error) {
                this.errorMessage = error.message;
            }
        }
    }
}
</script>