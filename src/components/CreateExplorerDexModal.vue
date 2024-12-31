<template>
    <v-dialog v-model="dialog" max-width="600">
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Create Dex</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close(false)"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text density="compact" type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                Enter your router address. From there, we'll be able to fetch the factory, and all created token pairs, in order to generate your dex UI.
                <v-form class="mt-3" @submit.prevent="create" v-model="valid">
                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                prepend-inner-icon="mdi-swap-horizontal"
                                class="mt-1"
                                density="compact"
                                name="routerAddress"
                                variant="outlined"
                                required
                                :rules="[
                                    v => !!v || 'A valid address is required',
                                    v => !!v && v.match(/(\b0x[A-Fa-f0-9]{40}\b)/g) ? true : 'Invalid address'
                                ]"
                                type="text"
                                v-model="routerAddress"
                                label="Router Address"></v-text-field>
                            <v-text-field
                                class="mt-1"
                                density="compact"
                                name="wrappedNativeTokenAddress"
                                variant="outlined"
                                required
                                :rules="[
                                    v => !!v || 'A valid address is required',
                                    v => !!v && v.match(/(\b0x[A-Fa-f0-9]{40}\b)/g) ? true : 'Invalid address'
                                ]"
                                type="text"
                                v-model="wrappedNativeTokenAddress"
                                persistent-hint
                                hint="We need this address to be able to route native token swaps"
                                :label="`Wrapped ${this.explorerStore.nativeTokenSymbol} Address`"></v-text-field>
                        </v-col>
                    </v-row>
                    <v-card-actions class="pr-0 pb-0">
                        <v-spacer></v-spacer>
                        <v-btn variant="flat" :loading="loading" color="primary" :disabled="!valid" type="submit">Create</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card-text>
        </v-card>
    </v-dialog>
    </template>
<script>
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';

export default {
    name: 'CreateExplorerDexModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        valid: false,
        errorMessage: null,
        routerAddress: null,
        wrappedNativeTokenAddress: null,
        loading: false,
        options: {}
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.options = options;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        create() {
            this.loading = true;
            this.$server.createExplorerV2Dex(this.options.explorerId, this.routerAddress, this.wrappedNativeTokenAddress)
                .then(() => this.close(true))
                .catch(error => {
                    this.loading = false;
                    this.errorMessage = error.response && error.response.data || 'Error while creating dex. Please retry.';
                });
        },
        close(dexCreated = false) {
            const resolve = this.resolve;
            this.reset();
            resolve(dexCreated);
        },
        reset() {
            this.dialog = false;
            this.loading = false;
            this.routerAddress = null;
            this.errorMessage = null;
            this.interval = null;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapStores(useExplorerStore)
    }
}
</script>
