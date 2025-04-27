<template>
    <v-container v-if="loadingContract" fluid>
        <v-skeleton-loader
            type="text"
            max-width="600"
            class="mb-4"
        />
        <v-divider class="my-4"></v-divider>
        
        <!-- Skeleton for token info cards -->
        <v-row class="mb-6">
            <v-col cols="12" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" lg="4">
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

        <!-- Skeleton loader for TokenHeader when loading -->
        <v-row v-if="loadingContract || loadingStats" class="mb-1 align-stretch">
            <v-col cols="12" sm="6" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" sm="6" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
        </v-row>

        <!-- TokenHeader when data is loaded -->
        <TokenHeader 
            v-else
            :loading-contract="loadingContract"
            :contract="contract"
            :stats="contractStats"
        />

        <!-- Navigation Chips -->
        <BaseChipGroup v-model="tab" mandatory>
            <v-chip label size="small" value="transfers">
                Transfers
                <template v-if="!loadingStats">({{ contractStats.tokenTransferCount || 0 }})</template>
            </v-chip>
            <v-chip label size="small" value="holders">
                Holders
                <template v-if="!loadingStats">({{ contractStats.tokenHolderCount || 0 }})</template>
            </v-chip>
            <v-chip label size="small" value="code">
                <v-icon v-if="contract.verification" class="mr-1" color="success" size="small">mdi-check-circle</v-icon>
                Contract
            </v-chip>
            <v-chip label size="small" value="analytics">Analytics</v-chip>
        </BaseChipGroup>

        <!-- Tab Content -->
        <div v-if="tab === 'transfers'">
            <v-card>
                <v-card-text>
                    <Address-ERC20-Token-Transfer :address="address" :count="contractStats.tokenTransferCount" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="tab === 'holders'">
            <v-card>
                <v-card-text>
                    <ERC-20-Token-Holders :address="address"
                        :tokenDecimals="contract.tokenDecimals" 
                        :tokenSymbol="contract.tokenSymbol" />
                </v-card-text>
            </v-card>
        </div>

        <div v-if="tab === 'code'">
            <Contract-Details v-if="contract" :contract="contract" :key="address" />
        </div>

        <div v-if="tab === 'analytics'">
            <ERC-20-Contract-Analytics :address="address" 
                :tokenDecimals="contract.tokenDecimals" 
                :tokenSymbol="contract.tokenSymbol" 
                :tokenType="tokenType" 
                :key="contract.id" />
        </div>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formatNumber, formatContractPattern } from '@/lib/utils';

import BaseChipGroup from './base/BaseChipGroup.vue';
import TokenHeader from './TokenHeader.vue';
import ERC20TokenHolders from './ERC20TokenHolders.vue';
import ERC20ContractAnalytics from './ERC20ContractAnalytics.vue';
import AddressERC20TokenTransfer from './AddressERC20TokenTransfer.vue';
import ContractDetails from './ContractDetails.vue';

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

// Router
const route = useRoute();
const router = useRouter();

// Inject server instance
const $server = inject('$server');

// Reactive state
const loadingStats = ref(true);
const contractStats = ref({});
const notAContract = computed(() => !props.contract || Object.keys(props.contract).length === 0);

// Computed properties
const tokenType = computed(() => {
    if (props.contract && props.contract.patterns) {
        return props.contract.patterns[0];
    }
    return 'erc20';
});

const tab = computed({
    get: () => route.query.tab || 'transfers',
    set: (newTab) => {
        router.replace({ query: { ...route.query, tab: newTab } }).catch(() => {});
    }
});

// Watchers
watch(() => props.address, (address) => {
    $server.getContractStats(address)
        .then(({ data }) => contractStats.value = data)
        .finally(() => loadingStats.value = false);
}, { immediate: true });

// Expose necessary methods and properties to template
defineExpose({
    formatNumber,
    formatContractPattern
});
</script>
