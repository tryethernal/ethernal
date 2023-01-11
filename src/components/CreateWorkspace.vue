<template>
    <v-card elevation="0">
        <v-card-text v-if="(!user.plan || user.plan == 'free') && user.onboarded">
            <v-alert dense text type="error">Free plan users are limited to one workspace. <a href="#" @click.stop="goToBilling()">Upgrade</a> to our Premium plan to create more.</v-alert>
        </v-card-text>
        <v-card-text v-else>
            <v-alert v-show="errorMessage" dense text type="error" v-html="errorMessage"></v-alert>
            <div class="mb-2">
                <v-alert type="warning" class="my-2" v-if="isUsingBrave">
                    By default, Brave is preventing websites from making requests to localhost. This will prevent you from connecting to a local blockchain. If you want to do so, you'll need to <a href="https://support.brave.com/hc/en-us/articles/360023646212-How-do-I-configure-global-and-site-specific-Shields-settings-" target="_blank">disable Shields</a> for this website (app.tryethernal.com).<br>
                    If you want to connect to a remote chain, or are not using Brave, you can ignore this message.
                    <div class="text-right">
                        <a href="#" @click.prevent="isUsingBrave = false">Dismiss</a>
                    </div>
                </v-alert>
                <v-alert type="warning" class="my-2" v-if="isUsingSafari">
                    Safari is preventing websites from making CORS requests to localhost. This will prevent you from connecting to a local blockchain. If you want to do so, you'll need to use another browser.
                    If you want to connect to a remote chain, or are not using Safari, you can ignore this message.
                </v-alert>
                <a id="detectServers" href="#" @click.prevent="detectNetwork()">Detect Networks</a>&nbsp;
                <v-tooltip top>
                    <template v-slot:activator="{ on }">
                        <v-icon small v-on="on">mdi-help-circle-outline</v-icon>
                    </template>
                    This will send a RPC request asking for a network ID to 127.0.0.1 on http and ws protocols on commonly used ports (7545, 8545 and 9545).<br>The address will be displayed below if the request is successful.
                </v-tooltip>
                <ul v-show="detectedNetworks.length">
                    <li v-for="(address, idx) in detectedNetworks" :key="idx">
                        {{ address }}&nbsp;<a href="#" :id="`serverDetected-${idx}`" @click.prevent="rpcServer = address">Use</a>
                    </li>
                </ul>
                <div v-show="noNetworks">
                    No networks detected. If you were expecting something, make sure they are running on 7545, 8545 or 9545 and that your browser is not blocking requests to localhost (looking at you Brave & Safari 👀!).
                </div>
            </div>
            <v-alert type="warning" class="my-2" v-show="displayLocalNetworkWarning">
                It looks like you are trying to connect to a server running on your local network.<br>
                If it is not accessible through https, you will need to <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">allow mixed content</a> for this domain (app.tryethernal.com) in order for Ethernal to be able to send request to it.<br>
                Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>.
                <div class="text-right mt-2">
                    <a href="#" @click.prevent="dismissedLocalWarning = true">Dismiss</a>
                </div>
            </v-alert>
            <v-text-field outlined v-model="name" id="workspaceName" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-2" required></v-text-field>
            <v-text-field outlined v-model="rpcServer" id="workspaceServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" class="mb-2" required></v-text-field>
            <v-select outlined required label="Chain" v-model="chain" :items="availableChains" hide-details="auto"></v-select>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn id="createWorkspace" :loading="loading" color="primary" :disabled="!name || !rpcServer" @click="createWorkspace(name, rpcServer)">Create</v-btn>
        </v-card-actions>
    </v-card>
</template>
<script>
const ipaddr = require('ipaddr.js');
import { mapGetters } from 'vuex';
export default {
    name: 'CreateWorkspace',
    props: ['existingWorkspaces'],
    data: () => ({
        availableChains: [],
        chain: 'ethereum',
        errorMessage: null,
        loading: false,
        name: null,
        rpcServer: null,
        showTips: false,
        localNetwork: false,
        detectedNetworks: [],
        isUsingBrave: false,
        noNetworks: false,
        dismissedLocalWarning: false
    }),
    mounted: function() {
        this.isBrave().then(res => this.isUsingBrave = res);
        this.availableChains = Object.values(this.chains).map((chain) => ({ text: chain.name, value: chain.slug }));
    },
    methods: {
        isBrave: async function() {
            return navigator.brave && await navigator.brave.isBrave() || false;
        },
        createWorkspace: async function(name, rpcServer) {
            try {
                this.loading = true;
                if (this.existingWorkspaces.indexOf(name) > -1) {
                    throw { reason: 'A workspace with this name already exists.' };
                }

                const workspace = await this.server.initRpcServer(rpcServer);

                this.server.createWorkspace(name, { ...workspace, chain: this.chain })
                    .then(({ data }) => {
                        this.$emit('workspaceCreated', data);
                        this.loading = false;
                    })
                    .catch(() => { throw 'Error while creating workspace' });
            } catch(error) {
                console.log(error);
                this.loading = false;
                if (error.reason) {
                    if (error.reason.indexOf('Invalid JSON RPC response') > -1 || error.reason.indexOf('connection not open on send()') > -1) {
                        if (rpcServer.startsWith('http://'))
                            return this.errorMessage = `Can't connect to <b>${rpcServer}</b>. If you are connecting to a remote chain, make sure you've allowed app.tryethernal.com to <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">load insecure content</a>, or use https.`
                        else if (rpcServer.startsWith('ws'))
                            return this.errorMessage = `Can't connect to <b>${rpcServer}</b>. Make sure the network is up or try connecting over http or https`;
                        else
                            return this.errorMessage = `Can't connect to <b>${rpcServer}</b>.`;
                    }
                    return this.errorMessage = error.reason;
                }
                if (error.code && error.code == 1006) {
                    return this.errorMessage = `Can't connect to <b>${rpcServer}</b>. Make sure the following request works and is returning a chain id: <code>curl -k --location --request POST ${rpcServer} -H "Content-Type: application/json" --data '{"method":"eth_chainId","params":[],"id":1,"jsonrpc":"2.0"}'</code>`;
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
        },
        isUrlValid: function(url) {
            try {
                new URL(url);
                return true;
            } catch(error) {
                return false;
            }
        },
        goToBilling: function() {
            this.$emit('goToBilling');
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'chains'
        ]),
        isUsingSafari: function() {
            return navigator.vendor.match(/apple/i) && !navigator.userAgent.match(/crios/i) && !navigator.userAgent.match(/fxios/i);
        },
        displayLocalNetworkWarning: function() {
            return this.localNetwork && this.isUrlValid(this.rpcServer) && ['localhost', '127.0.0.1'].indexOf(new URL(this.rpcServer).hostname) == -1 && !this.dismissedLocalWarning
        }
    },
    watch: {
        rpcServer: function() {
            try {
                if (!this.isUrlValid(this.rpcServer)) {
                    return;
                }
                const hostname = new URL(this.rpcServer).hostname;
                const localStrings = ['private', 'linkLocal', 'loopback', 'carrierGradeNat', 'localhost'];
                if (hostname == 'localhost') {
                    this.localNetwork = true;
                }
                else {
                    this.localNetwork = ipaddr.isValid(hostname) && localStrings.indexOf(ipaddr.parse(hostname).range()) > -1;
                }
            } catch(error) {
                console.log(error);
            }
        }
    }
}
</script>
