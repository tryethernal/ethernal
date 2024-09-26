<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="text-h5">Import a third-party contract</v-card-title>

        <v-card-text>
            <v-alert text v-if="!canImport" type="error">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true">upgrade</Upgrade-Link> to the Premium plan for more.</v-alert>
            <v-alert type="success" v-if="successMessage" v-html="successMessage"></v-alert>
            <v-alert type="error" v-if="errorMessage"> {{ errorMessage }}</v-alert>
            <div v-if="chain.scanner">
                Enter an address of a contract deployed on {{ chain.name }} mainnet.<br>
                If the contract has been verified on {{ chain.scanner }}, its name and ABI will be pulled automatically.<br>
                If not, the contract will be imported but you'll have to manually add the name and ABI.
                To be able to use this, your workspace needs to be connected to a mainnet fork.<br>
                If it is not, the contract will still be imported but calls will fail.<br>
            </div>
            <v-text-field :disabled="!canImport" id="contractAddress" v-model="contractAddress" label="Address*" required></v-text-field>
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
import { mapGetters } from 'vuex';
import UpgradeLink from './UpgradeLink';

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
        open: function(options) {
            this.dialog = true;
            this.options = options || {};
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close: function() {
            this.resolve(true);
            this.reset();
        },
        goToBilling: function() {
            this.close();
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
        importContract: function() {
            this.successMessage = null;
            this.errorMessage = null;
            this.loading = true;
            this.$server.importContract(this.contractAddress)
                .then(() => {
                        this.successMessage = `Contract has been imported at address <a class="white--text" href="/address/${this.contractAddress}">${this.contractAddress}</a>. If available, metadata will be automatically imported from Etherscan in a few seconds...`
                })
                .catch(error => this.errorMessage = error.message)
                .finally(() => this.loading = false);
        },
        reset: function() {
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
            'currentWorkspace',
            'user',
            'chain'
        ]),
        canImport: function() {
            return this.currentWorkspace.public || this.user.plan == 'premium' || this.options.contractsCount < 10;
        },
    }
}
</script>
