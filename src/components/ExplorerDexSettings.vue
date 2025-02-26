<template>
    <v-container fluid>
        <template v-if="explorer && explorer.v2Dex">
            <v-row>
                <v-col cols="6">
                    <v-card class="my-6">
                        <v-card-text>
                            <v-switch @click.prevent="toggleDex()" :loading="loading || !v2Dex || v2Dex.active === null" class="mt-1" v-model="v2Dex.active" inset :label="`${v2Dex.active ? 'Active' : 'Inactive'}`"></v-switch>
                            <strong>URL:</strong> <a :href="`//${mainExplorerDomain}/dex`" target="_blank">https://{{ mainExplorerDomain }}/dex</a><br>
                            <strong>Router:</strong> <Hash-Link :type="'address'" :hash="explorer.v2Dex.routerAddress" :fullHash="true" :withName="false" /><br>
                            <strong>Factory:</strong> <Hash-Link :type="'address'" :hash="explorer.v2Dex.factoryAddress" :fullHash="true" :withName="false" /><br>
                            <strong>Wrapped Native Token:</strong> <Hash-Link :contract="explorer.v2Dex.wrappedNativeTokenContract" :type="'address'" :hash="explorer.v2Dex.wrappedNativeTokenContract.address" :withTokenName="true" :withName="true" /><br>
                            <v-divider class="my-4"></v-divider>
                            <strong>Pairs synchronization status:</strong>
                            <v-progress-linear buffer-color="grey" buffer-value="100" buffer-opacity="1" v-if="pairSyncProgress != null" :query="pairSyncProgress == null" :model-value="pairSyncProgress" rounded height="20">
                                <template v-slot:default="{ value }">
                                    <small class="text-white">{{ value.toFixed(2) }}% ({{ pairCount }} / {{ totalPairs }})</small>
                                </template>
                            </v-progress-linear>
                            <v-progress-linear v-else indeterminate rounded height="20"></v-progress-linear>
                            <template v-if="!explorer.stripeSubscription">Start a subscription to sync pairs.</template>
                            <template v-else-if="maxPairs">You can only sync up to {{ maxPairs }} pairs during your trial. Contact support to remove this limit.</template>
                        </v-card-text>
                    </v-card>
                    <h4 class="text-error">Danger Zone</h4>
                    <Explorer-Dex-Settings-Danger-Zone @delete="deletedExplorer" :v2DexId="v2Dex.id" />
                </v-col>
            </v-row>
        </template>
        <template v-else-if="explorer">
            <v-card>
                <Create-Explorer-Dex-Modal ref="createExplorerDexModal" />
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-swap-horizontal</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            Before setting up your dex UI, make sure you've already deployed the UniswapV2Router02 contract.<br>
                            Once it's done, you'll just need the contract address to continue.
                            <br><br>
                            By using this integrated dex, you won't have to build another UI from scratch, your token list will
                            always be synchronized, you'll have access to pool analytics right away, and your users will have everything
                            they need to interact with your chain in the same place.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
                <v-card-actions class="mb-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="flat" :loading="loading" color="primary" @click="openCreateExplorerDexModal">Setup your Dex</v-btn>
                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </template>
        <template v-else>
            <v-card>
                <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
            </v-card>
        </template>
    </v-container>
</template>

<script>
import { mapStores } from 'pinia';
import { useExplorerStore } from '../stores/explorer';
import { useEnvStore } from '../stores/env';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import CreateExplorerDexModal from './CreateExplorerDexModal.vue';
import ExplorerDexSettingsDangerZone from './ExplorerDexSettingsDangerZone.vue';
import HashLink from './HashLink.vue';

export default {
    name: 'ExplorerDexSettings',
    props: ['explorerId', 'sso'],
    components: {
        CreateExplorerDexModal,
        ExplorerDexSettingsDangerZone,
        HashLink
    },
    data: () => ({
        loading: false,
        explorer: null,
        v2Dex: null,
        pairCount: null,
        totalPairs: null,
        statusLoadingInterval: null
    }),
    mounted() {
        this.loadExplorer();
    },
    destroyed() {
        if (this.statusLoadingInterval)
            clearTimeout(this.statusLoadingInterval);
    },
    methods: {
        deletedExplorer() {
            if (this.statusLoadingInterval)
                clearTimeout(this.statusLoadingInterval);
            this.loadExplorer();
        },
        loadExplorer() {
            this.loading = true;
            this.$server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    this.v2Dex = data.v2Dex;
                    if (this.v2Dex)
                        this.loadStatus();
                    this.explorer = data;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        loadStatus() {
            this.$server.getV2DexStatus(this.v2Dex.id)
                .then(({ data }) => {
                    this.pairCount = data.pairCount;
                    this.totalPairs = data.totalPairs;
                    if (this.pairCount < this.totalPairs && (!this.maxPairs || this.pairCount < this.maxPairs)) {
                        this.statusLoadingInterval = setTimeout(() => this.loadStatus(), 3000);
                    }
                    else if (this.statusLoadingIntervalClear) {
                        clearTimeout(this.statusLoadingInterval);
                    }
                })
                .catch(console.log);
        },
        openCreateExplorerDexModal() {
            this.$refs.createExplorerDexModal.open({
                explorerId: this.explorerId,
            })
            .then(v2Dex => {
                if (!!v2Dex) {
                    this.explorer = null;
                    this.loadExplorer();
                }
            })
        },
        toggleDex() {
            this.loading = true;
            const fn = this.v2Dex.active ? this.$server.deactivateV2Dex : this.$server.activateV2Dex;
            fn(this.v2Dex.id)
                .then(() => this.v2Dex = { ...this.v2Dex, active: !this.v2Dex.active })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapStores(
            useCurrentWorkspaceStore,
            useEnvStore,
            useExplorerStore
        ),
        pairSyncProgress() {
            if (this.pairCount == null || this.totalPairs == null)
                return null;
            return this.pairCount / this.totalPairs * 100;
        },
        mainExplorerDomain() {
            if (!this.explorer)
                return null;
            return this.explorer && this.explorer.domains && this.explorer.domains.length ?
                this.explorer.domains[0].domain :
                this.explorer.domain;
        },
        maxPairs() {
            if (!this.explorer.stripeSubscription)
                return 0;
            if (this.explorer.stripeSubscription.isTrialing || this.explorer.isDemo)
                return this.envStore.maxV2DexPairsForTrial;
            return null;
        }
    },
    watch: {
        v2Dex() {
            if (this.explorer && this.explorer.workspaceId == this.currentWorkspaceStore.id)
                this.explorerStore.updateExplorer({ v2Dex: this.v2Dex });
        }
    },
}
</script>
