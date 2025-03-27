<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Verified Contracts</h2>
        <v-divider class="my-4"></v-divider>
        <v-row>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Contracts Deployed (total)'" :value="contractStats.total_contracts" :loading="loadingContractStats" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Contracts Deployed (24h)'" :value="contractStats.contracts_last_24_hours" :loading="loadingContractStats" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :title="'Contracts Verified (Total)'" :value="contractStats.verified_contracts" :loading="loadingContractStats" />
            </v-col>
            <v-col cols="12" sm="6" lg="3">
                <Stat-Number :raw="true" :title="'Contracts Verified (24h)'" :value="contractStats.verified_contracts_last_24_hours" :loading="loadingContractStats" />
            </v-col>
        </v-row>
        <v-card class="mt-4">
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :headers="headers"
                    :items="contracts"
                    :loading="loading"
                    :items-length="totalItems"
                    :disable-pagination="true"
                    items-per-page-text="Rows per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    @update:options="loadItems">
                    <template v-slot:footer.page-text>
                    </template>
                    <template v-slot:item.version="{ item }">
                        {{ extractVersion(item.verification.compilerVersion) }}
                    </template>
                    <template v-slot:item.address="{ item }">
                        <Hash-Link type="address" :hash="item.address" />
                    </template>
                    <template v-slot:item.settings="{ item }">
                        <v-icon size="small" v-tooltip="'Optimization Enabled'" v-if="item.verification.runs > 0" icon="mdi-lightning-bolt" class="mr-2" />
                        <v-tooltip v-if="item.verification.constructorArguments">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" size="small" v-if="item.verification.constructorArguments" icon="mdi-wrench" />
                            </template>
                            <span style="white-space: pre">{{ getConstructorTooltip(item) }}</span>
                        </v-tooltip>
                    </template>
                    <template v-slot:item.verifiedAt="{ item }">
                        {{ $dt.shortDate(item.verification.createdAt) }}<br>
                        <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.verification.createdAt) }}</small>
                    </template>
                    <template v-slot:item.patterns="{ item }">
                        <v-chip
                            v-for="pattern in item.patterns"
                            color="success"
                            :key="pattern"
                            class="mr-2"
                            size="small">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { ethers } from 'ethers'
import { formatContractPattern } from '@/lib/utils'
import HashLink from './HashLink.vue'
import StatNumber from './StatNumber.vue'
const $server = inject('$server')
const $dt = inject('$dt')

const loading = ref(false)
const loadingContractStats = ref(false)
const contractStats = ref({})
const contracts = ref([])
const totalItems = ref(0)
const headers = [
    { title: 'Address', key: 'address', sortable: false },
    { title: 'Name', key: 'name', sortable: false },
    { title: 'Compiler Version', key: 'version', sortable: false },
    { title: 'Txns', key: 'transactionCount', sortable: false },
    { title: 'Settings', key: 'settings', sortable: false },
    { title: 'Verified', key: 'verifiedAt', sortable: false },
    { title: 'Tags', key: 'patterns', sortable: false }
]

const loadItems = ({ page, itemsPerPage }) => {
    loading.value = true
    $server.getWorkspaceVerifiedContracts({ page, itemsPerPage })
        .then(({ data: { items }}) => {
            contracts.value = items
            totalItems.value = items.length == itemsPerPage ?
                (page * itemsPerPage) + 1 :
                page * itemsPerPage;
        })
        .finally(() => loading.value = false)
}

const extractVersion = (version) => {
    return version.split('+')[0].slice(1)
}

const getConstructorTooltip = (item) => {
    const iface = new ethers.utils.Interface(item.abi);
    const constructorInputs = JSON.parse(iface.deploy.format(ethers.utils.FormatTypes.json)).inputs;

    /*
        This won't handle well tuples in tuples, but hopefully it'll be good enough for now.
        I'd say that I'll improve later, but we all know it's probably never going to happen
    */
    const decodedInputs = ethers.utils.defaultAbiCoder.decode(iface.deploy.inputs.map(i => {
        if (i.type == 'tuple')
            return `tuple(${i.components.map(c => c.type).join(',')})`;
        else
            return i.type;
    }), `0x${item.verification.constructorArguments}`);
    
    const decoded = [];
    for (let i = 0; i < decodedInputs.length; i++) {
        decoded.push({
            ...constructorInputs[i],
            value: decodedInputs[i]
        });
    }
    return decoded.map(i => `${i.type} ${i.name}: ${i.value}`).join('\n')
}

onMounted(() => {
    loadingContractStats.value = true
    $server.getWorkspaceContractStats()
        .then(({ data: { stats }}) => contractStats.value = stats)
        .catch(error => console.error(error))
        .finally(() => loadingContractStats.value = false)
})
</script> 