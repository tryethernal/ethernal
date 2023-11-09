<template>
    <v-container fluid>
        <v-row class="primary">
            <v-col cols="12" class="logo-white"><h2>Ethernal</h2></v-col>
        </v-row>
        <v-row justify="center" align="center">
            <v-col cols="12" lg="5">
                <h1>See Ethernal In Action</h1>
                <p class="mb-6">
                    Launch a customized demo explorer, connected to your RPC, displaying your own native token, and get
                    an overview of all of Ethernal's capabilities.
                </p>
                <h2 class="mb-4">
                    What can I expect?
                </h2>
                <ul style="list-style: none;" class="pl-0">
                    <li class="mb-6">
                        <v-icon class="primary--text mr-1">mdi-check</v-icon>
                        Real-time synchronization of blocks & transactions.
                    </li>
                    <li class="mb-6">
                        <v-icon class="primary--text mr-1">mdi-check</v-icon>
                        Processed token transfers & token balance changes for better transaction insights.
                    </li>
                    <li class="mb-6">
                        <v-icon class="primary--text mr-1">mdi-check</v-icon>
                        NFT galleries, with processed metadata (OpenSea compatible).
                    </li>
                    <li  class="mb-6">
                        <v-icon class="primary--text mr-1">mdi-check</v-icon>
                        A link to setup your demo explorer permanently on your account.
                    </li>
                </ul>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card outlined class="primary pa-md-10">
                    <v-card-title class="white--text"><h2>Get Started</h2></v-card-title>
                    <v-card-text>
                        <v-alert v-if="errorMessage" dense text class="white" type="error">{{ errorMessage }}</v-alert>
                        <v-form @submit.prevent="submit" v-model="valid" class="white pa-5">
                            <v-text-field
                                :rules="[v => !!v || 'Name is required']"
                                outlined v-model="name" label="Explorer Name" placeholder="My Explorer Name" class="mb-2" required></v-text-field>
                            <v-text-field
                                :rules="[
                                    v => this.isUrlValid(v) || 'RPC needs to be a valid URL',
                                    v => !!v || 'RPC server is required'
                                ]"
                                outlined v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" class="mb-2" required></v-text-field>
                            <v-text-field outlined v-model="nativeToken" label="Native Token Symbol (optional)" placeholder="ETH" class="mb-2" required></v-text-field>
                            <v-btn large width="100%" :loading="loading" color="primary" :disabled="!valid" type="submit">Generate Explorer</v-btn>
                        </v-form>
                        <v-card outlined class="mt-4" v-if="domain">
                            <v-card-title class="success--text">
                                <v-icon class="success--text mr-2">mdi-check-circle</v-icon>
                                Your demo explorer is ready!
                            </v-card-title>
                            <v-card-text>
                                You can access it here: <a :href="`//${domain}`" target="_blank">https://{{ domain }}</a>
                            </v-card-text>
                        </v-card>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-divider class="my-10"></v-divider>
        <div align="center">
            <h2 class="mb-10">
                What It Looks Like
            </h2>
        </div>
        <v-row justify="center" align="center" class="mx-md-6">
            <v-col lg="8">
                <video controls preload="metadata" src="../assets/demo_compressed.mp4" type="video/mp4"></video>
            </v-col>
        </v-row>
        <v-divider class="my-10"></v-divider>
        <v-row justify="center" align="center" class="mx-sm-6">
            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">Transactions List</h4>
                <v-img src="../assets/transactions.webp"></v-img>
            </v-col>

            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">Processed Token Transfers</h4>
                <v-img src="../assets/transfers.webp"></v-img>
            </v-col>

            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">Analytics</h4>
                <v-img src="../assets/analytics.webp"></v-img>
            </v-col>
        </v-row>

        <v-row justify="center" align="center" class="mx-md-6">
            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">Contract Interaction</h4>
                <v-img src="../assets/contract.webp"></v-img>
            </v-col>

            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">NFT Gallery</h4>
                <v-img src="../assets/gallery.webp"></v-img>
            </v-col>

            <v-col cols="12" lg="4">
                <h4 class="mb-2 primary--text">Contract Verification</h4>
                <v-img src="../assets/verification.webp"></v-img>
            </v-col>
        </v-row>
        <v-row justify="center" align="center" class="mt-4 mb-10">
            + many other things...
        </v-row>
    </v-container>
</template>

<script>
import store from '../plugins/store';

export default {
    name: 'DemoExplorerSetup',
    data: () => ({
        valid: false,
        name: null,
        rpcServer: null,
        loading: false,
        nativeToken: 'ether',
        errorMessage: null,
        domain: null
    }),
    mounted() {
        this.server.getCurrentUser()
            .then(({ data }) => store.dispatch('updateUser', data))
            .catch(() => store.dispatch('updateUser', null));
    },
    methods: {
        submit() {
            this.loading = true;
            this.errorMessage = null;
            this.domain = null;
            this.server.createDemoExplorer(this.name, this.rpcServer, this.nativeToken)
                .then(({ data }) => {
                    this.domain = data.domain;
                    this.$posthog.capture('explorer:explorer_create', {
                        is_demo: true
                    });
                })
                .catch(error => {
                    console.log(error)
                    this.errorMessage = error.response && error.response.data || 'Error while creating explorer. Please retry.'
                })
                .finally(() => this.loading = false);
        },
        isUrlValid(url) {
            try {
                new URL(url);
                return true;
            } catch(error) {
                return false;
            }
        },
    }
};
</script>
<style lang="scss">
li {
    display: flex;
}
.v-icon.v-icon {
    align-items: self-start;
}
img {
    border: 1px solid var(--v-primary-base);
    border-radius: 5px;
    height: 100vh;
}
video {
    width: 100%;
}
</style>
