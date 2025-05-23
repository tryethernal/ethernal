<template>
    <v-card :loading="loading" :border="border ? 'primary thin' : false">
        <v-card-text v-if="loading">
            <v-skeleton-loader type="list-item"></v-skeleton-loader>
        </v-card-text>
        <v-card-text class="pa-3" v-else>
            <h6 class="text-medium-emphasis text-uppercase text-caption">
                {{ title }}
                <div class="text-right float-right" v-if="infoTooltip">
                    <v-icon v-tooltip="infoTooltip" size="small">mdi-information</v-icon>
                </div>
            </h6>
            <div class="text-h6 text-high-emphasis " v-if="isValueDefined">
                <router-link v-if="type === 'link'" style="text-decoration: none;" :to="href">{{ commify(value) }}</router-link>
                <span v-if="raw">
                    {{ value }}
                </span>
                <span v-else>
                    {{ formatNumber(value, { short: !long, decimals: realDecimals }) }}
                </span>
            </div>
            <template v-else>
                N/A
            </template>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { ethers } from 'ethers';
import { formatNumber } from '@/lib/utils';

const props = defineProps({
    type: String,
    title: String,
    value: [String, Number],
    loading: Boolean,
    href: String,
    infoTooltip: String,
    decimals: Number,
    long: Boolean,
    tokenType: String,
    raw: Boolean,
    border: {
        type: Boolean,
        default: true
    }
});

const commify = ethers.utils.commify;

const isValueDefined = computed(() => {
    return props.value !== undefined && props.value !== null;
});

const realDecimals = computed(() => {
    return props.tokenType === 'erc20' ? props.decimals : 0;
});
</script>

<style scoped>
.absolute {
    position: absolute;
}
</style>
