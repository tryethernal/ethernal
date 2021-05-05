<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">Add Account</v-card-title>

        <v-card-text>
            <v-alert type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
            <v-alert type="success" v-if="successMessage">{{ successMessage }}</v-alert>
            <div>Enter a private key to add the corresponding account.</div>
            <div>
                Private keys are encrypted server side with AES 256 CBC, and stored encrypted. We strongly recommend to not use accounts with any value.
            </div>
            <v-text-field outlined class="mt-2" v-model="privateKey" label="Private Key*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn color="primary" :loading="loading" :disabled="!privateKey" @click.stop="unlockAccount(privateKey)">Add</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';
import { bus } from '../bus';

export default {
    name: 'AddAccountModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        privateKey: null,
        errorMessage: null,
        successMessage: null,
        loading: false
    }),
    methods: {
        open: function() {
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve();
            this.reset();
        },
        unlockAccount: function(privateKey) {
            try {
                this.loading = true;
                this.errorMessage = null;
                this.successMessage = null;

                const wallet = new ethers.Wallet(privateKey);

                this.server.storeAccountPrivateKey(this.currentWorkspace.name, wallet.address, privateKey)
                    .then(() => {
                        bus.$emit('syncAccount', wallet.address);
                        this.successMessage = 'Account added.';
                    })
                    .catch(console.log)
                } catch(error) {
                    if (error.code == 'INVALID_ARGUMENT')
                        this.errorMessage = 'Invalid private key.'
                    else
                        console.log(error);
                } finally {
                    this.loading = false;
                }
        },
        reset: function() {
            this.privateKey = null;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.address = null;
            this.loading = false;
            this.successMessage = null;
            this.errorMessage = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
