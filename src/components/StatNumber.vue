<template>
    <v-card outlined>
        <v-card-subtitle>
            <div :class="{ absolute: infoTooltip }">{{ title }}</div>
            <div class="text-right" v-if="infoTooltip">
                <v-tooltip left>
                    <template v-slot:activator="{ on, attrs }">
                        <v-icon v-bind="attrs" v-on="on" small>mdi-information</v-icon>
                    </template>
                    {{ infoTooltip }}
                </v-tooltip>
            </div>
        </v-card-subtitle>
        <v-card-text class="text-h3" align="center">
            <v-skeleton-loader v-if="loading" type="list-item"></v-skeleton-loader>
            <template v-else-if="isValueDefined">
                <router-link v-if="type == 'link'" style="text-decoration: none;" :to="href">{{ commify(value) }}</router-link>
                <span v-else>
                    {{ formatNumber(value, { short: true, decimals: decimals }) }}
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
const { formatNumber } = require('../lib/utils');

export default {
    name: 'StatNumber',
    props: ['type', 'title', 'value', 'loading', 'href', 'infoTooltip', 'decimals'],
    methods: {
        commify: ethers.utils.commify,
        formatNumber: formatNumber
    },
    computed: {
        isValueDefined() {
            return this.value !== undefined && this.value !== null;
        }
    }
}
</script>

<style scoped>
.absolute {
    position: absolute;
}
</style>
