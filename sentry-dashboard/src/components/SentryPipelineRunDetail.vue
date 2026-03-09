/**
 * @fileoverview Detail dialog for a single Sentry pipeline run.
 * Shows status timeline, links, triage info, fix summary, and conversation viewer.
 * @component SentryPipelineRunDetail
 *
 * @prop {Object} run - The pipeline run object
 * @prop {boolean} modelValue - Dialog visibility (v-model)
 * @emits update:modelValue - When dialog visibility changes
 */
<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="1000" scrollable>
        <v-card color="#111827" class="run-detail-card">
            <v-card-title class="d-flex align-center pa-4">
                <v-icon class="mr-2" size="small">mdi-bug-outline</v-icon>
                <span class="text-truncate">{{ run?.sentryTitle || 'Pipeline Run' }}</span>
                <v-spacer />
                <v-chip :color="statusColor(run?.status)" size="small" class="mr-2">{{ run?.status }}</v-chip>
                <v-btn icon size="small" variant="text" @click="$emit('update:modelValue', false)">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-4" v-if="run">
                <!-- Status Timeline -->
                <v-stepper
                    :model-value="activeStepIndex"
                    alt-labels
                    flat
                    class="status-stepper mb-4"
                    bg-color="transparent">
                    <v-stepper-header>
                        <template v-for="(step, i) in pipelineSteps" :key="step.value">
                            <v-stepper-item
                                :value="i"
                                :complete="isStepComplete(step.value)"
                                :color="stepColor(step.value)"
                                :title="step.label"
                                :icon="stepIcon(step.value)" />
                            <v-divider v-if="i < pipelineSteps.length - 1" />
                        </template>
                    </v-stepper-header>
                </v-stepper>

                <!-- Info Grid -->
                <v-row class="mb-4">
                    <v-col cols="12" md="6">
                        <v-card color="#151D2E" variant="flat">
                            <v-card-text>
                                <div class="text-caption text-medium-emphasis mb-1">Links</div>
                                <div class="d-flex flex-column ga-1">
                                    <a v-if="run.sentryLink" :href="run.sentryLink" target="_blank" class="text-blue-lighten-1 text-decoration-none">
                                        <v-icon size="small" class="mr-1">mdi-bug</v-icon>Sentry Issue
                                    </a>
                                    <a v-if="run.githubIssueNumber" :href="`https://github.com/tryethernal/ethernal/issues/${run.githubIssueNumber}`" target="_blank" class="text-blue-lighten-1 text-decoration-none">
                                        <v-icon size="small" class="mr-1">mdi-github</v-icon>Issue #{{ run.githubIssueNumber }}
                                    </a>
                                    <a v-if="run.githubPrNumber" :href="`https://github.com/tryethernal/ethernal/pull/${run.githubPrNumber}`" target="_blank" class="text-blue-lighten-1 text-decoration-none">
                                        <v-icon size="small" class="mr-1">mdi-source-pull</v-icon>PR #{{ run.githubPrNumber }}
                                    </a>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-card color="#151D2E" variant="flat">
                            <v-card-text>
                                <div class="text-caption text-medium-emphasis mb-1">Details</div>
                                <div class="d-flex flex-column ga-1 text-body-2">
                                    <div><span class="text-medium-emphasis">Project:</span> {{ run.sentryProject }}</div>
                                    <div><span class="text-medium-emphasis">Level:</span> {{ run.sentryLevel }}</div>
                                    <div><span class="text-medium-emphasis">Events:</span> {{ run.sentryEventCount }}</div>
                                    <div v-if="run.duration"><span class="text-medium-emphasis">Duration:</span> {{ formatDuration(run.duration) }}</div>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <!-- Triage Info -->
                <v-card v-if="run.triageDecision" color="#151D2E" variant="flat" class="mb-4">
                    <v-card-text>
                        <div class="text-caption text-medium-emphasis mb-1">Triage Decision</div>
                        <v-chip :color="triageColor(run.triageDecision)" size="small" class="mb-2">{{ run.triageDecision }}</v-chip>
                        <div v-if="run.triageReason" class="text-body-2 mt-1">{{ run.triageReason }}</div>
                    </v-card-text>
                </v-card>

                <!-- Fix Summary -->
                <v-card v-if="run.fixSummary" color="#151D2E" variant="flat" class="mb-4">
                    <v-card-text>
                        <div class="text-caption text-medium-emphasis mb-1">Fix Summary</div>
                        <div class="text-body-2">{{ run.fixSummary }}</div>
                    </v-card-text>
                </v-card>

                <!-- Conversation Log -->
                <div class="text-caption text-medium-emphasis mb-2">Claude Conversation</div>
                <SentryConversationViewer
                    :conversation-log="run.conversationLog"
                    :auto-scroll="true" />
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import SentryConversationViewer from './SentryConversationViewer.vue';

const props = defineProps({
    run: { type: Object, default: null },
    modelValue: { type: Boolean, default: false }
});

defineEmits(['update:modelValue']);

const pipelineSteps = [
    { value: 'discovered', label: 'Discovered' },
    { value: 'triaging', label: 'Triaging' },
    { value: 'fixing', label: 'Fixing' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'merging', label: 'Merging' },
    { value: 'merged', label: 'Merged' },
    { value: 'deploying', label: 'Deploying' },
    { value: 'completed', label: 'Completed' }
];

const stepOrder = pipelineSteps.map(s => s.value);
const terminalStatuses = ['closed', 'escalated', 'failed'];

const activeStepIndex = computed(() => {
    if (!props.run) return 0;
    if (terminalStatuses.includes(props.run.status)) return stepOrder.indexOf('triaging');
    const idx = stepOrder.indexOf(props.run.status);
    return idx >= 0 ? idx : 0;
});

const isActive = computed(() => {
    if (!props.run) return false;
    return !['completed', 'closed', 'escalated', 'failed'].includes(props.run.status);
});

function isStepComplete(step) {
    if (!props.run) return false;
    if (props.run.status === 'completed') return true;
    const currentIdx = stepOrder.indexOf(props.run.status);
    const stepIdx = stepOrder.indexOf(step);
    return stepIdx < currentIdx;
}

function statusColor(status) {
    const colors = {
        discovered: 'blue', triaging: 'orange', fixing: 'purple',
        reviewing: 'cyan', merging: 'teal', merged: 'indigo',
        deploying: 'lime', completed: 'green', closed: 'grey',
        escalated: 'amber', failed: 'red'
    };
    return colors[status] || 'grey';
}

function stepColor(step) {
    if (!props.run) return 'grey';
    if (terminalStatuses.includes(props.run.status) && step === 'triaging') {
        return statusColor(props.run.status);
    }
    return isStepComplete(step) ? 'green' : props.run.status === step ? statusColor(step) : 'grey';
}

function stepIcon(step) {
    if (!props.run) return undefined;
    if (isStepComplete(step)) return 'mdi-check';
    if (props.run.status === 'failed' && stepOrder.indexOf(step) === activeStepIndex.value) return 'mdi-alert-circle';
    return undefined;
}

function triageColor(decision) {
    const colors = { 'auto-fix': 'green', close: 'grey', escalate: 'amber' };
    return colors[decision] || 'grey';
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}
</script>

<style scoped>
.run-detail-card {
    border: 1px solid rgba(61, 149, 206, 0.22);
}

.status-stepper {
    background: transparent !important;
}

.status-stepper :deep(.v-stepper-item__avatar) {
    width: 28px !important;
    height: 28px !important;
}

.status-stepper :deep(.v-stepper-item__title) {
    font-size: 11px;
}
</style>
