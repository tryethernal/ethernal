<template>
    <v-container fluid>
        <v-tabs v-model="tab" class="mb-2">
            <v-tab href="#workspace">Workspace</v-tab>
            <v-tab v-if="isBillingEnabled" href="#billing">Billing</v-tab>
            <v-tab href="#account">Account</v-tab>
        </v-tabs>

        <v-tabs-window :value="tab">
            <v-tab-window-item value="workspace">
                <v-row class="px-4 py-2">
                    <v-col lg="6">
                        <v-alert v-show="updateSuccess" density="compact" text type="success">Settings updated</v-alert>
                        <v-alert v-show="updateError || errorMessage" density="compact" text type="error">{{ errorMessage  || 'Error while updating settings' }}</v-alert>
                        <h4>General</h4>
                        <v-card border flat class="mb-4">
                            <v-card-text>
                                <v-text-field
                                    variant="outlined"
                                    v-model="settings.name"
                                    hide-details="auto"
                                    id="name"
                                    label="Workspace Name">
                                </v-text-field>
                                <v-text-field
                                    variant="outlined"
                                    class="mt-3"
                                    v-model="settings.rpcServer"
                                    hide-details="auto"
                                    id="rpcServer"
                                    label="RPC Server">
                                </v-text-field>
                                <template v-if="!isPublicExplorer">You will need to restart the CLI or the Hardhat node for a server change to take effect.</template>
                                <v-select id="chain" class="mt-3" item-title="label" item-value="slug" variant="outlined" required label="Chain" v-model="settings.chain" :items="availableChains" hide-details="auto"></v-select>
                                <v-row class="mt-2 pb-1 mr-2">
                                    <v-spacer></v-spacer>
                                    <v-btn id="updateOptions" :loading="loading" variant="flat" color="primary" class="mt-1" @click="update()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <h4>Default Contracts Call Options</h4>
                        <v-card border flat class="mb-4">
                            <v-skeleton-loader type="list-item-three-line" v-if="optionsLoader"></v-skeleton-loader>
                            <v-card-text v-else>
                               <v-select
                                    id="defaultAccount"
                                    variant="outlined"
                                    label="Default From Account"
                                    hide-details="auto"
                                    v-model="settings.defaultAccount"
                                    item-title="address"
                                    :items="accounts">
                                    <template v-slot:item="{ item }">
                                        <v-icon size="small" class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                        {{ item.address }}
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <v-icon size="small" class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                        {{ item.address }}
                                    </template>
                                </v-select>
                                <v-text-field
                                    id="gasPrice"
                                    variant="outlined"
                                    v-model="settings.gasPrice"
                                    class="mt-4"
                                    hide-details="auto"
                                    label="Default Gas Price (wei)">
                                </v-text-field>
                                <v-text-field
                                    id="gasLimit"
                                    variant="outlined"
                                    v-model="settings.gasLimit"
                                    class="mt-4"
                                    hide-details="auto"
                                    label="Default Maximum Gas">
                                </v-text-field>

                                <v-row class="mt-2 pb-1 mr-2">
                                    <v-spacer></v-spacer>
                                    <v-btn id="updateCallOptions" :loading="loading" variant="flat" color="primary" class="mt-1" @click="update()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <h4>Workspaces</h4>
                        <Workspace-List />

                        <h4>Advanced Options</h4>
                        <v-card border flat class="mb-4">
                            <v-skeleton-loader type="list-item-three-line" v-if="advancedOptionsLoading"></v-skeleton-loader>
                            <v-card-text v-else>
                                <v-row>
                                    <v-col align-self="center">
                                        Transactions Tracing <a style="text-decoration: none" target="_blank" href="https://doc.tryethernal.com/dashboard-pages/transactions#trace"><v-icon size="small">mdi-help-circle-outline</v-icon></a>
                                    </v-col>
                                    <v-col>
                                        <v-select density="compact" variant="outlined" hide-details="auto" label="Status"
                                            :items="advancedOptionsDesc[0].choices"
                                            item-title="label"
                                            item-value="slug"
                                            v-model="settings.tracing">
                                        </v-select>
                                    </v-col>
                                </v-row>
                                <v-row class="mt-2 pb-1 mr-1">
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="advancedOptionsLoading" variant="flat" color="primary" class="mt-2" @click="updateAdvancedOptions()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <h4 class="text-error">Danger Zone</h4>
                        <v-sheet border class="pa-0 bg-error" rounded>
                            <v-card class="elevation-0">
                                <v-card-text class="font-weight-medium text-error">
                                    <v-row>
                                        Resetting this workspace will remove all accounts/transactions/blocks/contracts from your dashboard.
                                        You will need to resync them.
                                        This cannot be undone.
                                    </v-row>
                                    <v-row class="mt-2 pb-1">
                                        <v-spacer></v-spacer>
                                        <v-btn id="resetWorkspace" :loading="resetWorkspaceLoading" variant="flat" color="error" class="mt-2" @click="resetWorkspace()"><v-icon>mdi-sync</v-icon>Reset Workspace</v-btn>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </v-sheet>
                    </v-col>
                </v-row>
            </v-tab-window-item>

            <v-tab-window-item v-if="isBillingEnabled" value="billing">
                <Billing />
            </v-tab-window-item>

            <v-tab-window-item value="account">
                <Account />
            </v-tab-window-item>
        </v-tabs-window>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import { mapStores } from 'pinia';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

