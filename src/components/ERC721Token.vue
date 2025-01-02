<template>
    <v-container v-if="notAToken && !loading" fluid>
        <v-card>
            <v-card-text>
                <v-row>
                    <v-col align="center">
                        <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-palette-advanced</v-icon>
                    </v-col>
                </v-row>
                <v-row>
                    <v-col class="text-body-1 text-center">
                        We couldn't find a token with this id (<strong>{{ tokenId }}</strong>) at this address (<router-link :type="'address'" :to="`/address/${hash}`">{{ hash }}</router-link>).
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-container>
    <v-container v-else fluid>
        <ERC721-Token-Transfer-Modal ref="erc721TokenTransferModal" :address="hash" :token="token" />

        <v-alert class="mb-3" density="compact" text v-if="metadataReloaded" type="success">A metadata reload for this token has been queued for processing. It will be updated soon.</v-alert>
        <v-row class="mb-3">
            <v-col v-if="token.attributes.image_data && !loading" cols="12" sm="6" lg="4">
                <v-card flat :color="token.attributes.background_color ? `#${token.attributes.background_color}` : ''" rounded="lg" class="mb-1">
                    <div class="fill ma-1" v-html="token.attributes.image_data"></div>
                </v-card>
            </v-col>
            <v-col v-else-if="loading" cols="12" sm="6" lg="3">
                <v-skeleton-loader type="image"></v-skeleton-loader>
            </v-col>

            <v-col cols="12" sm="6">
                <v-card v-if="!loading">
                    <template v-slot:subtitle>
                        <div class="pb-0 d-flex justify-space-between align-center">
                            <Router-Link align="middle" :to="`/nft/${hash}`" class="text-h6 text-decoration-none">{{ contract.tokenName }}</Router-Link>
                            <span>
                            <v-tooltip v-if="token.attributes.external_url" location="top">
                                <template v-slot:activator="{ props }">
                                    <a target="_blank" v-bind="props" class="text-decoration-none" :href="token.attributes.external_url" v-if="token.attributes.external_url">
                                        <v-icon color="primary" class="mr-2">mdi-open-in-new</v-icon>
                                    </a>
                                </template>
                                See on {{ hostOf(token.attributes.external_url) }}
                            </v-tooltip>
                            <v-tooltip location="top" v-if="currentWorkspaceStore.public">
                                <template v-slot:activator="{ props }">
                                    <v-btn @click="reloadMetadata" v-bind="props" variant="text" icon="mdi-refresh" size="small"></v-btn>
                                </template>
                                Reload metadata
                            </v-tooltip>
                            <v-tooltip location="top">
                                <template v-slot:activator="{ props }">
                                    <v-btn @click="openErc721TokenTransferModal()" v-bind="props" variant="text" icon="mdi-send" size="small"></v-btn>
                                </template>
                                Transfer Token
                            </v-tooltip>
                            </span>
                        </div>
                    </template>
                    <v-card-title class="text-h4 font-weight-bold">{{ token.attributes.name }}</v-card-title>
                    <v-card-subtitle>Owned by <Hash-Link :type="'address'" :hash="token.owner" /></v-card-subtitle>
                    <v-card-text v-if="token.attributes.description">{{ token.attributes.description }}</v-card-text>
                </v-card>
                <v-card v-else>
                    <template v-slot:subtitle>
                        <v-skeleton-loader type="paragraph"></v-skeleton-loader>
                    </template>
                </v-card>
            </v-col>

            <v-col cols="12">
                <h3 class="mb-2">Transfers</h3>
                <v-card>
                    <v-card-text>
                        <ERC-721-Token-Transfers :address="hash" :tokenId="tokenId" />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <template v-if="token.attributes.properties.length">
            <h3>Properties</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(property, idx) in token.attributes.properties" :key="idx">
                    <v-card>
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption text-primary">{{ property.trait_type }}</div>
                            <div class="text-h6 font-weight-bold text-primary text-truncate">
                                <v-tooltip location="top">
                                    <template v-slot:activator="{ props }">
                                        <span  v-bind="props">
                                            {{ property.value }}
                                        </span>
                                    </template>
                                    {{ property.value }}
                                </v-tooltip>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.levels.length">
            <h3>Levels</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(level, idx) in token.attributes.levels" :key="idx">
                    <v-card>
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption text-primary">{{ level.trait_type }}</div>
                            <div class="text-h6 font-weight-bold text-primary">{{ level.value }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.boosts.length">
            <h3>Boosts</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" class="text-center" v-for="(boost, idx) in token.attributes.boosts" :key="idx">
                    <v-progress-circular :rotate="360" :size="100" :width="15" :model-value="boost.display_type == 'boost_percentage' ? boost.value : 100" color="primary">
                        <div class="text-h6 font-weight-bold text-primary">+{{ boost.value }}{{ boost.display_type == 'boost_percentage' ? '%' : '' }}</div>
                    </v-progress-circular>
                    <div class="text-h6 font-weight-bold text-primary">{{ boost.trait_type }}</div>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.stats.length">
            <h3>Stats</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(stat, idx) in token.attributes.stats" :key="idx">
                    <v-card>
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption text-primary">{{ stat.trait_type }}</div>
                            <div class="text-h6 font-weight-bold text-primary">{{ stat.value }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.dates.length">
            <h3>Dates</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(date, idx) in token.attributes.dates" :key="idx">
                    <v-card>
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption text-primary">{{ date.trait_type }}</div>
                            <div class="text-h6 font-weight-bold text-primary">{{ moment(new Date(date.value * 1000)).format('dddd, MMMM Do, YYYY') }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <v-expansion-panels variant="accordion" flat>
            <v-expansion-panel>
                <v-expansion-panel-title><h3>Raw Metadata</h3></v-expansion-panel-title>
                <v-expansion-panel-text>
                    <v-card-text>
                        <pre style="overflow: hidden;">{{ token.metadata }}</pre>
                    </v-card-text>
                </v-expansion-panel-text>
                </v-expansion-panel>
        </v-expansion-panels>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

import ERC721TokenTransfers from './ERC721TokenTransfers';
import ERC721TokenTransferModal from './ERC721TokenTransferModal';
import HashLink from './HashLink';

export default {
    name: 'ERC721Token',
    props: ['hash', 'tokenId'],
    components: {
        ERC721TokenTransfers,
        ERC721TokenTransferModal,
        HashLink
    },
    data: () => ({
        loading: false,
        notAToken: false,
        metadataReloaded: false,
        transfers: [],
        contract: {},
        token: {
            metadata: {},
            attributes: { properties: [], levels: [], boosts: [], stats: [], dates: [] }
        }
    }),
    methods: {
        moment: moment,
        hostOf(url) {
            return new URL(url).host;
        },
        openErc721TokenTransferModal() {
            this.$refs.erc721TokenTransferModal
                .open({ address: this.hash, token: this.token })
                .then((reload) => reload ? this.getErc721Token() : null);
        },
        reloadMetadata() {
            this.metadataReloaded = false;
            this.$server.reloadErc721Token(this.hash, this.tokenId)
                .then(() => this.metadataReloaded = true)
                .catch(console.log);
        },
        getErc721Token() {
            this.loading = true;
            this.$server.getErc721TokenById(this.hash, this.tokenId)
                .then(({ data }) => {
                    if (!data) return this.notAToken = true;

                    this.token = data;
                    if (this.token.contract)
                        this.contract = this.token.contract;
                    else
                        this.getContract();

                    this.getErc721TokenTransfers();
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        getErc721TokenTransfers() {
            this.$server.getErc721TokenTransfers(this.hash, this.token.tokenId)
                .then(({ data }) => this.transfers = data)
                .catch(console.log);
        },
        getContract() {
            this.$server.getContract(this.hash)
                .then(({ data }) => this.contract = data)
                .catch(console.log);
        }
    },
    watch: {
        hash: {
            immediate: true,
            handler() {
                this.getErc721Token();
            }
        }
    },
    computed: {
        ...mapStores(useCurrentWorkspaceStore)
    }
}
</script>
<style>
.fill {
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden
}
.fill img {
    flex-shrink: 0;
    min-width: 100%;
    min-height: 100%
}
.v-card-subtitle {
    opacity: var(--v-card-subtitle-opacity, var(--v-high-emphasis-opacity));
}
</style>
