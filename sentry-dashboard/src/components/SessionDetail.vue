/**
 * @fileoverview Full page conversation view for a single session.
 * Shows session metadata in a compact top bar with live streaming support.
 * @component SessionDetail
 */
<template>
    <div class="session-detail">
        <!-- Top bar -->
        <div class="detail-topbar">
            <v-btn icon size="small" variant="text" @click="$router.push({ name: 'history' })">
                <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <span class="detail-title text-truncate">{{ run?.sentryTitle || 'Loading...' }}</span>
            <v-chip v-if="run" :color="statusColor(run.status)" size="x-small" class="ml-2">{{ run.status }}</v-chip>
            <div class="d-flex ga-1 ml-2">
                <v-btn v-if="run?.sentryLink" :href="run.sentryLink" target="_blank" icon size="x-small" variant="text">
                    <v-icon size="small">mdi-bug</v-icon>
                </v-btn>
                <v-btn v-if="run?.githubIssueNumber" :href="`https://github.com/tryethernal/ethernal/issues/${run.githubIssueNumber}`" target="_blank" icon size="x-small" variant="text">
                    <v-icon size="small">mdi-github</v-icon>
                </v-btn>
                <v-btn v-if="run?.githubPrNumber" :href="`https://github.com/tryethernal/ethernal/pull/${run.githubPrNumber}`" target="_blank" icon size="x-small" variant="text">
                    <v-icon size="small">mdi-source-pull</v-icon>
                </v-btn>
            </div>
        </div>

        <!-- Conversation viewer -->
        <div class="viewer-container">
            <ConversationViewer
                ref="viewerRef"
                :conversation-log="run?.conversationLog || []"
                :auto-scroll="true"
                :streaming="isActive" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import ConversationViewer from './ConversationViewer.vue';
import { getRun } from '@/lib/api.js';
import { statusColor } from '@/lib/helpers.js';
import { initPusher, onPipelineUpdated, onTurnAdded, destroy as destroyPusher } from '@/lib/pusher.js';

const route = useRoute();
const run = ref(null);
const viewerRef = ref(null);
let unsubscribeUpdated = null;
let unsubscribeTurnAdded = null;

const terminalStatuses = ['completed', 'closed', 'escalated', 'failed'];

const isActive = computed(() => {
    if (!run.value) return false;
    return !terminalStatuses.includes(run.value.status);
});

/**
 * Fetch the run detail from the API.
 */
async function loadRun() {
    try {
        const res = await getRun(route.params.id);
        run.value = res.data;
    } catch (e) {
        console.error('Failed to load session', e);
    }
}

onMounted(async () => {
    await loadRun();

    try {
        const soketiKey = import.meta.env.VITE_SOKETI_KEY;
        if (soketiKey) {
            initPusher(soketiKey);

            unsubscribeTurnAdded = onTurnAdded((data) => {
                if (data.id === Number(route.params.id) && viewerRef.value?.appendTurns) {
                    viewerRef.value.appendTurns(data.turns || []);
                }
            });

            unsubscribeUpdated = onPipelineUpdated((data) => {
                if (data.id === Number(route.params.id)) {
                    loadRun();
                }
            });
        }
    } catch (e) {
        // Pusher may not be available
    }
});

onUnmounted(() => {
    if (unsubscribeUpdated) unsubscribeUpdated();
    if (unsubscribeTurnAdded) unsubscribeTurnAdded();
    destroyPusher();
});
</script>

<style scoped>
.session-detail {
    height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.detail-topbar {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: #111827;
    border-bottom: 1px solid rgba(61, 149, 206, 0.15);
    flex-shrink: 0;
}

.detail-title {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #e2e8f0;
    min-width: 0;
}

.viewer-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 4px;
}
</style>
