/**
 * @fileoverview Session history table showing past pipeline runs.
 * Paginated server-side data table with status, links, and time ago.
 * @component SessionHistory
 */
<template>
    <v-container fluid class="pa-4">
        <v-card color="#111827" variant="flat" class="history-card">
            <v-data-table-server
                :headers="tableHeaders"
                :items="runs"
                :items-length="total"
                :loading="loading"
                :items-per-page="25"
                :items-per-page-options="[10, 25, 50]"
                class="bg-transparent"
                @update:options="loadRuns"
                @click:row="(e, { item }) => $router.push({ name: 'session', params: { id: item.id } })">

                <template v-slot:item.sentryTitle="{ item }">
                    <span class="text-truncate d-inline-block title-cell">{{ item.sentryTitle || `Run #${item.id}` }}</span>
                </template>

                <template v-slot:item.status="{ item }">
                    <v-chip :color="statusColor(item.status)" size="x-small">{{ item.status }}</v-chip>
                </template>

                <template v-slot:item.links="{ item }">
                    <div class="d-flex ga-1">
                        <v-btn v-if="item.sentryLink" :href="item.sentryLink" target="_blank" icon size="x-small" variant="text" @click.stop>
                            <v-icon size="small">mdi-bug</v-icon>
                        </v-btn>
                        <v-btn v-if="item.githubIssueNumber" :href="`https://github.com/tryethernal/ethernal/issues/${item.githubIssueNumber}`" target="_blank" icon size="x-small" variant="text" @click.stop>
                            <v-icon size="small">mdi-github</v-icon>
                        </v-btn>
                        <v-btn v-if="item.githubPrNumber" :href="`https://github.com/tryethernal/ethernal/pull/${item.githubPrNumber}`" target="_blank" icon size="x-small" variant="text" @click.stop>
                            <v-icon size="small">mdi-source-pull</v-icon>
                        </v-btn>
                    </div>
                </template>

                <template v-slot:item.createdAt="{ item }">
                    {{ timeAgo(item.createdAt) }}
                </template>
            </v-data-table-server>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { getRuns } from '@/lib/api.js';
import { statusColor, timeAgo } from '@/lib/helpers.js';

const loading = ref(false);
const runs = ref([]);
const total = ref(0);

const tableHeaders = [
    { title: 'Title', key: 'sentryTitle', sortable: false },
    { title: 'Status', key: 'status', sortable: false, width: '100px' },
    { title: 'Links', key: 'links', sortable: false, width: '120px' },
    { title: 'Created', key: 'createdAt', sortable: false, width: '120px' }
];

/**
 * Load paginated runs from the API.
 *
 * @param {Object} options - Pagination options from v-data-table-server
 */
async function loadRuns(options = {}) {
    loading.value = true;
    try {
        const page = options.page || 1;
        const itemsPerPage = options.itemsPerPage || 25;
        const res = await getRuns({ page, itemsPerPage });
        runs.value = res.data.items;
        total.value = res.data.total;
    } catch (e) {
        console.error('Failed to load runs', e);
    }
    loading.value = false;
}
</script>

<style scoped>
.history-card {
    border: 1px solid rgba(61, 149, 206, 0.15);
    border-radius: 8px;
}

.title-cell {
    max-width: 400px;
}

:deep(.v-data-table__tr) {
    cursor: pointer;
}

:deep(.v-data-table__tr:hover) {
    background: rgba(61, 149, 206, 0.06) !important;
}
</style>
