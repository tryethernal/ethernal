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
        <ERC721-Token-Transfer-Modal ref="erc721TokenTransferModal" />

        <v-row>
            <!-- Token Image -->
            <v-col cols="12" md="5" lg="4">
                <v-card v-if="token.attributes.image_data && !loading" flat :color="token.attributes.background_color ? `#${token.attributes.background_color}` : ''" rounded="lg">
                    <div class="fill ma-1" v-html="token.attributes.image_data"></div>
                </v-card>
                <v-card v-else-if="!loading" flat rounded="lg" class="h-100 d-flex align-center">
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="300" color="grey">mdi-image-outline</v-icon>
                        </v-col>
                    </v-row>
                </v-card>
                <v-skeleton-loader v-else type="image"></v-skeleton-loader>
            </v-col>

            <!-- Token Details -->
            <v-col cols="12" md="7" lg="8">
                <span class="text-h6 font-weight-bold">{{ contract.tokenName }} #{{ tokenId }}</span>
                <v-divider vertical class="mx-2" />
                <Hash-Link class="text-subtitle-2" type="token" :hash="contract.address" :contract="contract" :fullHash="true" :withTokenName="true" :withName="true" :notCopiable="true" />
                <v-card class="mb-4 mt-2">
                    <v-card-title class="text-subtitle-1 font-weight-bold">Details</v-card-title>
                    <v-card-text class="pa-0">
                        <v-list density="compact" class="details-list">
                            <!-- Owner -->
                            <v-list-item class="d-flex flex-column flex-sm-row">
                                <template v-slot:prepend>
                                    <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                        <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The current owner of this NFT'">mdi-help-circle-outline</v-icon>
                                        Owner:
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    <Hash-Link :type="'address'" :hash="token.owner" :fullHash="true" />
                                </v-list-item-title>
                            </v-list-item>

                            <!-- Contract Address -->
                            <v-list-item class="d-flex flex-column flex-sm-row">
                                <template v-slot:prepend>
                                    <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                        <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The smart contract address for this NFT collection'">mdi-help-circle-outline</v-icon>
                                        Contract Address:
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    <Hash-Link :type="'address'" :hash="hash" :fullHash="true" />
                                </v-list-item-title>
                            </v-list-item>

                            <!-- Creator -->
                            <v-list-item class="d-flex flex-column flex-sm-row">
                                <template v-slot:prepend>
                                    <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                        <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The creator of this NFT collection'">mdi-help-circle-outline</v-icon>
                                        Creator:
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2" v-if="contract.creationTransaction">
                                    <Hash-Link :type="'address'" :hash="contract.creationTransaction.from" :fullHash="true" />
                                </v-list-item-title>
                                <v-list-item-title class="text-body-2" v-else>N/A</v-list-item-title>
                            </v-list-item>

                            <!-- Token ID -->
                            <v-list-item class="d-flex flex-column flex-sm-row">
                                <template v-slot:prepend>
                                    <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                        <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The unique identifier for this NFT within its collection'">mdi-help-circle-outline</v-icon>
                                        Token ID:
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    {{ tokenId }}
                                </v-list-item-title>
                            </v-list-item>

                            <!-- Token Standard -->
                            <v-list-item class="d-flex flex-column flex-sm-row">
                                <template v-slot:prepend>
                                    <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                                        <v-icon size="small" color="grey" class="mr-1" v-tooltip="'The token standard implemented by this NFT'">mdi-help-circle-outline</v-icon>
                                        Token Standard:
                                    </div>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    {{ tokenStandard }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>

                <!-- Description Section -->
                <v-card v-if="token.attributes.description" class="mt-4">
                    <v-card-title class="text-subtitle-1 font-weight-bold">Description</v-card-title>
                    <v-card-text>{{ token.attributes.description }}</v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Properties Section -->
        <v-row>
            <v-col>
                <v-card v-if="hasAnyAttributes">
                    <v-card-title class="text-subtitle-1 font-weight-bold">Attributes</v-card-title>
                    <v-card-text>
                        <!-- Properties -->
                        <template v-if="token.attributes.properties && token.attributes.properties.length > 0">
                            <div class="text-subtitle-2 font-weight-medium mb-2">Properties ({{ token.attributes.properties.length }})</div>
                            <v-row>
                                <v-col v-for="(property, idx) in token.attributes.properties" :key="idx" cols="6" sm="3" md="2">
                                    <v-card class="property-card" variant="outlined">
                                        <v-card-text class="text-center pa-2">
                                            <div class="text-caption text-primary mb-1">{{ property.trait_type }}</div>
                                            <div class="text-body-1 font-weight-bold">{{ property.value }}</div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </template>

                        <!-- Levels -->
                        <template v-if="token.attributes.levels.length">
                            <v-divider class="my-4" v-if="token.attributes.properties && token.attributes.properties.length > 0"></v-divider>
                            <div class="text-subtitle-2 font-weight-medium mb-2">Levels ({{ token.attributes.levels.length }})</div>
                            <v-row>
                                <v-col v-for="(level, idx) in token.attributes.levels" :key="idx" cols="6" sm="3" md="2">
                                    <v-card class="property-card" variant="outlined">
                                        <v-card-text class="text-center pa-2">
                                            <div class="text-caption text-primary mb-1">{{ level.trait_type }}</div>
                                            <div class="text-body-1 font-weight-bold">{{ level.value }}</div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </template>

                        <!-- Boosts -->
                        <template v-if="token.attributes.boosts.length">
                            <v-divider class="my-4" v-if="token.attributes.levels.length || (token.attributes.properties && token.attributes.properties.length > 0)"></v-divider>
                            <div class="text-subtitle-2 font-weight-medium mb-2">Boosts ({{ token.attributes.boosts.length }})</div>
                            <v-row>
                                <v-col v-for="(boost, idx) in token.attributes.boosts" :key="idx" cols="6" sm="3" md="2">
                                    <v-card class="property-card" variant="outlined">
                                        <v-card-text class="text-center pa-2">
                                            <div class="text-caption text-primary mb-1">{{ boost.trait_type }}</div>
                                            <div class="text-body-1 font-weight-bold">
                                                +{{ boost.value }}{{ boost.display_type == 'boost_percentage' ? '%' : '' }}
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </template>

                        <!-- Stats -->
                        <template v-if="token.attributes.stats.length">
                            <v-divider class="my-4" v-if="token.attributes.boosts.length || token.attributes.levels.length || (token.attributes.properties && token.attributes.properties.length > 0)"></v-divider>
                            <div class="text-subtitle-2 font-weight-medium mb-2">Stats ({{ token.attributes.stats.length }})</div>
                            <v-row>
                                <v-col v-for="(stat, idx) in token.attributes.stats" :key="idx" cols="6" sm="3" md="2">
                                    <v-card class="property-card" variant="outlined">
                                        <v-card-text class="text-center pa-2">
                                            <div class="text-caption text-primary mb-1">{{ stat.trait_type }}</div>
                                            <div class="text-body-1 font-weight-bold">{{ stat.value }}</div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </template>

                        <!-- Dates -->
                        <template v-if="token.attributes.dates.length">
                            <v-divider class="my-4" v-if="token.attributes.stats.length || token.attributes.boosts.length || token.attributes.levels.length || (token.attributes.properties && token.attributes.properties.length > 0)"></v-divider>
                            <div class="text-subtitle-2 font-weight-medium mb-2">Dates ({{ token.attributes.dates.length }})</div>
                            <v-row>
                                <v-col v-for="(date, idx) in token.attributes.dates" :key="idx" cols="6" sm="3" md="2">
                                    <v-card class="property-card" variant="outlined">
                                        <v-card-text class="text-center pa-2">
                                            <div class="text-caption text-primary mb-1">{{ date.trait_type }}</div>
                                            <div class="text-body-1 font-weight-bold">
                                                {{ moment(new Date(date.value * 1000)).format('dddd, MMMM Do, YYYY') }}
                                            </div>
                                        </v-card-text>
                                    </v-card>
                                </v-col>
                            </v-row>
                        </template>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Transfers Section -->
        <v-row>
            <v-col>
                <v-card>
                    <v-card-title class="text-subtitle-1 font-weight-bold">Transfers</v-card-title>
                    <v-card-text>
                        <ERC721-Token-Transfers :address="hash" :tokenId="tokenId" :headers="transferHeaders" />
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-expansion-panels class="mt-4" variant="accordion" flat>
            <v-expansion-panel>
                <v-expansion-panel-title class="no-hover"><h3>Raw Metadata</h3></v-expansion-panel-title>
                <v-expansion-panel-text>
                    <v-card-text>
                        <pre style="overflow: hidden;">{{ token.metadata }}</pre>
                    </v-card-text>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, inject, shallowRef } from 'vue';
