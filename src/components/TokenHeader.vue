<template>
    <v-row class="mb-1 align-stretch">
        <v-col cols="12" sm="6" lg="4">
            <v-card class="h-100">
                <v-card-text class="d-flex flex-column ga-3">
                    <h3 class="font-weight-medium">Overview</h3>

                    <span>
                        <h4 class="text-uppercase text-caption text-medium-emphasis">Max Total Supply</h4>
                        <span v-if="contract.tokenTotalSupply">
                            {{ formatNumber(contract.tokenTotalSupply, { decimals: contract.tokenDecimals }) }} {{ contract.tokenSymbol }}
                        </span>
                        <span v-else>N/A</span>
                    </span>

                    <span>
                        <h4 class="text-uppercase text-caption text-medium-emphasis">Holders</h4>
                        {{ stats.tokenHolderCount || 0 }}
                    </span>

                    <span>
                        <h4 class="text-uppercase text-caption text-medium-emphasis">Total Transfers</h4>
                        {{ stats.tokenTransferCount || 0 }}
                    </span>
                </v-card-text>
            </v-card>
        </v-col>

        <v-col cols="12" sm="6" lg="4">
            <v-card class="h-100">
                <v-card-text class="d-flex flex-column ga-3">
                    <h3 class="font-weight-medium">Other Info</h3>

                    <div>
                        <h4 class="text-uppercase text-caption text-medium-emphasis">
                            Token Contract<span v-if="contract.tokenDecimals">
                                (with <span class="text-high-emphasis">{{ contract.tokenDecimals }}</span> decimals)
                            </span>
                        </h4>
                        <div class="d-flex align-center">
                            <Hash-Link :type="'address'" :hash="contract.address" />
                        </div>
                        <div class="text-caption text-medium-emphasis mt-1" v-if="contract.creationTransaction">
                            Created in tx <Hash-Link :type="'transaction'" :hash="contract.creationTransaction.hash" />
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { formatNumber, formatContractPattern } from '@/lib/utils';
import HashLink from './HashLink.vue';

defineProps({
    contract: {
        type: Object,
        required: true
    },
    stats: {
        type: Object,
        required: true
    }
});
</script>

<style scoped>
.ga-3 {
    gap: 12px;
}
</style> 