import WorkspaceList from './WorkspaceList';
import Billing from './Billing';
import Account from './Account';

export default {
    name: 'Settings',
    components: {
        WorkspaceList,
        Billing,
        Account
    },
    data: () => ({
        plans: [
            {
                name: 'Premium',
                slug: 'premium',
                price: '$20/mo'
            }
        ],
        billingHeaders: [
            {
                text: 'Name',
                value: 'name'
            },
            {
                text: 'Price',
                value: 'price'
            },
            {
                text: '',
                value: 'actions',
                align: 'right'
            }
        ],
        advancedOptionsDesc: [
            {
                slug: 'tracing',
                choices: [
                    { label: 'Disabled', slug: 'disabled' },
                    { label: 'Trace on a Hardhat network', slug: 'hardhat' },
                    { label: 'Trace on a non-Hardhat network', slug: 'other' }
                ]
            }
        ],
        availableChains: [],
        settings: {},
        workspaces: [],
        accounts: [],
        loading: false,
        updateSuccess: false,
        updateError: false,
        optionsLoader: false,
        resetWorkspaceLoading: false,
        advancedOptionsLoading: false,
        errorMessage: null
    }),
    mounted: function() {
        Object.values(this.chains).map(chain => this.availableChains.push({
            label: chain.name,
            slug: chain.slug
        }))
        if (!this.tab)
            this.tab = 'workspace';

        this.$server.getAccounts({ page: -1 })
            .then(({ data: { items } }) => this.accounts = items)
            .catch(console.log);

        this.settings = {
            workspaceId: this.currentWorkspace.id,
            chain: this.currentWorkspace.chain,
            defaultAccount: this.currentWorkspace.defaultAccount,
            gasLimit: this.currentWorkspace.gasLimit,
            gasPrice: this.currentWorkspace.gasPrice,
            name: this.currentWorkspace.name,
            networkId: this.currentWorkspace.networkId,
            rpcServer: this.currentWorkspace.rpcServer,
            tracing: this.currentWorkspace.tracing
        };
    },
    methods: {
        updateAdvancedOptions() {
            this.advancedOptionsLoading = true;
            this.updateSuccess = false;
            this.updateError = false;

            this.$server.updateWorkspaceSettings({ advancedOptions: { tracing: this.settings.tracing }})
                .then(() => {
                    this.updateSuccess = true;
                    this.currentWorkspaceStore.updateCurrentWorkspace(this.settings);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.advancedOptionsLoading = false);
        },
        update() {
            this.loading = true;
            this.updateSuccess = false;
            this.updateError = false;
            this.errorMessage = null;

            if (!this.isPublicExplorer)
                this.$server.initRpcServer(this.settings.rpcServer)
                    .then(this.updateWorkspaceSettings)
                    .catch((error) => {
                        this.errorMessage = error.reason || error.message;
                        this.loading = false;
                    });
            else
                this.updateWorkspaceSettings();
        },
        updateWorkspaceSettings() {
            this.$server.updateWorkspaceSettings({
                name: this.settings.name,
                rpcServer: this.settings.rpcServer,
                chain: this.settings.chain,
                settings: {
                    defaultAccount: this.settings.defaultAccount,
                    gasLimit: this.settings.gasLimit,
                    gasPrice: this.settings.gasPrice
                }
            })
            .then(() => {
                this.updateSuccess = true;
                this.currentWorkspaceStore.updateCurrentWorkspace(this.settings);
            })
            .catch(error => {
                this.updateError = true;
                this.errorMessage = error.response && error.response.data || 'Error while updating settings. Please retry.';
            })
            .finally(() => this.loading = false);
        },
        callFunction(name) {
            this[name]();
        },
        resetWorkspace() {
            if (confirm(`Are you sure you want to reset the workspace ${this.currentWorkspace.name}? This action is definitive.`)) {
                this.resetWorkspaceLoading = true;
                this.$server.resetWorkspace()
                    .then(({ data }) => {
                        if (data.needsBatchReset)
                            alert('Your workspace is being reset. It might take some time for all the data to be cleared.')
                        else
                            alert('Workspace reset finished!');
                    })
                    .catch((error) => {
                        alert('Error while resetting the workspace, please retry');
                        console.log(error);
                    })
                    .finally(() => this.resetWorkspaceLoading = false)
            }
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore),
        ...mapGetters([
            'isPublicExplorer',
            'isBillingEnabled',
            'currentWorkspace',
            'user',
            'chain',
            'chains'
        ]),
        tab: {
            set(tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } });
            },
            get() {
                return this.$route.query.tab;
            }
        }
    }
}
</script>
