/**
 * @fileoverview Sentry auto-fix pipeline dashboard.
 * Shows stats, kanban pipeline view, and recent runs table.
 * Real-time updates via Pusher.
 * @component SentryDashboard
 */
<template>
    <v-container fluid>
        <h2 class="text-h5 font-weight-medium mb-4">
            <v-icon class="mr-2">mdi-shield-bug-outline</v-icon>
            Sentry Pipeline
        </h2>

        <!-- Stats Cards -->
        <v-row class="mb-4">
            <v-col cols="6" md="3" v-for="stat in statsCards" :key="stat.label">
                <v-card color="#111827" variant="flat" class="stat-card">
                    <v-card-text class="text-center py-4">
                        <div class="text-h4 font-weight-bold" :class="stat.color">{{ stat.value }}</div>
                        <div class="text-caption text-medium-emphasis mt-1">{{ stat.label }}</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Period selector -->
        <div class="d-flex align-center mb-4">
            <v-btn-toggle v-model="period" mandatory density="compact" color="blue-lighten-1">
                <v-btn value="24h" size="small">24h</v-btn>
                <v-btn value="7d" size="small">7d</v-btn>
                <v-btn value="30d" size="small">30d</v-btn>
            </v-btn-toggle>
            <v-spacer />
            <v-btn variant="text" size="small" @click="refresh" :loading="loading">
                <v-icon class="mr-1">mdi-refresh</v-icon>Refresh
            </v-btn>
        </div>

        <!-- Kanban Pipeline -->
        <v-card color="#111827" variant="flat" class="mb-4">
            <v-card-title class="text-body-1 font-weight-medium pa-3">Pipeline</v-card-title>
            <v-card-text class="pa-3 pt-0">
                <div class="kanban-board">
                    <div v-for="col in kanbanColumns" :key="col.status" class="kanban-column">
                        <div class="kanban-header">
                            <v-chip :color="col.color" size="x-small" class="mr-1">{{ col.count }}</v-chip>
                            {{ col.label }}
                        </div>
                        <div class="kanban-items">
                            <v-card
                                v-for="run in col.runs"
                                :key="run.id"
                                color="#151D2E"
                                variant="flat"
                                class="kanban-card mb-2"
                                @click="openDetail(run.id)"
                                hover>
                                <v-card-text class="pa-2">
                                    <div class="text-caption text-truncate">{{ run.sentryTitle || `Run #${run.id}` }}</div>
                                    <div class="d-flex align-center mt-1 ga-1">
                                        <v-chip v-if="run.sentryProject" size="x-small" color="grey-darken-1">
                                            {{ run.sentryProject === 'ethernal-backend' ? 'BE' : 'FE' }}
                                        </v-chip>
                                        <v-chip v-if="run.sentryEventCount" size="x-small" color="grey-darken-1">
                                            {{ run.sentryEventCount }} events
                                        </v-chip>
                                        <v-spacer />
                                        <span class="text-caption text-medium-emphasis">{{ timeAgo(run.createdAt) }}</span>
                                    </div>
                                </v-card-text>
                            </v-card>
                            <div v-if="col.runs.length === 0" class="text-caption text-medium-emphasis text-center py-4">
                                None
                            </div>
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>

        <!-- Recent Runs Table -->
        <v-card color="#111827" variant="flat">
            <v-card-title class="text-body-1 font-weight-medium pa-3">Recent Runs</v-card-title>
            <v-data-table-server
                :headers="tableHeaders"
                :items="runs"
                :items-length="total"
                :loading="loading"
                :items-per-page="25"
                :items-per-page-options="[10, 25, 50]"
                class="bg-transparent"
                @update:options="loadRuns"
                @click:row="(e, { item }) => openDetail(item.id)">

                <template v-slot:item.status="{ item }">
                    <v-chip :color="statusColor(item.status)" size="x-small">{{ item.status }}</v-chip>
                </template>

                <template v-slot:item.sentryTitle="{ item }">
                    <span class="text-truncate d-inline-block" style="max-width: 300px">{{ item.sentryTitle }}</span>
                </template>

                <template v-slot:item.sentryProject="{ item }">
                    <v-chip v-if="item.sentryProject" size="x-small" color="grey-darken-1">
                        {{ item.sentryProject === 'ethernal-backend' ? 'Backend' : 'Frontend' }}
                    </v-chip>
                </template>

                <template v-slot:item.createdAt="{ item }">
                    {{ timeAgo(item.createdAt) }}
                </template>

                <template v-slot:item.links="{ item }">
                    <div class="d-flex ga-1">
                        <v-btn v-if="item.sentryLink" :href="item.sentryLink" target="_blank" icon size="x-small" variant="text">
                            <v-icon size="small">mdi-bug</v-icon>
                        </v-btn>
                        <v-btn v-if="item.githubIssueNumber" :href="`https://github.com/tryethernal/ethernal/issues/${item.githubIssueNumber}`" target="_blank" icon size="x-small" variant="text">
                            <v-icon size="small">mdi-github</v-icon>
                        </v-btn>
                        <v-btn v-if="item.githubPrNumber" :href="`https://github.com/tryethernal/ethernal/pull/${item.githubPrNumber}`" target="_blank" icon size="x-small" variant="text">
                            <v-icon size="small">mdi-source-pull</v-icon>
                        </v-btn>
                    </div>
                </template>
            </v-data-table-server>
        </v-card>

        <!-- Detail Dialog -->
        <SentryPipelineRunDetail
            v-model="showDetail"
            :run="selectedRun" />
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import SentryPipelineRunDetail from './SentryPipelineRunDetail.vue';
import { getRuns, getRun, getStats } from '@/lib/api.js';
import { initPusher, onPipelineUpdated, destroy as destroyPusher } from '@/lib/pusher.js';

