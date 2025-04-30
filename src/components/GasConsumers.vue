<template>
    <v-card>
        <v-card-title>
            <div class="d-flex justify-space-between">
                <small class="text-primary">Top 50 Gas Consumers</small>
                <v-chip-group mandatory class="pt-0 mb-1" v-model="intervalInHours" :selected-class="`text-${contrastingColor}`">
                    <v-chip size="small" value="24">24 Hours</v-chip>
                    <v-chip size="small" value="72">3 Days</v-chip>
                    <v-chip size="small" value="168">7 Days</v-chip>
                </v-chip-group>
            </div>
        </v-card-title>
        <v-card-text>
            <v-data-table :items="gasConsumers" :headers="headers" :loading="loading"
                :must-sort="true"
                :sort-by="[{ key: 'percentUsed', order: 'desc' }]"
                :items-per-page-options="[
                    { value: 10, title: '10' },
                    { value: 25, title: '25' },
                    { value: 50, title: '50' }
                ]">
                <template v-slot:item.to="{ item }">
                    <HashLink v-if="item.to" type="address" :hash="item.to" :loadContract="true" :withName="true" />
                    <i v-else>Contract Creation</i>
                </template>
                <template v-slot:item.fees="{ item }">
                    {{ fromWei(item.gasCost, 'ether', currentWorkspaceStore.chain.token, false, 3) }}
                </template>
                <template v-slot:item.percentUsed="{ item }">
                    <span v-tooltip="`Gas Units Used: ${ethers.utils.commify(item.gasUsed)}`">
                        {{
                            item.percentUsed ?
                            (item.percentUsed > 0.0001 ? (item.percentUsed * 100).toFixed(2) : '<0.01') :
                            0
                        }}%
                    </span>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script setup>
import { inject, ref, onMounted, watch, computed } from 'vue';
import { ethers } from 'ethers';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '../lib/utils';

import HashLink from './HashLink.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

const currentWorkspaceStore = useCurrentWorkspaceStore();
const server = inject('$server');
const fromWei = inject('$fromWei');
const intervalInHours = ref("24");
const gasConsumers = ref([]);
const loading = ref(true);

const headers = [
    { title: 'Address', key: 'to' },
    {
        title: 'Fees', key: 'fees',
        sortRaw: (a, b) => {
            return Number(a.gasCost) - Number(b.gasCost);
        }
    },
    { title: '% Used', key: 'percentUsed' }
];

const getLatestGasConsumers = () => {
    loading.value = true;
    server.getLatestGasConsumers(intervalInHours.value)
        .then(response => gasConsumers.value = response.data)
        .finally(() => loading.value = false);
}

const contrastingColor = computed(() => {
    const theme = useTheme();
    return getBestContrastingColor(theme.current.value.colors['surface-variant'], theme.current.value.colors);
});

watch(intervalInHours, () => getLatestGasConsumers());
onMounted(() => getLatestGasConsumers());
</script>
