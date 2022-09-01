<template>
    <v-container fluid>
        <ERC721-Token-Transfer-Modal ref="erc721TokenTransferModal" v-if="!isPublicExplorer" :address="hash" :token="token" />

        <v-alert text v-if="metadataReloaded" type="success">A metadata reload for this token has been queued for processing. It will be updated soon.</v-alert>
        <v-row class="mb-3">
            <v-col cols="12" sm="6" lg="3">
                <v-card v-if="token.attributes.image_data && !loading" :color="token.attributes.background_color ? `#${token.attributes.background_color}` : ''" rounded="xl" outlined class="mb-1">
                    <div class="fill" v-html="token.attributes.image_data"></div>
                </v-card>
                <v-skeleton-loader v-else-if="loading" type="image"></v-skeleton-loader>
            </v-col>

            <v-col cols="12" sm="6">
                <v-card outlined>
                    <template v-if="!loading">
                        <v-card-subtitle class="pb-0">
                            <Router-Link :to="`/address/${hash}`" class="text-h6 text-decoration-none">{{ contract.tokenName }}</Router-Link>
                            <div style="position: relative; float: right">
                                <v-tooltip v-if="token.attributes.external_url" top>
                                    <template v-slot:activator="{ on, attrs }">
                                        <a  v-bind="attrs" v-on="on" class="text-decoration-none" :href="token.attributes.external_url" v-if="token.attributes.external_url">
                                            <v-icon color="primary">mdi-open-in-new</v-icon>
                                        </a>
                                    </template>
                                    See on {{ hostOf(token.attributes.external_url) }}
                                </v-tooltip>
                                <v-tooltip top v-if="isPublicExplorer">
                                    <template v-slot:activator="{ on, attrs }">
                                        <a @click="reloadMetadata" v-bind="attrs" v-on="on" class="text-decoration-none">
                                            <v-icon color="primary">mdi-refresh</v-icon>
                                        </a>
                                    </template>
                                    Reload metadata
                                </v-tooltip>
                                <v-tooltip top v-if="!isPublicExplorer">
                                    <template v-slot:activator="{ on, attrs }">
                                        <a @click="openErc721TokenTransferModal()" v-bind="attrs" v-on="on" class="text-decoration-none">
                                            <v-icon color="primary">mdi-send</v-icon>
                                        </a>
                                    </template>
                                    Transfer Token
                                </v-tooltip>
                            </div>
                        </v-card-subtitle>
                        <v-card-title class="text-h4 font-weight-bold">{{ token.attributes.name }}</v-card-title>
                        <v-card-subtitle>Owned by <Hash-Link :type="'address'" :hash="token.owner" /></v-card-subtitle>
                        <v-card-text v-if="token.attributes.description">{{ token.attributes.description }}</v-card-text>
                    </template>
                    <v-card-subtitle v-else>
                        <v-skeleton-loader type="paragraph"></v-skeleton-loader>
                    </v-card-subtitle>
                </v-card>
            </v-col>

            <v-col cols="12">
                <h3 class="mb-2">Transfers</h3>
                <Token-Transfers :transfers="transfers" :dense="true" />
            </v-col>
        </v-row>

        <template v-if="token.attributes.properties.length">
            <h3>Properties</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(property, idx) in token.attributes.properties" :key="idx">
                    <v-card outlined style="border-color: var(--v-primary-base);">
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption primary--text">{{ property.trait_type }}</div>
                            <div class="text-h6 font-weight-bold primary--text text-truncate">
                                <v-tooltip top>
                                    <template v-slot:activator="{ on, attrs }">
                                        <span  v-bind="attrs" v-on="on">
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
                    <v-card outlined style="border-color: var(--v-primary-base);">
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption primary--text">{{ level.trait_type }}</div>
                            <div class="text-h6 font-weight-bold primary--text">{{ level.value }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.boosts.length">
            <h3>Boosts</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" class="text-center" v-for="(boost, idx) in token.attributes.boosts" :key="idx">
                    <v-progress-circular :rotate="360" :size="100" :width="15" :value="boost.display_type == 'boost_percentage' ? boost.value : 100" color="primary">
                        <div class="text-h6 font-weight-bold primary--text">+{{ boost.value }}{{ boost.display_type == 'boost_percentage' ? '%' : '' }}</div>
                    </v-progress-circular>
                    <div class="text-h6 font-weight-bold primary--text">{{ boost.trait_type }}</div>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.stats.length">
            <h3>Stats</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(stat, idx) in token.attributes.stats" :key="idx">
                    <v-card outlined style="border-color: var(--v-primary-base);">
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption primary--text">{{ stat.trait_type }}</div>
                            <div class="text-h6 font-weight-bold primary--text">{{ stat.value }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>

        <template v-if="token.attributes.dates.length">
            <h3>Dates</h3>
            <v-row class="mb-3">
                <v-col cols="6" sm="3" md="2" v-for="(date, idx) in token.attributes.dates" :key="idx">
                    <v-card outlined style="border-color: var(--v-primary-base);">
                        <v-card-text class="text-center" style="opacity: 1;">
                            <div class="text-caption primary--text">{{ date.trait_type }}</div>
                            <div class="text-h6 font-weight-bold primary--text">{{ moment(new Date(date.value * 1000)).format('dddd, MMMM Do, YYYY') }}</div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </template>
    </v-container>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';

import TokenTransfers from './TokenTransfers';
import ERC721TokenTransferModal from './ERC721TokenTransferModal';
import HashLink from './HashLink';

export default {
    name: 'ERC721Token',
    props: ['hash', 'index'],
    components: {
        TokenTransfers,
        ERC721TokenTransferModal,
        HashLink
    },
    data: () => ({
        loading: false,
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
            this.server.reloadErc721Token(this.hash, this.index)
                .then(() => this.metadataReloaded = true)
                .catch(console.log);
        },
        getErc721Token() {
            this.loading = true;
            this.server.getErc721Token(this.hash, this.index)
                .then(({ data }) => {
                    if (!data) return;

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
            this.server.getErc721TokenTransfers(this.hash, this.token.tokenId)
                .then(({ data }) => this.transfers = data)
                .catch(console.log);
        },
        getContract() {
            this.server.getContract(this.hash)
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
        ...mapGetters([
            'isPublicExplorer'
        ])
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
</style>
