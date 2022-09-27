<template>
    <v-container fluid>
        <v-tabs v-model="tab" class="mb-2">
            <v-tab href="#workspace">Workspace</v-tab>
            <v-tab href="#billing">Billing</v-tab>
            <v-tab href="#account">Account</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="workspace">
                <v-row>
                    <v-col lg="5">
                        <v-alert v-show="updateSuccess" dense text type="success">Settings updated</v-alert>
                        <v-alert v-show="updateError || errorMessage" dense text type="error">{{ errorMessage  || 'Error while updating settings' }}</v-alert>
                        <h4>General</h4>
                        <v-card outlined class="mb-4">
                            <v-card-text>
                                <v-text-field
                                    outlined
                                    v-model="settings.rpcServer"
                                    hide-details="auto"
                                    id="rpcServer"
                                    label="RPC Server">
                                </v-text-field>
                                You will need to restart the CLI or the Hardhat node for a server change to take effect.
                                <v-select id="chain" class="mt-3" item-text="label" item-value="slug" outlined required label="Chain" v-model="settings.chain" :items="availableChains" hide-details="auto"></v-select>
                                <v-row class="mt-2 pb-1 mr-2">
                                    <v-spacer></v-spacer>
                                    <v-btn id="updateOptions" :loading="loading" depressed color="primary" class="mt-1" @click="update()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <h4>Default Contracts Call Options</h4>
                        <v-card outlined class="mb-4">
                            <v-skeleton-loader type="list-item-three-line" v-if="optionsLoader"></v-skeleton-loader>
                            <v-card-text v-else>
                               <v-select
                                    id="defaultAccount"
                                    outlined
                                    label="Default From Account"
                                    hide-details="auto"
                                    v-model="settings.defaultAccount"
                                    item-text="address"
                                    :items="accounts">
                                    <template v-slot:item="{ item }">
                                        <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                        {{ item.address }}
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <v-icon small class="mr-1" v-if="item.privateKey">mdi-lock-open-outline</v-icon>
                                        {{ item.address }}
                                    </template>
                                </v-select>
                                <v-text-field
                                    id="gasPrice"
                                    outlined
                                    v-model="settings.gasPrice"
                                    class="mt-4"
                                    hide-details="auto"
                                    label="Default Gas Price (wei)">
                                </v-text-field>
                                <v-text-field
                                    id="gasLimit"
                                    outlined
                                    v-model="settings.gasLimit"
                                    class="mt-4"
                                    hide-details="auto"
                                    label="Default Maximum Gas">
                                </v-text-field>

                                <v-row class="mt-2 pb-1 mr-2">
                                    <v-spacer></v-spacer>
                                    <v-btn id="updateCallOptions" :loading="loading" depressed color="primary" class="mt-1" @click="update()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <Create-Workspace-Modal ref="createWorkspaceModal" />
                        <h4>Workspaces</h4>
                        <v-card outlined class="mb-4">
                            <v-card-text>
                                <v-data-table
                                    :loading="loadingWorkspaces"
                                    :no-data-text="'No workspaces'"
                                    :items="workspaces"
                                    :headers="workspacesDataTableHeaders">
                                    <template v-slot:top>
                                        <v-toolbar flat dense class="py-0">
                                            <v-spacer></v-spacer>
                                            <v-btn depressed color="primary" class="mr-2" @click="openCreateWorkspaceModal()"><v-icon>mdi-plus</v-icon>New Workspace</v-btn>
                                        </v-toolbar>
                                    </template>
                                    <template v-slot:item.actions="{ item }">
                                        <v-icon :id="`switchTo-${item.id}`" @click="switchWorkspace(item.name)">mdi-swap-horizontal</v-icon>
                                    </template>
                                </v-data-table>
                            </v-card-text>
                        </v-card>

                        <h4>Advanced Options</h4>
                        <v-card outlined class="mb-4">
                            <v-skeleton-loader type="list-item-three-line" v-if="advancedOptionsLoading"></v-skeleton-loader>
                            <v-card-text v-else>
                                <v-row>
                                    <v-col align-self="center">
                                        Transactions Tracing <a style="text-decoration: none" target="_blank" href="https://doc.tryethernal.com/dashboard-pages/transactions#trace"><v-icon small>mdi-help-circle-outline</v-icon></a>
                                    </v-col>
                                    <v-col>
                                        <v-select dense outlined hide-details="auto" label="Status"
                                            :items="advancedOptionsDesc[0].choices"
                                            item-text="label"
                                            item-value="slug"
                                            v-model="settings.tracing">
                                        </v-select>
                                    </v-col>
                                </v-row>
                                <v-row class="mt-2 pb-1 mr-1">
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="advancedOptionsLoading" depressed color="primary" class="mt-2" @click="updateAdvancedOptions()">Update</v-btn>
                                </v-row>
                            </v-card-text>
                        </v-card>

                        <h4 class="error--text">Danger Zone</h4>
                        <v-sheet outlined class="pa-0 error" rounded>
                            <v-card class="elevation-0">
                                <v-card-text class="font-weight-medium error--text">
                                    <v-row>
                                        Resetting this workspace will remove all accounts/transactions/blocks/contracts from your dashboard.
                                        You will need to resync them.
                                        This cannot be undone.
                                    </v-row>
                                    <v-row class="mt-2 pb-1">
                                        <v-spacer></v-spacer>
                                        <v-btn id="resetWorkspace" :loading="resetWorkspaceLoading" depressed color="error" class="mt-2" @click="resetWorkspace()"><v-icon>mdi-sync</v-icon>Reset Workspace</v-btn>
                                    </v-row>
                                </v-card-text>
                            </v-card>
                        </v-sheet>
                    </v-col>
                </v-row>
            </v-tab-item>

            <v-tab-item value="billing">
                <Billing />
            </v-tab-item>

            <v-tab-item value="account">
                <Account />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>
