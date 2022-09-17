<template>
    <v-card outlined class="mb-4">
        <v-card-text v-show="!ethereum">
            You need Metamask in order to interact with this contract
        </v-card-text>
        <v-card-text v-show="ethereum">
            <v-row>
                <v-col>
                    <v-alert outlined dense type="error" v-if="chainId && !isChainValid">
                        Invalid chain id <b>{{ chainId }}</b> ({{ parseInt(chainId, 16) }}), expecting <b>{{ formattedExpectedChainId }}</b> ({{ currentWorkspace.networkId }}). Click <a @click.stop="switchMetamaskChain()">here</a> to switch network in Metamask.
                    </v-alert>
                    <div v-if="connectedAccount">
                        <b>Connected Metamask account:</b> {{ connectedAccount }}
                    </div>
                    <v-btn :loading="loading" id="connectMetamask" v-else :color="theme == 'dark' ? '' : 'primary'" @click="connectMetamask()">Connect With Metamask</v-btn>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script>
import detectEthereumProvider from '@metamask/detect-provider';
import { mapGetters } from 'vuex';

export default {
    name: 'Metamask',
    data: () => ({
        connectedAccount: null,
        ethereum: null,
        chainId: null,
        loading: false
    }),
    mounted: function() {
        detectEthereumProvider().then((provider) => {
            if (!provider || provider !== window.ethereum) return;

            this.ethereum = provider;

            this.ethereum.on('accountsChanged', (accounts) => this.connectedAccount = accounts[0]);
            this.ethereum.on('connect', (data) => this.chainId = data.chainId);
            this.ethereum.on('chainChanged', (chainId) => this.chainId = chainId);
            this.ethereum.on('disconnect', () => {
                this.connectedAccount = null;
                this.chainId = null
            });
        });
    },
    methods: {
        connectMetamask: function() {
            this.loading = true;
            const promises = [];

            promises.push(this.ethereum.request({ method: 'eth_requestAccounts' }).then((accounts) => this.connectedAccount = accounts[0]));
            promises.push(this.ethereum.request({ method: 'eth_chainId'}).then((chainId) => this.chainId = chainId));
            Promise.all(promises).finally(() => this.loading = false);
        },
        switchMetamaskChain: function() {
            this.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: this.formattedExpectedChainId }]})
                .catch((switchError) => {
                    if (switchError.code === 4902) {
                        this.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [
                                {
                                    chainId: this.formattedExpectedChainId,
                                    chainName: this.publicExplorer.name,
                                    rpcUrls: [this.currentWorkspace.rpcServer]
                                }
                            ]
                        }).catch(console.log);
                    }
                })
        },
        emitConnectionStatus: function() {
            const isReady = !!this.connectedAccount && this.isChainValid;
            this.$emit('rpcConnectionStatusChanged', { isReady: isReady, account: this.connectedAccount });
        }
    },
    watch: {
        'connectedAccount': function() { this.emitConnectionStatus() },
        'chainId': function() { this.emitConnectionStatus() }
    },
    computed: {
        ...mapGetters([
            'publicExplorer',
            'currentWorkspace',
            'theme'
        ]),
        isChainValid: function() {
            return this.formattedExpectedChainId === this.chainId;
        },
        formattedExpectedChainId: function() {
            return `0x${parseInt(this.currentWorkspace.networkId).toString(16)}`;
        }
    }
}
</script>
