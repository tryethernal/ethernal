<template>
    <v-card :loading="loading">
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
                <router-link v-if="type == 'link'" style="text-decoration: none;" :to="href">{{ commify(value) }}</router-link>
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

<script>
const ethers = require('ethers');
import { formatNumber } from '@/lib/utils';

export default {
    name: 'StatNumber',
    props: ['type', 'title', 'value', 'loading', 'href', 'infoTooltip', 'decimals', 'long', 'tokenType', 'raw'],
    methods: {
        commify: ethers.utils.commify,
        formatNumber: formatNumber
    },
    computed: {
        isValueDefined() {
            return this.value !== undefined && this.value !== null;
        },
        realDecimals() {
            return this.tokenType == 'erc20' ? this.decimals : 0;
        }
    }
}
</script>

<style scoped>
.absolute {
    position: absolute;
}
</style>
