<template>
    <v-card>
        <v-card-title>
            <div class="d-flex justify-space-between">
                <small class="text-primary">Top 50 Gas Spenders</small>
                <v-chip-group class="pt-0 mb-1" v-model="intervalInHours" selected-class="text-primary">
                    <v-chip size="small" value="24">24 Hours</v-chip>
                    <v-chip size="small" value="72">3 Days</v-chip>
                    <v-chip size="small" value="168">7 Days</v-chip>
                </v-chip-group>
            </div>
        </v-card-title>
        <v-card-text>
            <v-data-table
                :items="gasSpenders"
                :headers="headers"
                :items-per-page-options="[
                    { value: 10, title: '10' },
                    { value: 25, title: '25' },
                    { value: 100, title: '100' }
                ]">
                <template v-slot:item.from="{ item }">
                    <HashLink type="address" :hash="item.from" :loadContract="true" :withName="true" :fullHash="true" />
                </template>
                <template v-slot:item.fees="{ item }">
                    {{ fromWei(item.gasCost, 'ether', currentWorkspaceStore.chain.token, false, 3) }}
                </template>
                <template v-slot:item.percentUsed="{ item }">
                    <v-tooltip>
                        <template #activator="{ props }">
                            <span v-bind="props">{{ item.percentUsed ? (item.percentUsed * 100).toFixed(2) : 0 }}%</span>
                        </template>
                        <span>Gas Units Used: {{ ethers.utils.commify(item.gasUsed) }}</span>
                    </v-tooltip>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script setup>
import { inject, ref, onMounted, watch } from 'vue';
import { ethers } from 'ethers';

import HashLink from './HashLink.vue';

import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

const currentWorkspaceStore = useCurrentWorkspaceStore();
const server = inject('$server');
const fromWei = inject('$fromWei');
const intervalInHours = ref("24");
const gasSpenders = ref([]);

const headers = [
    { title: 'Address', key: 'from' },
    { title: 'Fees', key: 'fees' },
    { title: '% Used', key: 'percentUsed' }
];

watch(intervalInHours, async () => {
    server.getLatestGasSpenders(intervalInHours.value)
        .then(response => gasSpenders.value = response.data);
});

onMounted(async () => {
    server.getLatestGasSpenders(intervalInHours.value)
        .then(response => gasSpenders.value = response.data);
});
</script>
