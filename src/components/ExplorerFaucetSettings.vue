<template>
    <v-container fluid>
        <template v-if="explorer && explorer.faucet">
            <v-row>
                <v-col cols="6" class="fill-height">
                    <v-card outlined class="mt-6">
                        <v-card-text>
                            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                            <v-alert text type="success" v-if="successMessage">{{ successMessage }}</v-alert>

                            <v-switch @click.prevent="toggleFaucet()" :loading="switchLoading || active === null" class="mt-1" v-model="faucet.active" inset :label="`${faucet.active ? 'Active' : 'Inactive'}`"></v-switch>
                            <strong>URL:</strong> <a :href="`//${mainExplorerDomain}/faucet`" target="_blank">https://{{ mainExplorerDomain }}/faucet</a><br>
                            <strong>Address:</strong> <Hash-Link :type="'address'" :hash="faucet.address" :fullHash="true" /><br>
                            <strong>Balance:</strong>&nbsp;
                            <template v-if="balance">{{ balance | fromWei('ether', explorer.token) }}</template>
                            <template v-else><i>Fetching...</i></template>

                            <v-divider class="mt-4 mb-6"></v-divider>

                            <v-form :disabled="!faucet.active || switchLoading" @submit.prevent="updateFaucet()" v-model="valid">
                                <v-text-field
                                    dense
                                    outlined
                                    required
                                    :rules="[v => !!v || 'Amount is required']"
                                    type="number"
                                    hint="Amount to send for each request"
                                    persistent-hint
                                    v-model="explorer.faucet.amount"
                                    :suffix="`${explorer.token || 'ETH'}`"
                                    label="Drip Amount"></v-text-field>
                                <v-text-field
                                    class="mt-2"
                                    dense
                                    outlined
                                    required
                                    :rules="[v => !!v || 'Interval is required']"
                                    type="number"
                                    hint="Minimum time between requests for each address"
                                    v-model="explorer.faucet.interval"
                                    persistent-hint
                                    suffix="hours"
                                    label="Interval Between Drips"></v-text-field>
                                <v-card-actions class="pr-0 pb-0">
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="loading" color="primary" :disabled="!valid || !faucet.active || switchLoading" type="submit">Update</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else-if="explorer">
            <v-card outlined>
                <Create-Explorer-Faucet-Modal ref="createExplorerFaucetModal" />
                <v-card-text>
                    When creating the faucet, you will get an address that you will
                    need to top-up with test tokens.
                    You will also be asked for a drip amount and a drip interval.
                    Once the setup is done, it will be available in your explorer.
                </v-card-text>
                <v-card-actions>
                    <v-btn :loading="loading" color="primary" @click="openCreateExplorerFaucetModal">Create Faucet</v-btn>
                </v-card-actions>
            </v-card>
        </template>
        <template v-else>
            <v-card outlined>
                <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import CreateExplorerFaucetModal from './CreateExplorerFaucetModal';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei.js';

export default {
    name: 'ExplorerFaucetSettings',
    props: ['explorerId', 'sso'],
    components: {
        CreateExplorerFaucetModal,
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: false,
        switchLoading: false,
        active: null,
        successMessage: null,
        errorMessage: null,
        valid: false,
        explorer:  null,
        faucet: null,
        balance: null
    }),
    mounted() {
        this.loadExplorer();
    },
    methods: {
        toggleFaucet() {
            this.switchLoading = true;
            const fn = this.active ? 'deactivateFaucet' : 'activateFaucet';
            this.server[fn](this.faucet.id)
                .then(() => {
                    this.active = !this.active;
                    this.loadExplorer();
                })
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while updating faucet. Please retry.';
                })
                .finally(() => this.switchLoading = false);
        },
        refreshFaucetBalance() {
            this.server.getFaucetBalance(this.faucet.id)
                .then(({ data }) => this.balance = data.balance)
                .catch(console.log);
        },
        updateFaucet() {
            this.loading = true;
            this.errorMessage = null;
            this.successMessage = null;
            this.server.updateFaucet(this.faucet.id, this.faucet.amount, this.faucet.interval)
                .then(() => {
                    this.successMessage = 'Settings updated.';
                    this.loadExplorer()
                })
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while creating faucet. Please retry.';
                })
                .finally(() => this.loading = false);
        },
        loadExplorer() {
            this.server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    this.explorer = data;
                    this.faucet = data.faucet;
                    this.active = data.faucet.active;
                    if (this.faucet)
                        this.refreshFaucetBalance();
                })
                .catch(console.log);
        },
        openCreateExplorerFaucetModal() {
            this.$refs.createExplorerFaucetModal.open({
                explorerId: this.explorerId,
                token: this.explorer.token || 'ETH'
            })
            .then(updated => {
                if (updated) {
                    this.explorer = null;
                    this.loadExplorer();
                }
            })
        }
    },
    computed: {
        ...mapGetters([
        ]),
        mainExplorerDomain() {
            if (!this.explorer)
                return null;
            return this.explorer && this.explorer.domains.length ?
                this.explorer.domains[0].domain :
                this.explorer.domain;
        }
    },
    watch: {
    }
}
</script>
