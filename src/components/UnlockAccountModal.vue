<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">Unlock Account</v-card-title>

        <v-card-text>
            <v-alert type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
            <v-alert type="success" v-if="successMessage">{{ successMessage }}</v-alert>
            <div>
                Set private key for <b>{{ options.address }}</b> in order to use it for methods call. If you've already set one in the past, it will override it.
            </div>
            <div>
                Private keys are encrypted server side with AES 256 CBC, and stored encrypted. We strongly recommend to not use accounts with any value.
            </div>
            <v-text-field outlined class="mt-2" v-model="privateKey" label="Key*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn color="primary" :loading="loading" :disabled="!privateKey" @click="unlockAccount(options.address, privateKey)">Unlock</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';

export default {
    name: 'UnlockAccountModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        options: {},
        privateKey: null,
        loading: false,
        errorMessage: null,
        successMessage: null
    }),
    methods: {
        open: function(options) {
            this.dialog = true;
            this.options = options ;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        close: function() {
            this.resolve(false);
            this.reset();
        },
        unlockAccount: function(address, privateKey) {
            try {
                this.loading = true;
                this.errorMessage = null;
                this.successMessage = null;

                const wallet = new ethers.Wallet(privateKey);

                if (wallet.address != address)
                    throw { code: 'WALLET_MISMATCH'};

                this.server.storeAccountPrivateKey(this.currentWorkspace.name, address, privateKey)
                    .then(() => {
                        this.successMessage = 'Account unlocked.';
                    })
                    .catch(console.log)
                    .finally(() => this.loading = false);
                } catch(error) {
                    this.loading = false;
                    switch (error.code) {
                        case 'WALLET_MISMATCH':
                            this.errorMessage = `Private key doesn't match the address.`;
                            break;
                        case 'INVALID_ARGUMENT':
                        default:
                            this.errorMessage = 'Invalid private key.'

                    }
                }
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.options = {};
            this.pkey = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