<script>
import { mapGetters } from 'vuex';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import Billing from './Billing';
import Account from './Account';

export default {
    name: 'Settings',
    components: {
        CreateWorkspaceModal,
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
        workspacesDataTableHeaders: [
            {
                text: 'Name',
                value: 'name'
            },
            {
                text: 'RPC Server',
                value: 'rpcServer'
            },
            {
                text: '',
                value: 'actions'
            }
        ],
        availableChains: [
            { label: 'Ethereum', slug: 'ethereum' },
            { label: 'Matic', slug: 'matic' },
            { label: 'BSC', slug: 'bsc' },
            { label: 'Avalanche', slug: 'avalanche' }
        ],
        settings: {},
        workspaces: [],
        accounts: [],
        loading: false,
        updateSuccess: false,
        updateError: false,
        optionsLoader: false,
        loadingWorkspaces: true,
        resetWorkspaceLoading: false,
        advancedOptionsLoading: false,
        errorMessage: null
    }),
    mounted: function() {
        if (!this.tab)
            this.tab = 'workspace';

        this.server.getWorkspaces()
            .then(({ data }) => this.workspaces = data)
            .catch(console.log)
            .finally(() => this.loadingWorkspaces = false);

        this.server.getAccounts({ page: -1 })
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
        updateAdvancedOptions: function() {
            this.advancedOptionsLoading = true;
            this.updateSuccess = false;
            this.updateError = false;

            this.server.updateWorkspaceSettings(this.currentWorkspace.name, { advancedOptions: { tracing: this.settings.tracing }})
                .then(() => {
                    this.updateSuccess = true;
                    this.$store.dispatch('updateCurrentWorkspace', this.settings);
                })
                .catch(() => this.updateError = true)
                .finally(() => this.advancedOptionsLoading = false);
        },
        update: function() {
            this.loading = true;
            this.updateSuccess = false;
            this.updateError = false;
            this.errorMessage = null;

            this.server.initRpcServer(this.settings.rpcServer)
                .then(() => {
                    this.server.updateWorkspaceSettings({
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
                        this.$store.dispatch('updateCurrentWorkspace', this.settings);
                    })
                    .catch(() => this.updateError = true)
                    .finally(() => this.loading = false);
                })
                .catch((error) => {
                    this.errorMessage = error.reason;
                    this.loading = false;
                });
        },
        openCreateWorkspaceModal: function() {
            this.$refs.createWorkspaceModal
                .open({ workspaces: this.workspaces.map(ws => ws.id) })
                .then((workspaceCreated) => {
                    if (workspaceCreated) {
                        document.location.reload();
                    }
                });
        },
        callFunction: function(name) {
            this[name]();
        },
        switchWorkspace: function(name) {
            this.server.setCurrentWorkspace(name).then(() => document.location.reload());
        },
        resetWorkspace: function() {
            if (confirm(`Are you sure you want to reset the workspace ${this.currentWorkspace.name}? This action is definitive.`)) {
                this.resetWorkspaceLoading = true;
                this.server.resetWorkspace()
                    .then(() => {
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
        ...mapGetters([
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
