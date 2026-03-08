/**
 * @fileoverview Terminal-style viewer for Claude conversation logs.
 * Compact continuous terminal with syntax highlighting and infinite scroll.
 * @component SentryConversationViewer
 *
 * @prop {Array} conversationLog - Array of conversation turn objects
 * @prop {boolean} autoScroll - Whether to auto-scroll to bottom on open / update
 */
<template>
    <div class="terminal" ref="terminal" @scroll="onScroll">
        <div v-if="!conversationLog || conversationLog.length === 0" class="empty-state">
            <span class="prompt">$</span> No conversation log available
        </div>

        <template v-else>
            <div v-if="hasMore" class="load-more" ref="loadTrigger">
                <v-progress-circular v-if="loadingMore" indeterminate size="14" width="2" color="#475569" />
                <span v-else class="hint">scroll up for more</span>
            </div>

            <div v-for="(turn, i) in visibleItems" :key="startIndex + i" class="turn">
                <span class="dot" :class="dotClass(turn)"></span>
                <div class="turn-body">
                    <pre v-if="turn.text" class="line text">{{ turn.text }}</pre>
                    <pre v-if="turn.input" class="line code">{{ formatContent(turn.input) }}</pre>
                    <pre v-if="turn.output" class="line dim">{{ formatContent(turn.output) }}</pre>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';

const PAGE_SIZE = 50;

const props = defineProps({
    conversationLog: { type: Array, default: () => [] },
    autoScroll: { type: Boolean, default: false }
});

const terminal = ref(null);
const loadingMore = ref(false);
const startIndex = ref(0);

const totalItems = computed(() => props.conversationLog?.length || 0);
const hasMore = computed(() => startIndex.value > 0);
const visibleItems = computed(() => props.conversationLog?.slice(startIndex.value) || []);

function initStartIndex() {
    startIndex.value = Math.max(0, totalItems.value - PAGE_SIZE);
}

function loadMore() {
    if (loadingMore.value || startIndex.value <= 0) return;
    loadingMore.value = true;
    const el = terminal.value;
    const prevHeight = el ? el.scrollHeight : 0;
    startIndex.value = Math.max(0, startIndex.value - PAGE_SIZE);
    nextTick(() => {
        if (el) el.scrollTop += el.scrollHeight - prevHeight;
        loadingMore.value = false;
    });
}

function onScroll() {
    if (terminal.value && hasMore.value && terminal.value.scrollTop < 60) loadMore();
}

function scrollToBottom() {
    nextTick(() => { if (terminal.value) terminal.value.scrollTop = terminal.value.scrollHeight; });
}

function dotClass(turn) {
    if (turn.tool) return 'dot-tool';
    if (turn.role === 'user') return 'dot-user';
    return 'dot-text';
}

function formatContent(content) {
    if (typeof content === 'string') return content;
    try { return JSON.stringify(content, null, 2); }
    catch { return String(content); }
}

watch(() => props.conversationLog, () => {
    initStartIndex();
    if (props.autoScroll) scrollToBottom();
}, { immediate: true });

onMounted(() => scrollToBottom());
</script>

<style scoped>
.terminal {
    background: #0a0e17;
    border-radius: 6px;
    padding: 12px 14px;
    max-height: 600px;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.5;
    scrollbar-width: thin;
    scrollbar-color: #1e293b #0a0e17;
}
.terminal::-webkit-scrollbar { width: 5px; }
.terminal::-webkit-scrollbar-track { background: #0a0e17; }
.terminal::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }

.empty-state { color: #475569; padding: 32px 0; text-align: center; }
.prompt { color: #3D95CE; }
.load-more { text-align: center; padding: 4px 0 8px; }
.hint { color: #334155; font-size: 10px; }

.turn {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}
.turn + .turn { margin-top: 6px; }

.dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 7px;
}
.dot-text { background: #64748B; }
.dot-tool { background: #3D95CE; }
.dot-user { background: #4ade80; }

.turn-body { min-width: 0; flex: 1; }

.line {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
}
.line + .line { margin-top: 2px; }

.text { color: #e2e8f0; }
.code { color: #94a3b8; }
.dim { color: #475569; }
</style>
