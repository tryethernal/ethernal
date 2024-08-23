<template>
    <v-sheet outlined color="error" rounded>
        <Explorer-Faucet-Private-Key-Export-Modal ref="explorerFaucetPrivateKeyExportModal" :faucetId="faucetId" />
        <v-card class="elevation-0">
            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
            <v-card-text class="font-weight-medium error--text">
                <v-row>
                    Export your key if you need to access your faucet wallet. Make sure to do it before deleting the faucet.
                    <v-spacer></v-spacer>
                    <v-btn small depressed color="error" class="mt-2" @click="openExplorerFaucetPrivateKeyExportModal()"><v-icon class="mr-1">mdi-export</v-icon>Export Private Key</v-btn>
                </v-row>
                <v-divider class="my-5"></v-divider>
                <v-row>
                    Deleting the faucet is irreversible, if you haven't exported the private key before, funds will be lost.
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" small depressed color="error" class="mt-2" @click="deleteFaucet()"><v-icon class="mr-1">mdi-delete</v-icon>Delete Faucet</v-btn>
                </v-row>
            </v-card-text>
        </v-card>
    </v-sheet>
</template>

<script>
import ExplorerFaucetPrivateKeyExportModal from './ExplorerFaucetPrivateKeyExportModal';

export default {
    name: 'ExplorerFaucetSettingsDangerZone',
    props: ['faucetId'],
    components: {
        ExplorerFaucetPrivateKeyExportModal
    },
    data: () => ({
        errorMessage: null,
        loading: false,
    }),
    methods: {
        openExplorerFaucetPrivateKeyExportModal() {
            this.$refs.explorerFaucetPrivateKeyExportModal.open({ faucetId: this.faucetId });
        },
        deleteFaucet() {
            this.loading = true;
            const message = `Make sure you exported your private key before deleting the faucet. If you didn't, all funds stored on this address will be lost.

Deleting the faucet will:
- Delete drip history for this address.
- Delete the encrypted private key & all associated faucet parameters.

It won't be possible to restore the faucet afterwards. Do you still want to proceed?
            `;

            if (!confirm(message))
                return this.loading = false;

            this.server.deleteFaucet(this.faucetId)
                .then(() => this.$emit('delete'))
                .catch(console.log);
        }
    }
}
</script>
