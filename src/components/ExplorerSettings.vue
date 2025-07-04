<template>
    <v-card v-if="currentExplorer">
        <v-card-text>
            <v-alert v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
            <v-alert v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>
            <v-form class="mt-4" @submit.prevent="updateExplorerSettings()" v-model="valid">
                <v-row>
                    <v-col>
                        <v-select
                            variant="outlined"
                            density="compact"
                            label="Associated Workspace"
                            v-model="currentWorkspace"
                            item-title="name"
                            :items="workspaces"
                            disabled
                            return-object>
                            <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props">
                                    <small class="ml-2">{{ shortRpcUrl(item.raw.rpcServer) }} | {{ item.raw.networkId }}</small>
                                </v-list-item>
                            </template>
                            <template v-slot:selection="{ item }">
                                {{ item.raw.name }}<small class="ml-2">({{ shortRpcUrl(item.raw.rpcServer) }} | {{ item.raw.networkId }})</small>
                            </template>
                        </v-select>
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            v-model="currentExplorer.name"
                            label="Name"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            v-model="currentExplorer.slug"
                            :suffix="`.${envStore.mainDomain}`"
                            hint="Your explorer will always be reachable at this address"
                            persistent-hint
                            label="Ethernal Domain"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            :disabled="!capabilities.nativeToken"
                            :hint="capabilities.nativeToken ? '' : 'Upgrade your plan to customize your native token symbol.'"
                            v-model="currentExplorer.token"
                            persistent-hint
                            label="Native Token Symbol"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            type="number"
                            :disabled="!capabilities.totalSupply"
                            :hint="capabilities.totalSupply ? `In ether: ${formatTotalSupply()}` : 'Upgrade your plan to display a total supply.'"
                            persistent-hint
                            hide-details="auto"
                            v-model="currentExplorer.totalSupply"
                            label="Total Supply (in wei)"></v-text-field>
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            :rules="[v => !v || this.isUrlValid(v) || 'Invalid URL']"
                            persistent-hint
                            placeholder="https://etherscan.io"
                            v-model="currentExplorer.l1Explorer"
                            :hint="currentExplorer.l1Explorer ? `L1 links will look like this: ${currentExplorer.l1Explorer}/block/1234` : `If the L1BlockNumber key is on the block object, this setting will be used to display a link to the L1 explorer.${capabilities.l1Explorer ? '' : ' Upgrade your plan to use it.'}`"
                            label="L1 Explorer Base URL"></v-text-field>
                    </v-col>
                </v-row>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" :disabled="!valid" variant="flat" type="submit">Update</v-btn>
                </v-card-actions>
            </v-form>
        </v-card-text>
    </v-card>
</template>

<script>
import { mapStores } from 'pinia';

import { useEnvStore } from '../stores/env';

import { formatNumber, shortRpcUrl, isUrlValid } from '../lib/utils';

export default {
    name: 'Explorer',
    props: ['explorer', 'workspaces'],
    data: () => ({
        successMessage: null,
        errorMessage: null,
        currentWorkspace: null,
        currentExplorer: null,
        valid: false,
        loading: false,
        capabilities: {}
    }),
    mounted() {
        this.currentExplorer = this.explorer;
        if (this.explorer.stripeSubscription)
            this.capabilities = this.explorer.stripeSubscription.stripePlan.capabilities;
    },
    methods: {
        shortRpcUrl, isUrlValid,
        formatTotalSupply() {
            if (!this.currentExplorer.totalSupply) return 'N/A';
            return formatNumber(this.currentExplorer.totalSupply)
        },
        updateExplorerSettings() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;
            const settings = {
                name: this.currentExplorer.name,
                slug: this.currentExplorer.slug,
                l1Explorer: this.currentExplorer.l1Explorer
            };

            if (this.capabilities.nativeToken)
                settings['token'] = this.currentExplorer.token;

            if (this.capabilities.totalSupply)
                settings['totalSupply'] = this.currentExplorer.totalSupply;

            if (this.capabilities.l1Explorer)
                settings['l1Explorer'] = this.currentExplorer.l1Explorer;

            this.$server.updateExplorerSettings(this.currentExplorer.id, settings)
                .then(() => {
                    this.successMessage = 'Settings updated.';
                    this.$emit('updated');
                })
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while updating settings. Please retry.';
                })
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapStores(useEnvStore),
    },
    watch: {
        workspaces: {
            immediate: true,
            handler() {
                this.currentWorkspace = this.workspaces.find(w => w.id == this.explorer.workspaceId);
            }
        }
    }
}
</script>