const loading = ref(false);
const runs = ref([]);
const total = ref(0);
const stats = ref({ total: 0, completed: 0, failed: 0, active: 0, successRate: 0, avgDuration: 0 });
const period = ref('7d');
const showDetail = ref(false);
const selectedRun = ref(null);
let unsubscribePusher = null;

const tableHeaders = [
    { title: 'Status', key: 'status', sortable: false, width: '100px' },
    { title: 'Error', key: 'sentryTitle', sortable: false },
    { title: 'Project', key: 'sentryProject', sortable: false, width: '100px' },
    { title: 'Events', key: 'sentryEventCount', sortable: false, width: '80px' },
    { title: 'Created', key: 'createdAt', sortable: false, width: '120px' },
    { title: 'Links', key: 'links', sortable: false, width: '120px' }
];

const statsCards = computed(() => [
    { label: `Issues (${period.value})`, value: stats.value.total, color: 'text-blue-lighten-1' },
    { label: 'Success Rate', value: `${stats.value.successRate}%`, color: 'text-green-lighten-1' },
    { label: 'Avg Duration', value: formatDuration(stats.value.avgDuration), color: 'text-purple-lighten-1' },
    { label: 'Active', value: stats.value.active, color: 'text-orange-lighten-1' }
]);

const kanbanColumns = computed(() => {
    const columns = [
        { status: 'discovered', label: 'Discovered', color: 'blue' },
        { status: 'triaging', label: 'Triaging', color: 'orange' },
        { status: 'fixing', label: 'Fixing', color: 'purple' },
        { status: 'reviewing', label: 'Review', color: 'cyan' },
        { status: 'completed', label: 'Done', color: 'green' }
    ];
    return columns.map(col => ({
        ...col,
        runs: runs.value.filter(r => {
            if (col.status === 'completed') return ['completed', 'closed', 'escalated', 'failed'].includes(r.status);
            if (col.status === 'reviewing') return ['reviewing', 'merging', 'deploying'].includes(r.status);
            return r.status === col.status;
        }),
        count: runs.value.filter(r => {
            if (col.status === 'completed') return ['completed', 'closed', 'escalated', 'failed'].includes(r.status);
            if (col.status === 'reviewing') return ['reviewing', 'merging', 'deploying'].includes(r.status);
            return r.status === col.status;
        }).length
    }));
});

function statusColor(status) {
    const colors = {
        discovered: 'blue', triaging: 'orange', fixing: 'purple',
        reviewing: 'cyan', merging: 'teal', deploying: 'lime',
        completed: 'green', closed: 'grey', escalated: 'amber', failed: 'red'
    };
    return colors[status] || 'grey';
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
}

async function loadRuns(options = {}) {
    loading.value = true;
    try {
        const page = options.page || 1;
        const itemsPerPage = options.itemsPerPage || 25;
        const res = await getRuns({ page, itemsPerPage });
        runs.value = res.data.items;
        total.value = res.data.total;
    } catch (e) {
        console.error('Failed to load pipeline runs', e);
    }
    loading.value = false;
}

async function loadStats() {
    try {
        const res = await getStats({ period: period.value });
        stats.value = res.data;
    } catch (e) {
        console.error('Failed to load pipeline stats', e);
    }
}

async function openDetail(id) {
    try {
        const res = await getRun(id);
        selectedRun.value = res.data;
        showDetail.value = true;
    } catch (e) {
        console.error('Failed to load run detail', e);
    }
}

async function refresh() {
    await Promise.all([loadRuns(), loadStats()]);
}

watch(period, loadStats);

onMounted(async () => {
    await refresh();

    try {
        const soketiKey = import.meta.env.VITE_SOKETI_KEY;
        if (soketiKey) {
            initPusher(soketiKey);
            unsubscribePusher = onPipelineUpdated(() => {
                refresh();
                if (showDetail.value && selectedRun.value) {
                    openDetail(selectedRun.value.id);
                }
            });
        }
    } catch (e) {
        // Pusher may not be available
    }
});

onUnmounted(() => {
    if (unsubscribePusher) unsubscribePusher();
    destroyPusher();
});
</script>

<style scoped>
.stat-card {
    border: 1px solid rgba(61, 149, 206, 0.15);
    border-radius: 8px;
}

.kanban-board {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    min-height: 200px;
}

.kanban-column {
    flex: 1;
    min-width: 160px;
}

.kanban-header {
    font-size: 12px;
    font-weight: 500;
    color: #94A3B8;
    padding: 4px 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.kanban-items {
    min-height: 100px;
}

.kanban-card {
    cursor: pointer;
    border: 1px solid rgba(61, 149, 206, 0.1);
    transition: border-color 0.2s;
}

.kanban-card:hover {
    border-color: rgba(61, 149, 206, 0.3);
}
</style>
