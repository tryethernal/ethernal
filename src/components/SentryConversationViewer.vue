/**
 * @fileoverview Terminal-like viewer for Claude conversation logs from Sentry pipeline runs.
 * Renders tool calls, reasoning, and outputs in a dark terminal aesthetic.
 * @component SentryConversationViewer
 *
 * @prop {Array} conversationLog - Array of conversation turn objects
 * @prop {boolean} autoScroll - Whether to auto-scroll to bottom for active runs
 */
<template>
    <div class="conversation-viewer" ref="viewer">
        <div v-if="!conversationLog || conversationLog.length === 0" class="empty-state">
            <v-icon size="48" color="grey-darken-1">mdi-console</v-icon>
            <div class="text-grey mt-2">No conversation log available</div>
        </div>

        <v-expansion-panels v-else variant="accordion" class="conversation-panels">
            <v-expansion-panel
                v-for="(turn, index) in conversationLog"
                :key="index"
                class="conversation-turn"
                :class="turnClass(turn)">
                <v-expansion-panel-title class="turn-header">
                    <div class="d-flex align-center ga-2" style="width: 100%">
                        <v-icon :color="turnIconColor(turn)" size="small">{{ turnIcon(turn) }}</v-icon>
                        <span class="turn-role">{{ turn.role || 'assistant' }}</span>
                        <span v-if="turn.tool" class="turn-tool">{{ turn.tool }}</span>
                        <v-spacer />
                        <span v-if="turn.duration" class="turn-duration">{{ turn.duration }}ms</span>
                    </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <div v-if="turn.text" class="turn-text">
                        <pre class="turn-content">{{ turn.text }}</pre>
                    </div>
                    <div v-if="turn.input" class="turn-section">
                        <div class="section-label">Input</div>
                        <pre class="turn-content">{{ formatContent(turn.input) }}</pre>
                    </div>
                    <div v-if="turn.output" class="turn-section">
                        <div class="section-label">Output</div>
                        <pre class="turn-content turn-output">{{ formatContent(turn.output) }}</pre>
                    </div>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    conversationLog: {
        type: Array,
        default: () => []
    },
    autoScroll: {
        type: Boolean,
        default: false
    }
});

const viewer = ref(null);

const toolIcons = {
    Bash: 'mdi-console',
    Read: 'mdi-file-eye',
    Edit: 'mdi-file-edit',
    Write: 'mdi-file-plus',
    Grep: 'mdi-text-search',
    Glob: 'mdi-file-find',
    WebFetch: 'mdi-web',
    WebSearch: 'mdi-magnify'
};

function turnIcon(turn) {
    if (turn.tool) return toolIcons[turn.tool] || 'mdi-wrench';
    if (turn.role === 'user') return 'mdi-account';
    return 'mdi-robot';
}

function turnIconColor(turn) {
    if (turn.tool) return 'blue-lighten-1';
    if (turn.role === 'user') return 'green-lighten-1';
    return 'purple-lighten-1';
}

function turnClass(turn) {
    return turn.tool ? 'turn-tool-call' : turn.role === 'user' ? 'turn-user' : 'turn-assistant';
}

function formatContent(content) {
    if (typeof content === 'string') return content;
    try {
        return JSON.stringify(content, null, 2);
    } catch {
        return String(content);
    }
}

watch(() => props.conversationLog, async () => {
    if (props.autoScroll && viewer.value) {
        await nextTick();
        viewer.value.scrollTop = viewer.value.scrollHeight;
    }
}, { deep: true });
</script>

<style scoped>
.conversation-viewer {
    background: #0B1120;
    border-radius: 8px;
    padding: 12px;
    max-height: 600px;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
}

.conversation-panels {
    background: transparent !important;
}

.conversation-turn {
    background: #111827 !important;
    margin-bottom: 4px;
    border-radius: 4px !important;
}

.turn-header {
    min-height: 36px !important;
    padding: 4px 12px !important;
    font-size: 12px;
}

.turn-role {
    color: #94A3B8;
    text-transform: capitalize;
}

.turn-tool {
    background: rgba(61, 149, 206, 0.2);
    color: #5DAAE0;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
}

.turn-duration {
    color: #64748B;
    font-size: 11px;
}

.turn-content {
    white-space: pre-wrap;
    word-break: break-word;
    color: #F1F5F9;
    margin: 0;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.5;
    max-height: 400px;
    overflow-y: auto;
}

.turn-output {
    color: #94A3B8;
}

.turn-section {
    margin-top: 8px;
}

.section-label {
    color: #64748B;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
}

.turn-text {
    padding: 4px 0;
}
</style>
