<template>
<v-dialog v-model="dialog" max-width="700">
    <v-card>
        <v-card-title class="headline">New Workspace</v-card-title>
        <v-card-text>
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
            <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
            <v-alert type="warning" class="my-2" v-show="localNetwork">
                It looks like you are trying to connect to a server running on your local network.<br>
                If it is not accessible through https, you will need to <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">allow mixed content</a> for this domain (app.tryethernal.com) in order for Ethernal to be able to send request to it.<br>
                Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>.
            </v-alert>
            <v-text-field outlined v-model="name" label="Name*" hide-details="auto" class="mb-2" required></v-text-field>
            <v-text-field outlined v-model="rpcServer" label="RPC Server*" hide-details="auto" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn :loading="loading" color="primary" :disabled="!name || !rpcServer" text @click.stop="createWorkspace(name, rpcServer)">Create</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
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
        localNetwork: false,
        detectedNetworks: [],
        noNetworks: false,
        isUsingBrave: false
    }),
    mounted: function() {
        this.isBrave().then(res => this.isUsingBrave = res);
    },
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
                this.loading = true;
                var workspace = await this.server.initRpcServer(rpcServer);
                await this.db.currentUser()
                    .collection('workspaces')
                    .doc(name)
                    .set(workspace);

                var wsRef = await this.db.getWorkspace(name);

                this.db.currentUser().update({ currentWorkspace: wsRef });
                this.$store.dispatch('updateCurrentWorkspace', { ...workspace, name: name })
                this.resolve(name);
                this.reset();
            } catch(error) {
                this.loading = false;
                if (error.reason) {
                    return this.errorMessage = error.reason;
                }
                if (error.code && error.code == 1006) {
                    return this.errorMessage = "Can't connect to the server";
                }
                this.errorMessage = error.message ? error.message : error;
            }
        },
        reset: function() {
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.address = null;
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
