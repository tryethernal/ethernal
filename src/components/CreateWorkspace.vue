<template>
    <v-card elevation="0">
        <v-card-text v-if="(!user.plan || user.plan == 'free') && user.onboarded">
            <v-alert dense text type="error">Free plan users are limited to one workspace. <a href="#" @click.stop="goToBilling()">Upgrade</a> to our Premium plan to create more.</v-alert>
        </v-card-text>
        <v-card-text v-else>
            <v-alert v-show="errorMessage" dense text type="error" v-html="errorMessage"></v-alert>
            <div class="mb-2">
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
            <v-form @submit.prevent="createWorkspace(name, rpcServer)" v-model="valid">
                <v-text-field
                    :rules="[v => !!v || 'Name is required']"
                    outlined v-model="name" id="workspaceName" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-2" required></v-text-field>
                <v-text-field
                    :rules="[
                        v => this.isUrlValid(v) || 'RPC needs to be a valid URL',
                        v => !!v || 'RPC server is required'
                    ]"
                    outlined v-model="rpcServer" id="workspaceServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" class="mb-2" required></v-text-field>
                <v-select outlined required label="Chain" v-model="chain" :items="availableChains" hide-details="auto"></v-select>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn id="createWorkspace" :loading="loading" color="primary" :disabled="!valid" type="submit">Create</v-btn>
                </v-card-actions>
            </v-form>
        </v-card-text>
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
        localNetwork: false,
        detectedNetworks: [],
        noNetworks: false,
        workspace: null,
        valid: false
    }),
    mounted() {
        this.availableChains = Object.values(this.chains).map((chain) => ({ text: chain.name, value: chain.slug }));
    },
    methods: {
        async createWorkspace(name, rpcServer) {
            this.loading = true;
            try {
                this.workspace = await this.server.initRpcServer(rpcServer);
            } catch(error) {
                this.loading = false;
                if (error.message.indexOf('Invalid URL') > -1)
                    return this.errorMessage = `
                        URL of the rpc server looks invalid. Make sure you entered a valid ws(s) or http(s) url.
                    `;
                else if (this.localNetwork && (rpcServer.startsWith('http://') || rpcServer.startsWith('ws://'))) {
                    return this.errorMessage = `
                        Can't connect to rpc server, 
                        make sure your node is up, and reachable from the browser.<br>
                        If you are using Brave, you'll need to disable Shields. 
                        Try disabling adblockers as well.<br>
                        Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>, and use https to connect.
                    `;
                }
                else if (!this.localNetwork && (rpcServer.startsWith('http://') || rpcServer.startsWith('ws://'))) {
                    return this.errorMessage = `
                        Can't connect to remote rpc server.<br>
                        Make sure your node is up, supports "eth_chainId" & "net_version" requests, and that you've allowed app.tryethernal.com to 
                        <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">load insecure content</a>.<br>
                        Try using a secure connection (https or wss) if possible.
                    `;
                }
                else if (!this.localNetwork && rpcServer.startsWith('wss://')) {
                    return this.errorMessage = `
                        Can't connect to remote rpc server. 
                        Make sure your node is up, and supports "eth_chainId" & "net_version" requests. 
                        Try using https if possible.
                    `;
                }
                else
                    return this.errorMessage = `
                        Can't connect to remote rpc server.<br>
                        Make sure your node is up, and supports "eth_chainId" & "net_version" requests.
                    `;
            }

            this.server.createWorkspace(name, { ...this.workspace, chain: this.chain })
                .then(({ data }) => this.$emit('workspaceCreated', data))
                .catch(error => {
                    if (error.response && error.response.data)
                        return this.errorMessage = error.response.data;
                    else
                        return this.errorMessage = 'Error while creating workspace';
                })
                .finally(() => this.loading = false)
        },
        detectNetwork() {
            this.noNetworks = false;
            this.server.searchForLocalChains().then((res) => {
                this.detectedNetworks = res;
                if (!res.length) {
                    this.noNetworks = true;
                }
            });
        },
        isUrlValid(url) {
            try {
                new URL(url);
                return true;
            } catch(error) {
                return false;
            }
        },
        goToBilling() {
            this.$emit('goToBilling');
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'chains'
        ]),
        isUsingSafari() {
            return navigator.vendor.match(/apple/i) && !navigator.userAgent.match(/crios/i) && !navigator.userAgent.match(/fxios/i);
        },
    },
    watch: {
        rpcServer() {
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
