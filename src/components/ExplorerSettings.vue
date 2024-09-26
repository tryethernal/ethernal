<template>
    <v-card border flat>
        <v-card-text>
            <v-alert v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
            <v-alert v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>
            <v-form @submit.prevent="updateExplorerSettings()" v-model="valid">
                <v-row>
                    <v-col>
                        <v-select
                            variant="outlined"
                            density="compact"
                            label="Associated Workspace"
                            v-model="currentWorkspace"
                            item-title="name"
                            :items="workspaces"
                            return-object>
                            <template v-slot:item="{ item }">
                                {{ item.name }}<small class="ml-2">({{ shortRpcUrl(item.rpcServer) }} | {{  item.networkId }})</small>
                            </template>
                            <template v-slot:selection="{ item }">
                                {{ item.name }}<small class="ml-2">({{ shortRpcUrl(item.rpcServer) }} | {{  item.networkId }})</small>
                            </template>
                        </v-select>
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            v-model="explorer.name"
                            label="Name"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            v-model="explorer.slug"
                            :suffix="`.${mainDomain}`"
                            hint="Your explorer will always be reachable at this address"
                            persistent-hint
                            label="Ethernal Domain"></v-text-field>
                        <v-text-field
                            class="mb-2"
                            density="compact"
                            variant="outlined"
                            :disabled="!capabilities.nativeToken"
                            :hint="capabilities.nativeToken ? '' : 'Upgrade your plan to customize your native token symbol.'"
                            v-model="explorer.token"
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
                            v-model="explorer.totalSupply"
                            label="Total Supply (in wei)"></v-text-field>
                        <v-text-field
                            density="compact"
                            variant="outlined"
                            :rules="[v => !v || this.isUrlValid(v) || 'Invalid URL']"
                            persistent-hint
                            placeholder="https://etherscan.io"
                            v-model="explorer.l1Explorer"
                            :hint="explorer.l1Explorer ? `L1 links will look like this: ${explorer.l1Explorer}/block/1234` : `If the L1BlockNumber key is on the block object, this setting will be used to display a link to the L1 explorer.${capabilities.l1Explorer ? '' : ' Upgrade your plan to use it.'}`"
                            label="L1 Explorer Base URL"></v-text-field>
                    </v-col>
                </v-row>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" :disabled="!valid" type="submit">Update</v-btn>
                </v-card-actions>
            </v-form>
        </v-card-text>
    </v-card>
</template>

<script>
import { mapGetters } from 'vuex';
import { formatNumber, shortRpcUrl, isUrlValid } from '../lib/utils';

export default {
    name: 'Explorer',
    props: ['explorer', 'workspaces'],
    data: () => ({
        successMessage: null,
        errorMessage: null,
        currentWorkspace: null,
        valid: false,
        loading: false,
        capabilities: {}
    }),
    mounted() {
        if (this.explorer.stripeSubscription)
            this.capabilities = this.explorer.stripeSubscription.stripePlan.capabilities;
    },
    methods: {
        shortRpcUrl, isUrlValid,
        formatTotalSupply() {
            if (!this.explorer.totalSupply) return 'N/A';
            return formatNumber(this.explorer.totalSupply)
        },
        updateExplorerSettings() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;
            const settings = {
                workspace: this.currentWorkspace.name,
                name: this.explorer.name,
                slug: this.explorer.slug,
                l1Explorer: this.explorer.l1Explorer
            };

            if (this.capabilities.nativeToken)
                settings['token'] = this.explorer.token;

            if (this.capabilities.totalSupply)
                settings['totalSupply'] = this.explorer.totalSupply;

            if (this.capabilities.l1Explorer)
                settings['l1Explorer'] = this.explorer.l1Explorer;

            this.$server.updateExplorerSettings(this.explorer.id, settings)
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
        ...mapGetters([
            'mainDomain'
        ]),
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
