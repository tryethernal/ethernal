<template>
    <v-main>
        <v-container fluid style="max-width: inherit" class="pa-0">
            <v-row class="bg-primary">
                <v-col cols="12" class="logo-white ml-2 mt-2"><h2>Ethernal</h2></v-col>
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
                            <v-icon class="text-primary mr-1">mdi-check</v-icon>
                            Real-time synchronization of blocks & transactions (up to 5,000 transactions).
                        </li>
                        <li class="mb-6">
                            <v-icon class="text-primary mr-1">mdi-check</v-icon>
                            Processed token transfers & token balance changes for better transaction insights.
                        </li>
                        <li class="mb-6">
                            <v-icon class="text-primary mr-1">mdi-check</v-icon>
                            NFT galleries, with processed metadata (OpenSea compatible).
                        </li>
                        <li  class="mb-6">
                            <v-icon class="text-primary mr-1">mdi-check</v-icon>
                            A link to setup your demo explorer permanently on your account.
                        </li>
                    </ul>
                </v-col>
                <v-col cols="12" lg="6">
                    <v-card class="bg-primary pa-md-10">
                        <v-card-title class="text-white"><h2>Get Started</h2></v-card-title>
                        <v-card-text>
                            <v-alert v-if="errorMessage" density="compact" text class="bg-white" type="error">{{ errorMessage }}</v-alert>
                            <v-form @submit.prevent="submit" v-model="valid" class="bg-white pa-5">
                                <v-text-field
                                    :rules="[v => !!v || 'Name is required']"
                                    variant="outlined" v-model="explorerName" label="Explorer Name" placeholder="My Explorer Name" class="mb-2" required></v-text-field>
                                <v-text-field
                                    :rules="[
                                        v => isUrlValid(v) || 'RPC needs to be a valid URL',
                                        v => !!v || 'RPC server is required'
                                    ]"
                                    variant="outlined" v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" class="mb-2" required></v-text-field>
                                <v-text-field variant="outlined" v-model="nativeToken" label="Native Token Symbol (optional)" placeholder="ETH" class="my-2" required></v-text-field>
                                <v-btn size="large" width="100%" :loading="loading" color="primary" :disabled="!valid" type="submit">Generate Explorer</v-btn>
                            </v-form>
                            <v-card class="mt-4" v-if="domain">
                                <v-card-title class="text-success">
                                    <v-icon class="text-success mr-2">mdi-check-circle</v-icon>
                                    Your demo explorer is ready!
                                </v-card-title>
                                <v-card-text>
                                    You can access it here: <a :href="`//${domain}`" target="_blank">https://{{ domain }}</a> (blocks might take a few seconds to start appearing).
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
                    <h4 class="mb-2 text-primary">Transactions List</h4>
                    <v-img src="../assets/transactions.webp"></v-img>
                </v-col>

                <v-col cols="12" lg="4">
                    <h4 class="mb-2 text-primary">Processed Token Transfers</h4>
                    <v-img src="../assets/transfers.webp"></v-img>
                </v-col>

                <v-col cols="12" lg="4">
                    <h4 class="mb-2 text-primary">Analytics</h4>
                    <v-img src="../assets/analytics.webp"></v-img>
                </v-col>
            </v-row>

            <v-row justify="center" align="center" class="mx-md-6">
                <v-col cols="12" lg="4">
                    <h4 class="mb-2 text-primary">Contract Interaction</h4>
                    <v-img src="../assets/contract.webp"></v-img>
                </v-col>

                <v-col cols="12" lg="4">
                    <h4 class="mb-2 text-primary">NFT Gallery</h4>
                    <v-img src="../assets/gallery.webp"></v-img>
                </v-col>

                <v-col cols="12" lg="4">
                    <h4 class="mb-2 text-primary">Contract Verification</h4>
                    <v-img src="../assets/verification.webp"></v-img>
                </v-col>
            </v-row>
            <v-row justify="center" align="center" class="mt-4 mb-10">
                + many other things...
            </v-row>
        </v-container>
    </v-main>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useUserStore } from '../stores/user';

// Reactive state
const valid = ref(false);
const explorerName = ref(null);
const rpcServer = ref(null);
const loading = ref(false);
const nativeToken = ref('ether');
const errorMessage = ref(null);
const domain = ref(null);

// Inject server service
const $server = inject('$server');
const $posthog = inject('$posthog');

// Methods
const isUrlValid = (url) => {
    try {
        new URL(url);
        return true;
    } catch(error) {
        return false;
    }
};

const submit = () => {
    loading.value = true;
    errorMessage.value = null;
    domain.value = null;
    
    $server.createDemoExplorer(explorerName.value, rpcServer.value, nativeToken.value)
        .then(({ data }) => {
            domain.value = data.domain;
            $posthog.capture('explorer:explorer_create', {
                source: 'demo',
                is_demo: true
            });
        })
        .catch(error => {
            console.log(error);
            errorMessage.value = error.response && error.response.data || 'Error while creating explorer. Please retry.';
        })
        .finally(() => loading.value = false);
};

// Lifecycle hooks
onMounted(() => {
    const userStore = useUserStore();
    $server.getCurrentUser()
        .then(({ data }) => userStore.updateUser(data))
        .catch(() => userStore.updateUser(null));
});
</script>

<style scoped>
.v-application {
    background: #f7f7f7 !important;
}
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
