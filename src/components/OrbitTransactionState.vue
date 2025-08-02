<template>
    <v-card class="orbit-transaction-state">
        <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-transit-connection-variant</v-icon>
            <h4>Arbitrum Orbit State</h4>
            <v-spacer />
            <v-btn 
                icon="mdi-refresh"
                size="small"
                variant="text"
                @click="refreshState"
                :loading="loading"
            />
        </v-card-title>
        
        <v-card-text>
            <div v-if="loading && !timeline.length" class="text-center py-4">
                <v-progress-circular indeterminate />
                <div class="mt-2">Loading orbit state...</div>
            </div>

            <div v-else-if="error" class="text-center py-4">
                <v-icon color="error" size="48">mdi-alert-circle-outline</v-icon>
                <div class="mt-2 text-error">{{ error }}</div>
                <v-btn 
                    color="primary" 
                    variant="text" 
                    @click="loadTransactionState"
                    class="mt-2"
                >
                    Retry
                </v-btn>
            </div>

            <div v-else-if="!found" class="text-center py-4">
                <v-icon size="48" color="info">mdi-information-outline</v-icon>
                <div class="mt-2">No Orbit state tracking for this transaction</div>
                <div class="text-caption text-medium-emphasis mt-1">
                    This workspace may not be configured as an Orbit chain, or this transaction was created before Orbit tracking was enabled.
                </div>
            </div>

            <div v-else>
                <!-- Current status summary -->
                <v-alert 
                    :type="getStatusAlertType(currentState)"
                    class="mb-4"
                >
                    <div class="d-flex align-center">
                        <v-icon class="mr-2">{{ getStateIcon({ state: currentState }) }}</v-icon>
                        <div>
                            <strong>{{ formatStateName(currentState) }}</strong>
                            <div class="text-caption">
                                {{ statusDescription }}
                            </div>
                        </div>
                        <v-spacer />
                        <div class="text-right">
                            <div class="text-caption">Progress</div>
                            <div class="text-h6">{{ progressPercentage }}%</div>
                        </div>
                    </div>
                </v-alert>

                <!-- Progress bar -->
                <v-progress-linear 
                    :model-value="progressPercentage"
                    :color="getProgressColor(currentState)"
                    class="mb-4"
                    height="8"
                    rounded
                />

                <!-- State timeline -->
                <div class="state-timeline">
                    <v-timeline align="start" density="compact">
                        <v-timeline-item
                            v-for="(state, index) in timeline"
                            :key="state.state"
                            :color="getStateColor(state)"
                            :icon="getStateIcon(state)"
                            fill-dot
                        >
                            <template #opposite>
                                <span class="text-caption">
                                    {{ state.timestamp ? formatTimestamp(state.timestamp) : 'Pending' }}
                                </span>
                            </template>
                            
                            <div>
                                <h6 class="font-weight-medium">
                                    {{ formatStateName(state.state) }}
                                    <v-chip 
                                        v-if="state.isCurrent"
                                        size="x-small"
                                        color="primary"
                                        class="ml-2"
                                    >
                                        Current
                                    </v-chip>
                                </h6>
                                
                                <div v-if="state.blockNumber" class="text-caption text-medium-emphasis">
                                    Block: {{ state.blockNumber }}
                                </div>
                                
                                <div v-if="state.txHash" class="text-caption text-medium-emphasis">
                                    Tx: {{ state.txHash.substring(0, 10) }}...
                                    <v-btn 
                                        size="x-small" 
                                        variant="text" 
                                        :href="`#/transaction/${state.txHash}`"
                                        class="ml-1"
                                    >
                                        View
                                    </v-btn>
                                </div>
                            </div>
                        </v-timeline-item>
                    </v-timeline>
                </div>
                
                <!-- Next expected states -->
                <div v-if="nextStates.length > 0" class="mt-4">
                    <h6>Next Expected States:</h6>
                    <v-chip
                        v-for="nextState in nextStates"
                        :key="nextState"
                        size="small"
                        class="mr-2 mt-1"
                        color="info"
                        variant="outlined"
                    >
                        {{ formatStateName(nextState) }}
                    </v-chip>
                </div>

                <!-- Estimated time to completion -->
                <div v-if="estimatedTimeToCompletion > 0 && !isFinalState" class="mt-4">
                    <v-card variant="outlined">
                        <v-card-text class="pa-3">
                            <div class="d-flex align-center">
                                <v-icon class="mr-2">mdi-clock-outline</v-icon>
                                <div>
                                    <div class="text-caption">Estimated time to completion</div>
                                    <div class="font-weight-medium">{{ formatDuration(estimatedTimeToCompletion) }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>

                <!-- Error information -->
                <div v-if="hasFailed" class="mt-4">
                    <v-alert type="error" title="Transaction Failed">
                        {{ failureReason || 'Unknown error occurred during processing' }}
                    </v-alert>
                </div>

                <!-- Last updated info -->
                <div class="mt-3 text-caption text-medium-emphasis">
                    Last updated: {{ formatTimestamp(lastUpdated) }}
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, inject } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