import moment from 'moment';

import ERC721TokenTransfers from './ERC721TokenTransfers.vue';
import ERC721TokenTransferModal from './ERC721TokenTransferModal.vue';
import HashLink from './HashLink.vue';

const props = defineProps({
    hash: {
        type: String,
        required: true
    },
    tokenId: {
        type: String,
        required: true
    }
});

const $server = inject('$server');

// Refs
const loading = ref(false);
const notAToken = ref(false);
const transfers = ref([]);
const contract = ref({});
const token = ref({
    metadata: {},
    attributes: { properties: [], levels: [], boosts: [], stats: [], dates: [] }
});
const transferHeaders = shallowRef([
    { title: 'Transaction Hash', key: 'transactionHash', sortable: false },
    { title: 'Block', key: 'blockNumber', sortable: true },
    { title: 'Age', key: 'timestamp', sortable: true },
    { title: 'From', key: 'src', sortable: false },
    { title: 'To', key: 'dst', sortable: false },
]);

// Template refs
const erc721TokenTransferModal = ref(null);

const tokenStandard = computed(() => {
    if (!contract.value.patterns) return 'N/A';
    else if (contract.value.patterns.includes('erc721')) return 'ERC-721';
    else if (contract.value.patterns.includes('erc1155')) return 'ERC-1155';
    else return 'Unknown';
});

