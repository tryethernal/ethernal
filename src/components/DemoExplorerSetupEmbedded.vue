<template>
    <v-main>
        <v-container fluid :class="{'pa-0': domain}">
            <v-form v-if="!domain" class="mt-4" @submit.prevent="submit" v-model="valid">
                <v-row>
                    <v-col>
                        <v-text-field
                            :rules="[
                                v => this.isUrlValid(v) || 'RPC needs to be a valid URL',
                                v => !!v || 'RPC server is required'
                            ]"
                            variant="outlined" v-model="rpcServer" label="RPC URL" placeholder="https://my.rpc.com:8545" required>
                        <template v-slot:append>
                            <v-btn style="height: 56px;" :loading="loading" color="primary" :disabled="!valid" type="submit">Get Started</v-btn>
                        </template>
                        </v-text-field>
                    </v-col>
                </v-row>
            </v-form>
            <v-card elevation="0" v-else>
                <v-card-title class="text-success">
                    <v-icon class="text-success mr-2">mdi-check-circle</v-icon>
                    Your explorer is ready!
                </v-card-title>
                <v-card-text>
                    You can access it here: <a :href="`//${domain}`" target="_blank">https://{{ domain }}</a> (blocks might take a few seconds to start appearing).
                </v-card-text>
            </v-card>
        </v-container>
    </v-main>
</template>

<script>
import { useUserStore } from '../stores/user';

export default {
    name: 'DemoExplorerSetupEmbedded',
    data: () => ({
        valid: false,
        rpcServer: null,
        loading: false,
        nativeToken: 'ether',
        domain: null
    }),
    mounted() {
        const userStore = useUserStore();
        this.$server.getCurrentUser()
            .then(({ data }) => userStore.updateUser(data))
            .catch(() => userStore.updateUser(null));
    },
    methods: {
        submit() {
            this.loading = true;
            this.domain = null;
            this.$server.createDemoExplorer(this.name, this.rpcServer, this.nativeToken)
                .then(({ data }) => {
                    this.domain = data.domain;
                    this.$posthog.capture('explorer:explorer_create', {
                        source: 'landing',
                        is_demo: true
                    });
                })
                .catch(error => {
                    console.log(error)
                    alert(error.response && error.response.data || 'Error while creating explorer. Please retry.');
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
<style scoped>
/deep/ .v-input__append-outer {
    margin-top: 0;
}
/deep/ .v-card {
    background: #f7f7f7 !important;
}
</style>
