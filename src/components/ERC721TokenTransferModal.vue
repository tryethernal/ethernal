<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Transfer {{ token.attributes.name }}</v-card-title>

        <v-card-text>
            <v-alert type="success" v-if="successMessage" v-html="successMessage"></v-alert>
            <v-alert type="error" v-if="errorMessage" v-html="errorMessage"></v-alert>
            <v-alert v-if="!successMessage && !errorMessage" type="info" text>This will work if your node supports either <code>hardhat_impersonateAccount</code> or <code>evm_unlockUnknownAccount</code>.</v-alert>
            <div>
                Owner: <Hash-Link :type="'address'" :fullHash="true" :hash="token.owner"></Hash-Link>
                <v-text-field
                    v-model="recipient"
                    :rules="[v => !!v && v.length == 42 || 'Invalid address (must be 42 characters long)']"
                    small
                    outlined
                    dense
                    prepend-inner-icon="mdi-arrow-right"
                    class="mt-3"
                    label="Recipient Address">
                </v-text-field>
            </div>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click.stop="close()">Close</v-btn>
            <v-btn id="transferToken" color="primary" :loading="loading" text @click.stop="transferToken()">Transfer Token</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import HashLink from './HashLink';

export default {
    name: 'ERC721TokenTransferModal',
    props: ['address', 'token'],
    components: {
        HashLink
    },
    data: () => ({
        recipient: null,
        dialog: false,
        resolve: null,
        reject: null,
        successMessage: null,
        errorMessage: null,
        loading: false,
        options: {}
    }),
    methods: {
        transferToken() {
            this.server.impersonateAccount(this.currentWorkspace.rpcServer, this.token.owner)
                .then(hasBeenUnlocked => {
                    if (!hasBeenUnlocked)
                        return this.errorMessage = "Transfer failed. Couldn't unlock owner account";
                    this.server.transferErc721Token(this.currentWorkspace.rpcServer, this.address, this.token.owner, this.recipient, this.token.tokenId)
                        .then(console.log)
                        .catch(console.log);
                })
                .catch(console.log)
        },
        open(options) {
            this.dialog = true;
            this.options = options || {};
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close(reload) {
            this.resolve(reload);
            this.reset();
        },
        reset() {
            this.contractAddress = null;
            this.successMessage = null;
            this.errorMessage = null;
            this.loading = false;
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