const hasAnyAttributes = computed(() => {
    return (
        (token.value.attributes.properties && token.value.attributes.properties.length > 0) ||
        token.value.attributes.levels.length > 0 ||
        token.value.attributes.boosts.length > 0 ||
        token.value.attributes.stats.length > 0 ||
        token.value.attributes.dates.length > 0
    );
});

const getErc721Token = () => {
    loading.value = true;
    $server.getErc721TokenById(props.hash, props.tokenId)
        .then(({ data }) => {
            if (!data) return notAToken.value = true;

            token.value = data;
            if (token.value.contract)
                contract.value = token.value.contract;
            else
                getContract();
        })
        .catch(console.log)
        .finally(() => loading.value = false);
};

const getContract = () => {
    $server.getContract(props.hash)
        .then(({ data }) => contract.value = data)
        .catch(console.log);
};

// Watch
watch(() => props.hash, () => {
    getErc721Token();
}, { immediate: true });
</script>

<style scoped>
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
.property-card {
    transition: all 0.3s ease;
}
.property-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.details-list :deep(.v-list-item) {
    min-height: 48px;
    padding-top: 8px;
    padding-bottom: 8px;
}

.details-list :deep(.v-list-item__prepend) {
    align-self: start;
}

.details-list :deep(.v-list-item__content) {
    align-self: start;
}

.details-list :deep(.v-list-item-title) {
    word-break: break-all;
    white-space: inherit !important;
}

.no-hover :deep(.v-expansion-panel-title__overlay) {
    display: none;
}
</style>
