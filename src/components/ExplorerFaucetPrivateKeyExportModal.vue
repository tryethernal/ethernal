<template>
    <v-dialog v-model="dialog" max-width="600">
        <v-card>
            <v-card-title class="text-h5">
                Faucet Private Key
                <v-spacer></v-spacer>
                <v-btn icon @click="close(false)"><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text v-if="loading">
                <v-progress-circular size="16" width="2" indeterminate color="primary" class="mr-2"></v-progress-circular> Fetching private key...
            </v-card-text>
            <v-card-text v-else>
                <v-text-field append-icon="mdi-content-copy" readonly @click:append="copyPrivateKey()" variant="outlined" density="compact" hide-details="auto" :model-value="privateKey"></v-text-field>
                <input type="hidden" id="copyElement" :value="privateKey">
            </v-card-text>
        </v-card>
    </v-dialog>
    </template>
<script>

export default {
    name: 'ExplorerFaucetPrivateKeyExportModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        valid: false,
        errorMessage: null,
        privateKey: null,
        loading: false,
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.loading = true;
            this.$server.getFaucetPrivateKey(options.faucetId)
                .then(({ data }) => this.privateKey = data.privateKey)
                .catch(error => this.errorMessage = error.response && error.response.data || 'Error while deleting explorer. Please retry.')
                .finally(() => this.loading = false);

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            })
        },
        copyPrivateKey: function() {
            const webhookField = document.querySelector('#copyElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Private key copied!' : `Couldn't copy private key`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy private key`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
        close() {
            this.reset();
        },
        reset() {
            this.dialog = false;
            this.loading = false;
            this.errorMessage = null;
            this.privateKey = null;
            this.resolve = null;
            this.reject = null;
        }
    }
}
</script>
