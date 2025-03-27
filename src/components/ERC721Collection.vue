<template>
    <v-container v-if="loadingContract" fluid>
        <v-skeleton-loader
            type="text"
            max-width="600"
            class="mb-4"
        />
        <v-divider class="my-4"></v-divider>
        
        <!-- Skeleton for TokenHeader -->
        <v-row class="mb-6">
            <v-col cols="12" sm="6" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" sm="6" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
        </v-row>

        <!-- Skeleton for tab chips -->
        <v-skeleton-loader
            type="chip"
            class="mb-4"
        />

        <!-- Skeleton for main content area -->
        <v-card>
            <v-card-text>
                <v-skeleton-loader
                    type="table-heading, divider, table-row-divider, table-row, table-row, table-row"
                />
            </v-card-text>
        </v-card>
    </v-container>
    <v-container v-else-if="notAContract" fluid>
        <v-row justify="center" align="center" style="min-height: 400px">
            <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
                <v-icon size="100" color="primary" class="mb-4" style="opacity: 0.25">mdi-file</v-icon>
                <div class="text-h6 mb-2">No Contract Found</div>
                <div class="text-body-1 text-medium-emphasis">There doesn't seem to be a contract at this address.</div>
            </v-col>
        </v-row>
    </v-container>
    <v-container v-else fluid>
        <h2 class="text-h6 font-weight-medium">
            Token
            <span class="text-body-1 text-medium-emphasis">
                {{ contract.tokenName || contract.address }}{{ contract.tokenSymbol ? ` (${contract.tokenSymbol})` : '' }}
            </span>
        </h2>
        <v-divider class="my-4"></v-divider>

        <!-- TokenHeader -->
        <TokenHeader 
            :loading-contract="loadingContract"
            :contract="contract"
            :stats="contractStats"
        />

        <!-- Navigation Chips -->
        <BaseChipGroup v-model="activeTab" mandatory>
            <v-chip label size="small" value="transfers">
                Transfers
                <template v-if="!loadingStats">({{ contractStats.tokenTransferCount || 0 }})</template>
            </v-chip>
            <v-chip label size="small" value="holders">
                Holders
                <template v-if="!loadingStats">({{ contractStats.tokenHolderCount || 0 }})</template>
            </v-chip>
            <v-chip label size="small" value="inventory">Inventory</v-chip>
            <v-chip label size="small" value="contract">
                <v-icon v-if="contract.verification" class="mr-1" color="success" size="small">mdi-check-circle</v-icon>
                Contract
            </v-chip>
        </BaseChipGroup>

        <!-- Tab Content -->
        <div v-if="activeTab === 'transfers'">
            <v-card>
                <v-card-text>
                    <ERC721TokenTransfers :key="`transfers-${address}`" :address="address" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'holders'">
            <v-card>
                <v-card-text>
                    <ERC20TokenHolders :key="`holders-${address}`" :address="address" 
                        :tokenDecimals="contract.tokenDecimals" 
                        :tokenSymbol="contract.tokenSymbol" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'inventory'">
            <v-card>
                <v-card-text>
                    <NFTGallery 
                        :key="`inventory-${address}`"
                        :loading="loadingTokens"
                        :nfts="tokens"
                        :contract-address="address"
                        :mode="'collection'"
                        empty-message="There are no tokens in this collection, or the contract is missing the totalSupply() method."
                    />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="activeTab === 'contract'">
            <ContractDetails v-if="contract" :contract="contract" :key="`contract-${address}`" />
        </div>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, onBeforeUnmount } from 'vue';
import { formatNumber, formatContractPattern } from '@/lib/utils';
import BaseChipGroup from './base/BaseChipGroup.vue';
import TokenHeader from './TokenHeader.vue';
import ERC20TokenHolders from './ERC20TokenHolders.vue';
import ERC721TokenTransfers from './ERC721TokenTransfers.vue';
import ContractDetails from './ContractDetails.vue';
import NFTGallery from './NFTGallery.vue';

// Props
const props = defineProps({
    address: {
        type: String,
        required: true
    }
});

// Inject server instance
const $server = inject('$server');

// Reactive state
const loadingContract = ref(true);
const loadingStats = ref(true);
const loadingTokens = ref(true);
const contract = ref({});
const contractStats = ref({});
const notAContract = ref(false);
const tokens = ref([]);
const activeTab = ref('transfers');

// Methods
const updateTabFromHash = () => {
    const hash = window.location.hash.substring(1);
    const validTabs = ['transfers', 'holders', 'inventory', 'contract'];
    
    if (validTabs.includes(hash)) {
        activeTab.value = hash;
    } else if (!hash) {
        window.location.hash = 'transfers';
    }
};

const loadTokens = async () => {
    loadingTokens.value = true;
    try {
        const { data: { totalSupply } } = await $server.getErc721TotalSupply(props.address);
        if (totalSupply) {
            tokens.value = Array.from({ length: totalSupply }, (_, i) => ({
                tokenId: i,
                token: props.address,
                tokenContract: contract.value
            }));
        }
    } catch (error) {
        console.error(error);
    } finally {
        loadingTokens.value = false;
    }
};

// Watchers
watch(() => props.address, (address) => {
    loadingContract.value = true;
    loadingStats.value = true;

    $server.getContract(address)
        .then(({ data }) => {
            if (data) {
                contract.value = data;
                loadTokens();
            } else {
                notAContract.value = true;
            }
        })
        .finally(() => loadingContract.value = false);

    $server.getContractStats(address)
        .then(({ data }) => contractStats.value = data)
        .finally(() => loadingStats.value = false);
}, { immediate: true });

// Watch for tab changes to update the URL hash
watch(() => activeTab.value, (newTab) => {
    if (window.location.hash.substring(1) !== newTab) {
        window.location.hash = newTab;
    }
});

// Lifecycle hooks
onMounted(() => {
    updateTabFromHash();
    window.addEventListener('hashchange', updateTabFromHash);
});

onBeforeUnmount(() => {
    window.removeEventListener('hashchange', updateTabFromHash);
});

// Expose necessary methods and properties to template
defineExpose({
    formatNumber,
    formatContractPattern
});
</script>
