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
            <span class="text-body-2 text-medium-emphasis">
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
                        :address="address"
                        mode="collection"
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
    },
    contract: {
        type: Object,
        required: true
    },
    loadingContract: {
        type: Boolean,
        required: true
    }
});

// Inject server instance
const $server = inject('$server');

// Reactive state
const loadingStats = ref(true);
const contractStats = ref({});
const notAContract = computed(() => !props.contract || Object.keys(props.contract).length === 0);
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

// Watchers
watch(() => props.address, (address) => {
    loadingStats.value = true;

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
