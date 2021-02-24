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
        createWorkspace: async function(name, rpcServer) {
            try {
                if (this.existingWorkspaces.indexOf(name) > -1) {
                    return this.errorMessage = 'A workspace with this name already exists.';
                }

                var web3;
                if (rpcServer.startsWith('ws://') || rpcServer.startsWith('wss://')) {
                    web3 = new Web3(new Web3.providers.WebsocketProvider(rpcServer));
                }
                else if (rpcServer.startsWith('http://') || rpcServer.startsWith('https://')) {
                    web3 = new Web3(new Web3.providers.HttpProvider(rpcServer));
                }
                if (!web3) {
                    return this.errorMessage = 'Only ws(s):// and http(s):// endpoints are supported at the moment.';
                }


                await web3.eth.net.isListening();

                this.errorMessage = null;
                this.loading = true;

                var networkId = await web3.eth.net.getId();
                var latestBlock = await web3.eth.getBlock('latest')
                var accounts = await web3.eth.getAccounts();
                var gasLimit = latestBlock.gasLimit;
                var settings = {
                    defaultAccount: accounts[0],
                    gas: gasLimit
                };

                var res = this.db.currentUser()
                    .collection('workspaces')
                    .doc(name).set({
                        networkId: String(networkId),
                        rpcServer: rpcServer,
                        settings: settings
                    });

                if (res) {
                    this.$emit('workspaceCreated', { name: name, rpcServer: rpcServer, networkId: networkId, settings: settings });
                }
            } catch(error) {
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        }
    }
}
</script>