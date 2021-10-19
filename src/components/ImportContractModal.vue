<template>
<v-dialog v-model="dialog" max-width="600">
    <v-card>
        <v-card-title class="headline">Import a third-party contract</v-card-title>

        <v-card-text>
            <v-alert text v-if="!canImport" type="error">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true">upgrade</Upgrade-Link> to the Premium plan for more.</v-alert>
            <v-alert type="success" v-if="successMessage" v-html="successMessage"></v-alert>
            <v-alert type="error" v-if="errorMessage"> {{ errorMessage }}</v-alert>
            <div>
                Enter an address of a contract deployed on the Ethereum mainnet <b>and</b> verified on Etherscan.<br>
                Then, contract details will be pulled using the Etherscan API, and it will be added to this page.<br>
                To be able to use it, your workspace needs to be connected to a mainnet fork.<br>
                If it is not, the contract will still be imported but calls will fail.<br>
                If you'd like support for other chains, please contact @antoinedc on Discord.<br>
            </div>
            <v-text-field :disabled="!canImport" id="contractAddress" v-model="contractAddress" label="Address*" required></v-text-field>
        </v-card-text>

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" text @click.stop="close()">Close</v-btn>
            <v-btn id="importContract" color="primary" :loading="loading" :disabled="!contractAddress" text @click.stop="importContract()">Import</v-btn>
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
        contract: null,
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
            this.resolve(false);
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
            this.server.importContract(this.currentWorkspace.name, this.contractAddress)
                .then(() => this.successMessage = `Contact imported successfully at address <a class="white--text" href="/address/${this.contractAddress}">${this.contractAddress}</a>`)
                .catch(error => this.errorMessage = error.message)
                .finally(() => this.loading = false);
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'user'
        ]),
        canImport: function() {
            return this.user.plan == 'premium' || this.options.contractsCount < 10;
        }
    }
}
</script>
