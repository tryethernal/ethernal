/**
 * @fileoverview Live view showing active sessions in split panes.
 * Dynamically computes grid layout based on session count.
 * Panels are manually resizable. Real-time updates via Pusher.
 * @component LiveView
 */
<template>
    <div class="live-container" :style="gridStyle">
        <!-- Empty state -->
        <div v-if="sessions.length === 0" class="empty-state">
            <v-icon size="48" color="#334155">mdi-console</v-icon>
            <div class="text-body-2 text-medium-emphasis mt-3">No active sessions</div>
        </div>

        <!-- Session panes -->
        <div v-for="session in sessions" :key="session.id" class="pane">
            <div class="pane-titlebar">
                <span class="pane-title text-truncate">{{ session.sentryTitle || `Session #${session.id}` }}</span>
                <div class="titlebar-actions">
                    <a v-if="session.githubPrNumber"
                       :href="`https://github.com/tryethernal/ethernal/pull/${session.githubPrNumber}`"
                       target="_blank"
                       class="titlebar-link"
                       @click.stop>
                        <v-icon size="14">mdi-source-pull</v-icon>
                    </a>
                    <a v-if="session.githubIssueNumber"
                       :href="`https://github.com/tryethernal/ethernal/issues/${session.githubIssueNumber}`"
                       target="_blank"
                       class="titlebar-link"
                       @click.stop>
                        <v-icon size="14">mdi-github</v-icon>
                    </a>
                    <v-chip size="x-small" color="#151D2E" class="elapsed-badge">
                        {{ elapsed(session.createdAt) }}
                    </v-chip>
                </div>
            </div>
            <ConversationViewer
                :ref="el => setViewerRef(session.id, el)"
                :conversation-log="session.conversationLog || []"
                :streaming="true"
                :auto-scroll="true" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import ConversationViewer from './ConversationViewer.vue';
import { getActiveRuns } from '@/lib/api.js';
import { initPusher, onPipelineUpdated, onTurnAdded, destroy as destroyPusher } from '@/lib/pusher.js';

const sessions = ref([]);
const viewerRefs = {};
let unsubscribeUpdated = null;
let unsubscribeTurnAdded = null;
let elapsedInterval = null;
const now = ref(Date.now());

/**
 * Store a reference to a ConversationViewer component by session ID.
 *
 * @param {number} id - Session ID
 * @param {Object|null} el - Component instance or null on unmount
 */
function setViewerRef(id, el) {
    if (el) viewerRefs[id] = el;
    else delete viewerRefs[id];
}

const gridStyle = computed(() => {
    const n = sessions.value.length;
    if (n === 0) return { display: 'flex', alignItems: 'center', justifyContent: 'center' };
    if (n === 1) return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`
    };
});

/**
 * Compute elapsed time string from a given date.
 *
 * @param {string} dateStr - ISO date string
 * @returns {string} Human-readable elapsed time
 */
function elapsed(dateStr) {
    if (!dateStr) return '';
    const diff = now.value - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ${secs % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
}

/**
 * Fetch active runs from the API and update the sessions list.
 */
async function loadActiveSessions() {
    try {
        const res = await getActiveRuns();
        sessions.value = res.data || [];
    } catch (e) {
        console.error('Failed to load active sessions', e);
    }
}

onMounted(async () => {
    await loadActiveSessions();

    // Update elapsed times every second
    elapsedInterval = setInterval(() => { now.value = Date.now(); }, 1000);

    try {
        const soketiKey = import.meta.env.VITE_SOKETI_KEY;
        if (soketiKey) {
            initPusher(soketiKey);

            unsubscribeTurnAdded = onTurnAdded((data) => {
                const viewer = viewerRefs[data.id];
                if (viewer && viewer.appendTurns) {
                    viewer.appendTurns(data.turns || []);
                }
            });

            unsubscribeUpdated = onPipelineUpdated(() => {
                loadActiveSessions();
            });
        }
    } catch (e) {
        // Pusher may not be available
    }
});

onUnmounted(() => {
    if (unsubscribeUpdated) unsubscribeUpdated();
    if (unsubscribeTurnAdded) unsubscribeTurnAdded();
    if (elapsedInterval) clearInterval(elapsedInterval);
    destroyPusher();
});
</script>

<style scoped>
.live-container {
    height: calc(100vh - 48px);
    gap: 2px;
    background: #070a12;
    overflow: hidden;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #0B1120;
    overflow: auto;
    resize: both;
}

.pane-titlebar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #151D2E;
    border-bottom: 1px solid rgba(61, 149, 206, 0.15);
    flex-shrink: 0;
}

.pane-title {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    color: #94A3B8;
    min-width: 0;
    flex: 1;
}

.titlebar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.titlebar-link {
    color: #64748B;
    display: flex;
    align-items: center;
    text-decoration: none;
    transition: color 0.15s;
}
.titlebar-link:hover {
    color: #3D95CE;
}

.elapsed-badge {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 10px;
    color: #64748B !important;
    flex-shrink: 0;
}

/* Style the resize handle */
.pane::-webkit-resizer {
    background: linear-gradient(135deg, transparent 40%, rgba(61, 149, 206, 0.3) 40%, rgba(61, 149, 206, 0.3) 50%, transparent 50%, transparent 70%, rgba(61, 149, 206, 0.3) 70%, rgba(61, 149, 206, 0.3) 80%, transparent 80%);
}
</style>
