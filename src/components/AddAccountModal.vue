<template>
<v-dialog v-model="dialog" max-width="430">
    <v-card>
        <v-card-title class="headline">Add Account</v-card-title>

        <v-card-text>
            <v-alert type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
            <v-alert type="success" v-if="successMessage">{{ successMessage }}</v-alert>
            <div>Enter a private key to add the corresponding account.</div>
            <div>
                Private keys are encrypted server side with AES 256 CBC, and stored encrypted. We strongly recommend to not use accounts with any value.
            </div>
            <v-text-field id="privateKey" hide-details="auto" outlined class="mt-2" v-model="privateKey" label="Private Key*" required></v-text-field>
            <v-divider class="my-3"></v-divider>
            <div>Or impersonate an account.</div>
            <v-text-field id="accountAddress" outlined v-model="accountAddress" label="Account Address*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click="close()">Close</v-btn>
            <v-btn id="submitAccount" color="primary" :loading="loading" :disabled="!privateKey && !accountAddress" @click.stop="unlockAccount(privateKey, accountAddress)">Add</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';

export default {
    name: 'AddAccountModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        privateKey: null,
        accountAddress: null,
        errorMessage: null,
        successMessage: null,
        loading: false
    }),
    methods: {
        open() {
            this.dialog = true;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve(!!this.successMessage);
            this.reset();
        },
        unlockAccount(privateKey, accountAddress) {
            try {
                this.loading = true;
                this.errorMessage = null;
                this.successMessage = null;
                const promises = [];
                let walletAddress;

                if (privateKey) {
                    const wallet = new ethers.Wallet(privateKey);
                    walletAddress = wallet.address.toLowerCase();
                    promises.push(this.server.storeAccountPrivateKey(wallet.address, privateKey));
                }

                if (accountAddress) {
                    promises.push(this.server.impersonateAccount(this.currentWorkspace.rpcServer, accountAddress));
                }

                Promise.all(promises).then(res => {
                    if (res[0] && walletAddress) {
                        this.server.syncBalance(walletAddress, '0')
                            .then(() => this.successMessage = 'Account added.')
                            .catch(() => this.errorMessage = 'Error while adding account.');
                    }
                    else if ((res[0] || res[1]) && accountAddress) {
                        this.server.syncBalance(accountAddress, '0')
                            .then(() => this.successMessage = 'Account added.')
                            .catch(() => this.errorMessage = 'Error while adding account.');
                    }
                    else
                        this.errorMessage = `Couldn't unlockAccount, make sure either <code>evm_unlockUnknownAccount</code> or <code>hardhat_impersonateAccount</code> is supported by your endpoint.`
                })
                .catch(console.log)
                .finally(() => this.loading = false);

            } catch(error) {
                this.loading = false;
                if (error.code == 'INVALID_ARGUMENT')
                    this.errorMessage = 'Invalid private key.'
                else
                    console.log(error);
            }
        },
        reset() {
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
