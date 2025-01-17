<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="text-h5">Import a third-party contract</v-card-title>

        <v-card-text>
            <v-alert text v-if="!canImport" type="error">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true">upgrade</Upgrade-Link> to the Premium plan for more.</v-alert>
            <v-alert type="success" v-if="successMessage">
                Contract has been imported at address <a class="text-white" href="/address/{{ contractAddress }}">{{ contractAddress }}</a>. If available, metadata will be automatically imported from Etherscan in a few seconds...
            </v-alert>
            <v-alert type="error" v-if="errorMessage"> {{ errorMessage }}</v-alert>
            <div v-if="currentWorkspaceStore.chain.scanner">
                Enter an address of a contract deployed on {{ currentWorkspaceStore.chain.name }} mainnet.<br>
                If the contract has been verified on {{ currentWorkspaceStore.chain.scanner }}, its name and ABI will be pulled automatically.<br>
                If not, the contract will be imported but you'll have to manually add the name and ABI.
                To be able to use this, your workspace needs to be connected to a mainnet fork.<br>
                If it is not, the contract will still be imported but calls will fail.<br>
            </div>
            <v-text-field class="mt-4" :disabled="!canImport" id="contractAddress" v-model="contractAddress" label="Address*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="text" @click.stop="close()">Close</v-btn>
            <v-btn id="importContract" color="primary" :loading="loading" :disabled="!contractAddress" variant="text" @click.stop="importContract()">Import</v-btn>
        </v-card-actions>
    </v-card>
</v-dialog>
</template>
<script>
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useUserStore } from '../stores/user';
import { useEnvStore } from '../stores/env';
import UpgradeLink from './UpgradeLink.vue';

export default {
    name: 'ImportContractModal',
    components: {
        UpgradeLink
    },
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        contractAddress: null,
        successMessage: null,
        errorMessage: null,
        loading: false,
        options: {}
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.options = options || {};
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve();
            this.reset();
        },
        goToBilling() {
            this.close();
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
        importContract() {
            this.successMessage = null;
            this.errorMessage = null;
            this.loading = true;
            this.$server.importContract(this.contractAddress)
                .then(() => this.successMessage = true)
                .catch(error => this.errorMessage = error.message)
                .finally(() => this.loading = false);
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
        ...mapStores(useCurrentWorkspaceStore, useUserStore, useEnvStore),
        canImport() {
            return this.currentWorkspaceStore.public || this.userStore.plan == 'premium' || this.options.contractsCount < 10;
        },
    }
}
</script>
