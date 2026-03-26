<template>
    <v-container>
        <h1 class="text-h5 mb-4">Pipeline</h1>
        <StatsBar :stats="store.stats" />

        <v-row dense class="mb-4">
            <v-col cols="12" sm="3">
                <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Status"
                    clearable
                    density="compact"
                    @update:model-value="loadData"
                />
            </v-col>
            <v-col cols="12" sm="3">
                <v-select
                    v-model="filters.chainType"
                    :items="chainTypeOptions"
                    label="Chain Type"
                    clearable
                    density="compact"
                    @update:model-value="loadData"
                />
            </v-col>
            <v-col cols="12" sm="3">
                <v-select
                    v-model="filters.signalSource"
                    :items="sourceOptions"
                    label="Source"
                    clearable
                    density="compact"
                    @update:model-value="loadData"
                />
            </v-col>
            <v-col cols="12" sm="3">
                <v-select
                    v-model="filters.leadType"
                    :items="leadTypeOptions"
                    label="Lead Type"
                    clearable
                    density="compact"
                    @update:model-value="loadData"
                />
            </v-col>
        </v-row>

        <v-data-table
            :headers="headers"
            :items="store.prospects"
            :loading="store.loading"
            :items-per-page="50"
            density="compact"
            @click:row="(_, { item }) => $router.push(`/prospecting/${item.id}`)"
            class="cursor-pointer"
        >
            <template #item.confidenceScore="{ item }">
                <v-chip size="x-small">{{ item.confidenceScore }}</v-chip>
            </template>
            <template #item.status="{ item }">
                <v-chip size="x-small" :color="statusColor(item.status)">{{ item.status }}</v-chip>
            </template>
        </v-data-table>
    </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProspectsStore } from '@/stores/prospects';
import StatsBar from '@/components/StatsBar.vue';

const store = useProspectsStore();
const $router = useRouter();

const filters = reactive({ status: null, chainType: null, signalSource: null, leadType: null });

const statusOptions = ['detected', 'draft_ready', 'approved', 'sent', 'replied', 'no_reply', 'rejected', 'snoozed', 'discovery_only'];
const chainTypeOptions = ['op_stack', 'orbit', 'zk_evm', 'other_evm'];
const sourceOptions = ['l2beat', 'funding', 'github', 'raas'];
const leadTypeOptions = ['cold_lead', 'warm_lead'];

const headers = [
    { title: 'Company', key: 'companyName' },
    { title: 'Chain', key: 'chainName' },
    { title: 'Type', key: 'chainType' },
    { title: 'Status', key: 'status' },
    { title: 'Source', key: 'signalSource' },
    { title: 'Lead', key: 'leadType' },
    { title: 'Score', key: 'confidenceScore' },
    { title: 'Contact', key: 'contactEmail' }
];

function statusColor(status) {
    const colors = {
        detected: 'grey', draft_ready: 'blue', approved: 'green', sent: 'teal',
        replied: 'success', no_reply: 'grey', rejected: 'error', snoozed: 'orange',
        discovery_only: 'purple'
    };
    return colors[status] || 'grey';
}

async function loadData() {
    const params = {};
    for (const [k, v] of Object.entries(filters)) {
        if (v) params[k] = v;
    }
    await store.fetchProspects(params);
}

onMounted(async () => {
    await Promise.all([loadData(), store.fetchStats()]);
});
</script>