const props = defineProps({
    transactionHash: {
        type: String,
        required: true
    }
});

const $server = inject('$server');
const currentWorkspaceStore = useCurrentWorkspaceStore();

const timeline = ref([]);
const nextStates = ref([]);
const currentState = ref('');
const progressPercentage = ref(0);
const statusDescription = ref('');
const estimatedTimeToCompletion = ref(0);
const isFinalState = ref(false);
const hasFailed = ref(false);
const failureReason = ref('');
const lastUpdated = ref('');
const loading = ref(false);
const error = ref(null);
const found = ref(false);

let pollingInterval = null;

function getStatusAlertType(state) {
    const typeMap = {
        'SUBMITTED': 'info',
        'SEQUENCED': 'info', 
        'POSTED': 'warning',
        'CONFIRMED': 'warning',
        'FINALIZED': 'success',
        'FAILED': 'error'
    };
    return typeMap[state] || 'info';
}

function getProgressColor(state) {
    const colorMap = {
        'SUBMITTED': 'info',
        'SEQUENCED': 'info',
        'POSTED': 'warning',
        'CONFIRMED': 'warning',
        'FINALIZED': 'success',
        'FAILED': 'error'
    };
    return colorMap[state] || 'info';
}

function getStateColor(state) {
    if (state.isComplete) {
        return state.isCurrent ? 'primary' : 'success';
    }
    return 'grey-lighten-2';
}

function getStateIcon(state) {
    const icons = {
        'SUBMITTED': 'mdi-upload',
        'SEQUENCED': 'mdi-sort-variant',
        'POSTED': 'mdi-cloud-upload',
        'CONFIRMED': 'mdi-check-circle',
        'FINALIZED': 'mdi-seal',
        'FAILED': 'mdi-alert-circle'
    };
    return icons[state.state] || 'mdi-circle';
}

function formatStateName(state) {
    return state.charAt(0) + state.slice(1).toLowerCase();
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} minutes`;
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        const days = Math.floor(minutes / 1440);
        return `${days} day${days > 1 ? 's' : ''}`;
    }
}

async function loadTransactionState() {
    loading.value = true;
    error.value = null;
    
    try {
        const response = await $server.getOrbitTransactionState(props.transactionHash);
        
        if (response.found) {
            found.value = true;
            timeline.value = response.timeline || [];
            nextStates.value = response.nextStates || [];
            currentState.value = response.currentState || '';
            progressPercentage.value = response.progressPercentage || 0;
            statusDescription.value = response.statusDescription || '';
            estimatedTimeToCompletion.value = response.estimatedTimeToCompletion || 0;
            isFinalState.value = response.isFinalState || false;
            hasFailed.value = response.hasFailed || false;
            failureReason.value = response.failureReason || '';
            lastUpdated.value = response.lastUpdated || '';
        } else {
            found.value = false;
        }
    } catch (err) {
        console.error('Failed to load orbit transaction state:', err);
        error.value = 'Failed to load orbit state. Please try again.';
    } finally {
        loading.value = false;
    }
}

async function refreshState() {
    await loadTransactionState();
}

// Auto-refresh for non-final states
function startPolling() {
    // Only poll if not in a final state
    if (!isFinalState.value && found.value) {
        pollingInterval = setInterval(loadTransactionState, 30000); // 30 seconds
    }
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

onMounted(async () => {
    await loadTransactionState();
    startPolling();
});

onUnmounted(() => {
    stopPolling();
});

// Watch for final state changes to stop polling
const stopWatcher = computed(() => {
    if (isFinalState.value) {
        stopPolling();
    } else if (found.value && !pollingInterval) {
        startPolling();
    }
});
</script>

<style scoped>
.orbit-transaction-state {
    margin-top: 1rem;
}

.state-timeline {
    max-height: 400px;
    overflow-y: auto;
}
</style>