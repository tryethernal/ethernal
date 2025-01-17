<template>
    <v-card :loading="loading">
        <template v-slot:subtitle>
            <div :class="{ absolute: infoTooltip }">{{ title }}</div>
            <div class="text-right" v-if="infoTooltip">
                <v-tooltip location="left">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" size="small">mdi-information</v-icon>
                    </template>
                    {{ infoTooltip }}
                </v-tooltip>
            </div>
        </template>
        <v-card-text class="text-h3 text-medium-emphasis" align="center">
            <template v-if="isValueDefined">
                <router-link v-if="type == 'link'" style="text-decoration: none;" :to="href">{{ commify(value) }}</router-link>
                <span v-else>
                    {{ formatNumber(value, { short: !long, decimals: realDecimals }) }}
                </span>
            </template>
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
    props: ['type', 'title', 'value', 'loading', 'href', 'infoTooltip', 'decimals', 'long', 'tokenType'],
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
