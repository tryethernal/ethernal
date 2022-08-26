<template>
    <v-container fluid>
        <v-row class="mb-3">
            <v-col cols="3">
                <v-card rounded="xl" outlined class="mb-1">
                    <div class="fill" v-html="image"></div>
                </v-card>
                <a class="text-decoration-none" :href="token.metadata.external_url" v-if="token.metadata.external_url">
                    <v-icon>mdi-open-in-new</v-icon>
                </a>
            </v-col>

            <v-col cols="6">
                <v-card outlined>
                    <v-card-subtitle class="pb-0">
                        <Router-Link :to="`/contracts/${token.contract.address}`" class="text-h6 text-decoration-none">{{ token.contract.tokenName }}</Router-Link>
                    </v-card-subtitle>
                    <v-card-title class="text-h4 font-weight-bold">{{ name }}</v-card-title>
                    <v-card-subtitle>Owned by <Hash-Link :type="'address'" :hash="token.owner" /></v-card-subtitle>
                    <v-card-text v-if="token.metadata.description">{{ token.metadata.description }}</v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <h2>Properties</h2>
        <v-row class="mb-3">
            <v-col cols="2" v-for="(property, idx) in token.attributes.properties" :key="idx">
                <v-card outlined style="border-color: var(--v-primary-base);">
                    <v-card-text class="text-center" style="opacity: 1;">
                        <div class="text-caption primary--text">{{ property.trait_type }}</div>
                        <div class="text-h6 font-weight-bold primary--text">{{ property.value }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <h2>Levels</h2>
        <v-row class="mb-3">
            <v-col cols="2" v-for="(level, idx) in token.attributes.levels" :key="idx">
                <v-card outlined style="border-color: var(--v-primary-base);">
                    <v-card-text class="text-center" style="opacity: 1;">
                        <div class="text-caption primary--text">{{ level.trait_type }}</div>
                        <div class="text-h6 font-weight-bold primary--text">{{ level.value }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <h2>Boosts</h2>
        <v-row class="mb-3">
            <v-col class="text-center" cols="2" v-for="(boost, idx) in token.attributes.boosts" :key="idx">
                <v-progress-circular :rotate="360" :size="100" :width="15" :value="boost.display_type == 'boost_percentage' ? boost.value : 100" color="primary">
                    <div class="text-h6 font-weight-bold primary--text">+{{ boost.value }}{{ boost.display_type == 'boost_percentage' ? '%' : '' }}</div>
                </v-progress-circular>
                <div class="text-h6 font-weight-bold primary--text">{{ boost.trait_type }}</div>
            </v-col>
        </v-row>
        <h2>Stats</h2>
        <v-row class="mb-3">
            <v-col cols="2" v-for="(stat, idx) in token.attributes.stats" :key="idx">
                <v-card outlined style="border-color: var(--v-primary-base);">
                    <v-card-text class="text-center" style="opacity: 1;">
                        <div class="text-caption primary--text">{{ stat.trait_type }}</div>
                        <div class="text-h6 font-weight-bold primary--text">{{ stat.value }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <h2>Dates</h2>
        <v-row class="mb-3">
            <v-col cols="3" v-for="(date, idx) in token.attributes.dates" :key="idx">
                <v-card outlined style="border-color: var(--v-primary-base);">
                    <v-card-text class="text-center" style="opacity: 1;">
                        <div class="text-caption primary--text">{{ date.trait_type }}</div>
                        <div class="text-h6 font-weight-bold primary--text">{{ moment(new Date(date.value * 1000)).format('dddd, MMMM Do, YYYY') }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import HashLink from './HashLink';
const moment = require('moment');

export default {
    name: 'ERC721Token',
    props: ['hash', 'tokenId'],
    components: {
        HashLink
    },
    data: () => ({
        loading: false,
        token: {
            contract: {},
            metadata: {},
            attributes: {}
        }
    }),
    methods: {
        moment: moment,
        fetchErc721Token() {
            this.loading = true;
            this.server.getErc721Token(this.hash, this.tokenId)
                .then(({ data }) => this.token = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
    },
    watch: {
        hash: {
            immediate: true,
            handler(hash) {
                this.fetchErc721Token(hash);
            }
        }
    },
    computed: {
        image() {
            const metadata = this.token.metadata;

            if (!metadata || (metadata && !metadata.image && !metadata.image_data))
                return null;

            if (metadata.image) {
                const insertableImage = metadata.image.startsWith('ipfs://') ?
                    `https://ipfs.io/ipfs/${metadata.image.slice(7, metadata.image.length)}` : metadata.image;
                return `<img style="height: 100%; width: 100%; object-fit: cover" src="${insertableImage}" />`;
            }

            if (metadata.image_data)
                return metadata.image_data;

            return null;
        },
        name() {
            return this.token.metadata && this.token.metadata.name || `#${this.token.tokenId}`;
        }
    },
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
