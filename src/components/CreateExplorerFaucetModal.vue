<template>
    <v-dialog v-model="dialog" max-width="400">
        <v-card>
            <v-card-title class="text-h5">
                Create Faucet
                <v-spacer></v-spacer>
                <v-btn icon @click="close(false)"><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-form @submit.prevent="create" v-model="valid">
                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                class="mt-2"
                                density="compact"
                                variant="outlined"
                                required
                                :rules="[v => !!v || 'Amount is required']"
                                type="number"
                                hint="Amount to send for each request"
                                persistent-hint
                                v-model="amount"
                                :suffix="`${options.token || 'ETH'}`"
                                label="Drip Amount"></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                density="compact"
                                variant="outlined"
                                required
                                :rules="[v => !!v || 'Interval is required']"
                                type="number"
                                hint="Minimum time between requests for each address"
                                v-model="interval"
                                persistent-hint
                                suffix="hours"
                                label="Interval Between Drips"></v-text-field>
                        </v-col>
                    </v-row>
                    <v-card-actions class="pr-0 pb-0">
                        <v-spacer></v-spacer>
                        <v-btn :loading="loading" color="primary" :disabled="!valid" type="submit">Create</v-btn>
                    </v-card-actions>
                </v-form>
            </v-card-text>
        </v-card>
    </v-dialog>
    </template>
<script>
const ethers = require('ethers');

export default {
    name: 'CreateExplorerFaucetModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        valid: false,
        errorMessage: null,
        amount: 1,
        interval: 24,
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
            this.$server.createExplorerFaucet(this.options.explorerId, this.formattedAmount, this.interval * 60)
                .then(() => this.close(true))
                .catch(error => {
                    this.loading = false;
                    this.errorMessage = error.response && error.response.data || 'Error while creating faucet. Please retry.';
                });
        },
        close(faucetCreated = false) {
            const resolve = this.resolve;
            this.reset();
            resolve(faucetCreated);
        },
        reset() {
            this.dialog = false;
            this.loading = false;
            this.amount = null;
            this.errorMessage = null;
            this.interval = null;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        formattedAmount() {
            return ethers.utils.parseUnits(this.amount.toString(), 'ether').toString();
        }
    }
}
</script>
