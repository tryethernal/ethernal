<template>
    <v-card>
        <v-card-title>
            <div class="d-flex justify-space-between">
                <small class="text-primary">Top 50 Gas Spenders</small>
                <v-chip-group mandatory class="pt-0 mb-1" v-model="intervalInHours" selected-class="text-primary">
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
                :loading="loading"
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
                    <span v-tooltip="`Gas Units Used: ${ethers.utils.commify(item.gasUsed)}`">
                        {{
                            item.percentUsed ?
                            item.percentUsed > 0.0001 ? (item.percentUsed * 100).toFixed(2) : '<0.01' :
                            0
                        }}%
                    </span>
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
const loading = ref(true);
const headers = [
    { title: 'Address', key: 'from' },
    { title: 'Fees', key: 'fees' },
    { title: '% Used', key: 'percentUsed' }
];

const getLatestGasSpenders = () => {
    loading.value = true;
    server.getLatestGasSpenders(intervalInHours.value)
        .then(response => gasSpenders.value = response.data)
        .finally(() => loading.value = false);
}

watch(intervalInHours, () => getLatestGasSpenders());
onMounted(() => getLatestGasSpenders());
</script>
