<template>
<v-card elevation="0">
    <v-card-text>
        <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
        <div class="my-2">
            <span class="primary--text">Tips for Ganache</span>
            <v-btn color="primary" small icon @click="showTips = !showTips">
                <v-icon>{{ showTips ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </v-btn>
            <v-expand-transition>
                <div v-show="showTips">
                    <ul>
                        <li>If you are trying to connect to a Ganache UI instance, make sure to go to "Settings" > "Server", and set "Hostname" to "All interfaces"</li>
                        <li>If you are trying to connect to ganache-cli over your local network, use the <code>-h 0.0.0.0</code> option on ganache-cli to allow connection (more info <a href="https://github.com/trufflesuite/ganache-cli" target="_blank">here</a>).</li>
                    </ul>
                </div>
            </v-expand-transition>
        </div>
        <v-alert type="warning" class="my-2" v-show="localNetwork">
            It looks like you are trying to connect to a server running on your local network.<br>
            If it is not accessible through https, you will need to <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">allow mixed content</a> for this domain (app.tryethernal.com) in order for Ethernal to be able to send request to it.<br>
            Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>.
        </v-alert>
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
        showTips: false,
        localNetwork: false
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
                if (error.reason) {
                    return this.errorMessage = error.reason;
                }
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        }
    },
    watch: {
        'rpcServer': function() {
            this.localNetwork = this.rpcServer.startsWith('http://192.168') || this.rpcServer.startsWith('192.168')
        }
    }
}
</script>
