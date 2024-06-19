<template>
    <v-container fluid>
        <template v-if="explorer && explorer.v2Dex">
            <v-row>
                <v-col cols="6">
                    <v-card outlined class="my-6">
                        <v-card-text>
                            <strong>Router:</strong> {{ explorer.v2Dex.routerAddress }}<br>
                            <strong>Factory:</strong> {{ explorer.v2Dex.factoryAddress }}<br>
                            <strong>Pairs:</strong>
                            <ul>
                                <li v-for="(pair, idx) in explorer.v2Dex.pairs" :key="idx">
                                    {{ pair.token0.tokenSymbol }} / {{ pair.token1.tokenSymbol }}
                                </li>
                            </ul>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else-if="explorer">
            <v-card outlined>
                <Create-Explorer-Dex-Modal ref="createExplorerDexModal" />
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary lighten-1">mdi-swap-horizontal</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-spacer></v-spacer>
                        <v-col cols="6" class="text-body-1">
                            Setup your dex in two steps:
                            <ol>
                                <li>Step 1.</li>
                                <li>Step 2.</li>
                            </ol>
                            <br>
                            Explain here why having a dex is good for users.
                        </v-col>
                        <v-spacer></v-spacer>
                    </v-row>
                </v-card-text>
                <v-card-actions class="mb-4">
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" @click="openCreateExplorerDexModal">Setup your Dex</v-btn>
                    <v-spacer></v-spacer>
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
import store from '../plugins/store';
import CreateExplorerDexModal from './CreateExplorerDexModal';

export default {
    name: 'ExplorerDexSettings',
    props: ['explorerId', 'sso'],
    components: {
        CreateExplorerDexModal,
    },
    data: () => ({
        loading: false,
        explorer: null,
        v2Dex: null,
    }),
    mounted() {
        this.loadExplorer();
    },
    methods: {
        loadExplorer() {
            this.server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    this.explorer = data;
                    this.v2Dex = data.v2Dex;
                })
                .catch(console.log);
        },
        openCreateExplorerDexModal() {
            this.$refs.createExplorerDexModal.open({
                explorerId: this.explorerId,
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
            'currentWorkspace'
        ])
    },
    watch: {
        dex() {
            if (this.explorer && this.explorer.workspaceId == this.currentWorkspace.id)
                store.dispatch('updateDexSettings', this.dex);
        }
    },
}
</script>
