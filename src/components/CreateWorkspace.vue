<template>
<v-card elevation="0">
    <v-card-text>
        <v-alert v-show="errorMessage" dense text type="error" v-html="errorMessage"></v-alert>
        <div class="mb-2">
            <v-alert type="warning" class="my-2" v-if="isUsingBrave">
                By default, Brave is preventing websites from making requests to localhost. This will prevent you from connecting to a local blockchain. If you want to do so, you'll need to <a href="https://support.brave.com/hc/en-us/articles/360023646212-How-do-I-configure-global-and-site-specific-Shields-settings-" target="_blank">disable Shields</a> for this website (app.tryethernal.com).<br>
                If you want to connect to a remote chain, or are not using Brave, you can ignore this message.
                <div class="text-right">
                    <a href="#" @click.prevent="isUsingBrave = false">Dismiss</a>
                </div>
            </v-alert>
            <a href="#" @click.prevent="detectNetwork()">Detect Networks</a>&nbsp;
            <v-tooltip top>
                <template v-slot:activator="{ on }">
                    <v-icon small v-on="on">mdi-help-circle-outline</v-icon>
                </template>
                This will send a RPC request asking for a network ID to 127.0.0.1 on http and ws protocols on commonly used ports (7545, 8545 and 9545).<br>The address will be displayed below if the request is successful.
            </v-tooltip>
            <ul v-show="detectedNetworks.length">
                <li v-for="(address, idx) in detectedNetworks" :key="idx">
                    {{ address }}&nbsp;<a href="#" @click.prevent="rpcServer = address">Use</a>
                </li>
            </ul>
            <div v-show="noNetworks">
                No networks detected. If you were expecting something, make sure they are running on 7545, 8545 or 9545 and that your browser is not blocking requests to localhost (looking at you Brave 👀!).
            </div>
        </div>
        <v-alert type="warning" class="my-2" v-show="localNetwork">
            It looks like you are trying to connect to a server running on your local network. Please read the instructions below if you have any issues.<br>
            <ul>
                <li>If you are trying to connect to a Ganache UI instance, make sure to go to "Settings" > "Server", and set "Hostname" to "All interfaces"</li>
                <li>If you are trying to connect to ganache-cli over your local network, use the <code>-h 0.0.0.0</code> option on ganache-cli to allow connection (more info <a href="https://github.com/trufflesuite/ganache-cli" target="_blank">here</a>).</li>
                <li>If the chain is not accessible through https, you will need to <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">allow mixed content</a> for this domain (app.tryethernal.com) in order for Ethernal to be able to send request to it. Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>.</li>
            </ul>
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
        localNetwork: false,
        detectedNetworks: [],
        isUsingBrave: false,
        noNetworks: false
    }),
    mounted: function() {
        this.isBrave().then(res => this.isUsingBrave = res);
    },
    methods: {
        isBrave: async function() {
            return navigator.brave && await navigator.brave.isBrave() || false;
        },
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
                    if (error.reason.indexOf('Invalid JSON RPC response') > -1 || error.reason.indexOf('connection not open on send()') > -1) {
                        return this.errorMessage = `Can't connect to <b>${rpcServer}</b>. Please make sure hostname and ports are correct, and that a server is listening on those. If you still can't connect to a local server, check that your browser is not blocking requests to localhost (for Brave, you need to disable Shields).`;
                    }
                    return this.errorMessage = error.reason;
                }
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        },
        detectNetwork: function() {
            this.noNetworks = false;
            this.server.searchForLocalChains().then((res) => {
                this.detectedNetworks = res;
                if (!res.length) {
                    this.noNetworks = true;
                }
            });
        }
    },
    watch: {
        rpcServer: function() {
            this.localNetwork = this.rpcServer.startsWith('http://192.168') || this.rpcServer.startsWith('192.168')
        }
    }
}
</script>
