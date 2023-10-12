<template>
    <v-container>
        <Demo-Explorer-Ready-Modal ref="demoExplorerReadyModal" />
        <v-row>
            <v-col>
                <v-card outlined>
                    <v-card-title class="justify-center">
                        <h1 class="logo">Ethernal</h1>
                    </v-card-title>
                    <v-card-text>
                        <p>
                            Ethernal is an open source block explorer for private EVM-based chains.
                        </p>
                        <p>
                            This tool lets you generate a demo block explorer from a RPC url.
                            It will stay up for 24h before getting deleted with all its data.<br><br>
                            You will have the option to subscribe to a plan to keep it up and running longer.
                        </p>
                        <p>
                            With the full version you'll be able to:
                            <ul>
                                <li>Use your own domain names</li>
                                <li>Customize the logo, the colors, add links, change the font, etc...</li>
                                <li>Display your native token total supply</li>
                                <li>Update your RPC & reset your explorer when needed</li>
                            </ul>
                        </p>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-card outlined>
                    <v-card-title>Set Up My Explorer</v-card-title>
                    <v-card-text>
                        <v-alert v-if="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
                        <v-form @submit.prevent="submit" v-model="valid">
                            <v-row>
                                <v-col cols="3">
                                    <v-text-field
                                        :rules="[v => !!v || 'Name is required']"
                                        outlined v-model="name" label="Explorer Name" placeholder="My Explorer Name" class="mb-2" required></v-text-field>
                                </v-col>

                                <v-col cols="6">
                                    <v-text-field
                                        :rules="[
                                            v => this.isUrlValid(v) || 'RPC needs to be a valid URL',
                                            v => !!v || 'RPC server is required'
                                        ]"
                                        outlined v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" class="mb-2" required></v-text-field>
                                </v-col>

                                <v-col cols="3">
                                    <v-text-field outlined v-model="nativeToken" label="Native Token Name (optional)" placeholder="ether" class="mb-2" required></v-text-field>
                                </v-col>
                            </v-row>
                            <v-btn large width="100%" :loading="loading" color="primary" :disabled="!valid" type="submit">Generate Explorer</v-btn>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import DemoExplorerReadyModal from './DemoExplorerReadyModal';

export default {
    name: 'DemoExplorerSetup',
    components: {
        DemoExplorerReadyModal
    },
    data: () => ({
        valid: false,
        name: null,
        rpcServer: null,
        loading: false,
        nativeToken: 'ether',
        errorMessage: null
    }),
    mounted() {
    },
    methods: {
        submit() {
            this.loading = true;
            this.errorMessage = null;
            this.server.createDemoExplorer(this.name, this.rpcServer, this.nativeToken)
                .then(({ data }) => {
                    this.$refs.demoExplorerReadyModal.open({ domain: data.domain });
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
    },
    computed: {}
};
</script>
<style scoped lang="scss">
.v-application {
    background: #f7f7f7
}
</style>
