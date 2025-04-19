<template>
    <v-hover v-slot="{ isHovering, props }">
        <v-card 
            class="nft-card d-flex flex-column align-center pa-2" 
            :class="{ 'card-hover': isHovering }"
            v-bind="props"
            @click="navigateToToken"
        >
            <!-- Image Section -->
            <v-img v-if="loading"
                height="150"
                rounded="lg"
                cover>
                <template v-slot:default>
                    <div class="d-flex flex-column align-center justify-center fill-height">
                        <span class="text-caption text-medium-emphasis">Loading metadata...</span>
                        <v-progress-circular
                            indeterminate
                            class="mt-2"
                            color="primary"
                            size="32"></v-progress-circular>
                    </div>
                </template>
            </v-img>
            <v-img v-else-if="!imageData"
                height="150"
                rounded="lg"
                class="bg-grey-lighten-4"
                cover>
                <template v-slot:default>
                    <div class="d-flex align-center justify-center fill-height">
                        <v-icon size="150" color="grey-lighten-1">mdi-image-outline</v-icon>
                    </div>
                </template>
            </v-img>
            <v-img v-else-if="!imageData.startsWith('<img')"
                :src="getImageTag(imageData)"
                rounded="lg"
                height="150"
                cover
                :style="`background-color: ${backgroundColor ? '#' + backgroundColor : ''};`">
            </v-img>
            <div v-else class="image-container">
                <span v-html="getImageTag(imageData)"></span>
            </div>

            <!-- Content Section -->
            <v-card-text class="pa-0 pt-2 d-flex flex-column card-content">
                <!-- Default slot for custom content -->
                <slot :token-data="tokenData">
                    <!-- Default content -->
                    <template v-if="mode === 'address'">
                        <div class="text-container">
                            <span class="text-caption text-medium-emphasis mr-1 label">Token:</span>
                            <div class="value-container" @click.stop>
                                <Hash-Link v-if="contract.tokenName" v-tooltip="contract.tokenName" :type="'address'" :hash="contractAddress" :contract="contract" :withName="true" :notCopiable="true" />
                                <span v-else-if="loading" class="text-medium-emphasis">-</span>
                                <span v-else class="text-medium-emphasis">N/A</span>
                            </div>
                        </div>
                        <div class="text-container">
                            <span class="text-caption text-medium-emphasis mr-1 label">Symbol:</span>
                            <div class="value-container">
                                <span v-if="contract.tokenSymbol" class="text-medium-emphasis">
                                    {{ contract.tokenSymbol }}
                                </span>
                                <span v-else-if="loading" class="text-medium-emphasis">-</span>
                                <span v-else class="text-medium-emphasis">N/A</span>
                            </div>
                        </div>
                        <div class="text-container">
                            <span class="text-caption text-medium-emphasis mr-1 label">ID:</span>
                            <div class="value-container">
                                <span v-if="tokenId" class="text-medium-emphasis">{{ tokenId }}</span>
                                <span v-else-if="loading" class="text-medium-emphasis">-</span>
                                <span v-else class="text-medium-emphasis">N/A</span>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <div class="text-container">
                            <span class="text-caption text-medium-emphasis mr-1 label">ID:</span>
                            <div class="value-container">
                                <span v-if="tokenId" class="text-medium-emphasis">{{ tokenId }}</span>
                                <span v-else-if="loading" class="text-medium-emphasis">-</span>
                                <span v-else class="text-medium-emphasis">N/A</span>
                            </div>
                        </div>
                        <div class="text-container">
                            <span class="text-caption text-medium-emphasis mr-1 label">Owner:</span>
                            <div class="value-container" @click.stop>
                                <Hash-Link 
                                    v-if="owner" 
                                    :type="'address'" 
                                    :hash="owner" 
                                    :withName="true" 
                                    :notCopiable="true"
                                    :xsHash="true"
                                />
                                <span v-else-if="loading" class="text-medium-emphasis">-</span>
                                <span v-else class="text-medium-emphasis">N/A</span>
                            </div>
                        </div>
                    </template>
                </slot>
            </v-card-text>
        </v-card>
    </v-hover>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import HashLink from './HashLink.vue';

const props = defineProps({
    contractAddress: String,
    tokenIndex: Number,
    contract: Object,
    mode: {
        type: String,
        default: 'address',
        validator: (value) => ['address', 'collection'].includes(value)
    }
});

const router = useRouter();
const $server = inject('$server');

// Reactive state
const owner = ref(null);
const name = ref(null);
const imageData = ref(null);
const tokenId = ref(null);
const backgroundColor = ref(null);
const loading = ref(false);

// Methods
const navigateToToken = () => {
    if (tokenId.value) {
        router.push(`/token/${props.contractAddress}/${tokenId.value}`);
    }
};

const getImageTag = (image) => {
    if (!image) return null;
    if (image.startsWith('ipfs://')) {
        return `https://gateway.pinata.cloud/ipfs/${image.slice(7, image.length)}`;
    }
    if (image.startsWith('<img')) {
        return '<img class="rounded-lg"' + image.slice(4, image.length);
    }
    return `<img rounded="lg" src="${image}" />`;
};

// Computed value for slot data
const tokenData = {
    owner,
    tokenId,
    name,
    loading,
    contract: props.contract,
    contractAddress: props.contractAddress
};

onMounted(() => {
    loading.value = true;
    $server.getErc721TokenByIndex(props.contractAddress, props.tokenIndex)
        .then(({ data }) => {
            if (!data)
                return;

            tokenId.value = data.tokenId;
            owner.value = data.owner;

            if (data.attributes) {
                name.value = data.attributes.name;
                imageData.value = data.attributes.image_data;
                backgroundColor.value = data.attributes.background_color;
            } else if (data.metadata) {
                name.value = data.metadata.name;
                imageData.value = data.metadata.image;
                backgroundColor.value = data.metadata.background_color;
            }
        })
        .catch((error) => console.error('Failed to fetch token data:', error))
        .finally(() => loading.value = false);
});
</script>

<style scoped>
.nft-card {
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.card-hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(var(--v-theme-primary), 0.1),
                0 12px 24px rgba(var(--v-theme-primary), 0.05) !important;
}

.image-container {
    width: 150px;
    height: 150px;
    overflow: hidden;
    position: relative;
    border-radius: 8px;
}

.image-container :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    top: 0;
    left: 0;
}

.card-content {
    width: 100%;
    max-width: 150px;
}

.text-container {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px;
    align-items: baseline;
}

.label {
    flex-shrink: 0;
    white-space: nowrap;
}

.value-container {
    min-width: 0;
    overflow: hidden;
}

.value-container :deep(*) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
    display: block;
}

.text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
}
</style>
