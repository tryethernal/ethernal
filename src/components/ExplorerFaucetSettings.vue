<template>
    <v-container fluid>
        <template v-if="explorer && explorer.faucet">
            <v-row>
                <v-col cols="6">
                    <v-card border flat class="my-6">
                        <v-card-text>
                            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                            <v-alert text type="success" v-if="successMessage">{{ successMessage }}</v-alert>

                            <v-switch @click.prevent="toggleFaucet()" :loading="switchLoading || active === null" class="mt-1" v-model="active" inset :label="`${faucet.active ? 'Active' : 'Inactive'}`"></v-switch>
                            <strong>URL:</strong> <a :href="`//${mainExplorerDomain}/faucet`" target="_blank">https://{{ mainExplorerDomain }}/faucet</a><br>
                            <strong>Address:</strong> <Hash-Link :type="'address'" :hash="faucet.address" :fullHash="true" :withName="false" /><br>
                            <strong>Balance:</strong>&nbsp;
                            <template v-if="balance">{{ balance | fromWei('ether', explorer.token) }}</template>
                            <template v-else><i>Fetching...</i></template>

                            <v-divider class="mt-4 mb-6"></v-divider>

                            <v-form :disabled="!faucet.active || switchLoading || loading" @submit.prevent="updateFaucet()" v-model="valid">
                                <v-text-field
                                    density="compact"
                                    variant="outlined"
                                    required
                                    :rules="[
                                        v => !!v || 'Amount is required',
                                        v => parseFloat(v) > 0 || 'Amount needs to be greater than 0'
                                    ]"
                                    type="number"
                                    hint="Amount to send for each request"
                                    persistent-hint
                                    v-model="amount"
                                    :suffix="`${explorer.token || 'ETH'}`"
                                    label="Drip Amount"></v-text-field>
                                <v-text-field
                                    class="mt-2"
                                    density="compact"
                                    variant="outlined"
                                    required
                                    :rules="[
                                        v => !!v || 'Interval is required',
                                        v => parseFloat(v) > 0 || 'Interval needs to be greater than 0'
                                    ]"
                                    type="number"
                                    hint="Minimum time between requests for each address"
                                    v-model="interval"
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
                    <h4 class="text-error">Danger Zone</h4>
                    <Explorer-Faucet-Settings-Danger-Zone @delete="loadExplorer" :explorerId="explorer.id" :faucetId="faucet.id" />
                </v-col>
            </v-row>
        </template>
        <template v-else-if="explorer">
            <v-card border flat>
                <Create-Explorer-Faucet-Modal ref="createExplorerFaucetModal" />
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-faucet</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            Setup your faucet in two easy steps:
                            <ol>
                                <li>Enter the drip amount, and the interval between requests.</li>
                                <li>Top-up your assigned faucet address with test tokens.</li>
                            </ol>
                            <br>
                            Having a faucet integrated in your explorer will make it easier for your users to
                            request test tokens, and save you time by having one less tool to build & maintain.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
                <v-card-actions class="mb-4">
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" @click="openCreateExplorerFaucetModal">Setup your Faucet</v-btn>
                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </template>
        <template v-else>
            <v-card border flat>
                <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
            </v-card>
        </template>
    </v-container>
</template>

<script>
const ethers = require('ethers');
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import CreateExplorerFaucetModal from './CreateExplorerFaucetModal';
import ExplorerFaucetSettingsDangerZone from './ExplorerFaucetSettingsDangerZone';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei.js';

export default {
    name: 'ExplorerFaucetSettings',
    props: ['explorerId', 'sso'],
    components: {
        CreateExplorerFaucetModal,
        ExplorerFaucetSettingsDangerZone,
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
        balance: null,
        pusherUnsubscribe: null
    }),
    mounted() {
        this.loadExplorer();
        this.pusherUnsubscribe = this.$pusher.onNewTransaction(data => {
            if (this.faucet && (data.from == this.faucet.address || data.to == this.faucet.address))
                this.refreshFaucetBalance();
        }, this);
    },
    destroyed() {
        if (this.pusherUnsubscribe)
            this.pusherUnsubscribe();
    },
    methods: {
        toggleFaucet() {
            this.switchLoading = true;
            const fn = this.active ? 'activateFaucet' : 'deactivateFaucet';
            this.server[fn](this.faucet.id)
                .then(() => this.faucet.active = this.active)
                .catch(error => this.errorMessage = error.response && error.response.data || 'Error while updating faucet. Please retry.')
                .finally(() => this.switchLoading = false);
        },
        refreshFaucetBalance() {
            if (this.faucet && this.faucet.id)
                this.$server.getFaucetBalance(this.faucet.id)
                    .then(({ data }) => this.balance = data.balance)
                    .catch(console.log);
        },
        updateFaucet() {
            this.loading = true;
            this.errorMessage = null;
            this.successMessage = null;
            this.$server.updateFaucet(this.faucet.id, this.faucet.amount, this.faucet.interval)
                .then(() => this.successMessage = 'Settings updated.')
                .catch(error => this.errorMessage = error.response && error.response.data || 'Error while updating faucet. Please retry.')
                .finally(() => this.loading = false);
        },
        loadExplorer() {
            this.$server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    this.explorer = data;
                    this.faucet = data.faucet;
                    if (this.faucet) {
                        this.active = data.faucet.active;
                        this.refreshFaucetBalance();
                    }
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
        ...mapStores(
            useCurrentWorkspaceStore
        ),
        mainExplorerDomain() {
            if (!this.explorer)
                return null;
            return this.explorer && this.explorer.domains && this.explorer.domains.length ?
                this.explorer.domains[0].domain :
                this.explorer.domain;
        },
        amount: {
            get() {
                return ethers.utils.formatUnits(this.faucet.amount).toString();
            },
            set(val) {
                this.faucet.amount = ethers.utils.parseUnits(val).toString();
            }
        },
        interval: {
            get() {
                return parseFloat(this.faucet.interval) / 60;
            },
            set(val) {
                this.faucet.interval = parseFloat(val) * 60;
            }
        }
    },
    watch: {
        faucet() {
            if (this.explorer && this.explorer.workspaceId == this.currentWorkspaceStore.id)
                this.explorerStore.updateExplorer({ faucet: this.faucet });
        }
    },
}
</script>
