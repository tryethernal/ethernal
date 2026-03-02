<template>
    <v-card v-if="showLifecycle" class="mb-4">
        <v-card-title class="text-subtitle-1">
            {{ isWithdrawal ? 'Withdrawal Lifecycle' : 'Transaction Lifecycle' }}
        </v-card-title>
        <v-card-text>
            <v-stepper
                :model-value="currentStep"
                alt-labels
                flat
                non-linear
            >
                <v-stepper-header>
                    <template v-if="isWithdrawal">
                        <v-stepper-item
                            :complete="lifecycleStatus.initiatedComplete"
                            :color="lifecycleStatus.initiatedComplete ? 'success' : 'grey'"
                            value="1"
                            title="Initiated"
                            subtitle="L2"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.stateProposedComplete"
                            :color="lifecycleStatus.stateProposedComplete ? 'success' : 'grey'"
                            value="2"
                            title="State Proposed"
                            subtitle="L1"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.challengePeriodComplete"
                            :color="lifecycleStatus.challengePeriodComplete ? 'success' : (lifecycleStatus.stateProposedComplete ? 'warning' : 'grey')"
                            value="3"
                            title="Challenge Period"
                            :subtitle="challengePeriodSubtitle"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.provenComplete"
                            :color="lifecycleStatus.provenComplete ? 'success' : 'grey'"
                            value="4"
                            title="Proven"
                            subtitle="L1"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.finalizedComplete"
                            :color="lifecycleStatus.finalizedComplete ? 'success' : 'grey'"
                            value="5"
                            title="Finalized"
                            subtitle="L1"
                        />
                    </template>
                    <template v-else>
                        <v-stepper-item
                            :complete="lifecycleStatus.processedComplete"
                            :color="lifecycleStatus.processedComplete ? 'success' : 'grey'"
                            value="1"
                            title="Processed"
                            subtitle="L2"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.batchedComplete"
                            :color="lifecycleStatus.batchedComplete ? 'success' : 'grey'"
                            value="2"
                            title="Batched"
                            subtitle="L1"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.stateProposedComplete"
                            :color="lifecycleStatus.stateProposedComplete ? 'success' : (lifecycleStatus.batchedComplete ? 'warning' : 'grey')"
                            value="3"
                            title="State Proposed"
                            subtitle="L1"
                        />
                        <v-divider></v-divider>
                        <v-stepper-item
                            :complete="lifecycleStatus.finalizedComplete"
                            :color="lifecycleStatus.finalizedComplete ? 'success' : 'grey'"
                            value="4"
                            title="Finalized"
                            subtitle="L1"
                        />
                    </template>
                </v-stepper-header>
            </v-stepper>

            <div v-if="timeRemaining" class="text-center mt-2 text-caption text-medium-emphasis">
                {{ timeRemaining }}
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
    transaction: {
        type: Object,
        default: null
    },
    withdrawal: {
        type: Object,
        default: null
    },
    batch: {
        type: Object,
        default: null
    },
    output: {
        type: Object,
        default: null
    }
});

const $dt = inject('$dt');

const showLifecycle = computed(() => {
    return props.transaction || props.withdrawal;
});

const isWithdrawal = computed(() => {
    return !!props.withdrawal;
});

const lifecycleStatus = computed(() => {
    if (isWithdrawal.value) {
        const status = props.withdrawal?.status || 'initiated';
        return {
            initiatedComplete: true,
            stateProposedComplete: ['proposed', 'proven', 'finalized'].includes(status) || !!props.output,
            challengePeriodComplete: props.output?.status === 'finalized' || status === 'proven' || status === 'finalized',
            provenComplete: ['proven', 'finalized'].includes(status),
            finalizedComplete: status === 'finalized'
        };
    } else {
        const batchStatus = props.batch?.status || 'pending';
        const outputStatus = props.output?.status || 'pending';
        return {
            processedComplete: true,
            batchedComplete: !!props.batch,
            stateProposedComplete: !!props.output,
            finalizedComplete: outputStatus === 'finalized'
        };
    }
});

const currentStep = computed(() => {
    if (isWithdrawal.value) {
        if (lifecycleStatus.value.finalizedComplete) return 5;
        if (lifecycleStatus.value.provenComplete) return 4;
        if (lifecycleStatus.value.challengePeriodComplete) return 3;
        if (lifecycleStatus.value.stateProposedComplete) return 2;
        return 1;
    } else {
        if (lifecycleStatus.value.finalizedComplete) return 4;
        if (lifecycleStatus.value.stateProposedComplete) return 3;
        if (lifecycleStatus.value.batchedComplete) return 2;
        return 1;
    }
});

const challengePeriodSubtitle = computed(() => {
    if (!props.output?.challengePeriodEnds) return 'Waiting';
    const endTime = new Date(props.output.challengePeriodEnds);
    if (endTime <= new Date()) return 'Complete';
    return $dt.fromNow(props.output.challengePeriodEnds);
});

const timeRemaining = computed(() => {
    if (!isWithdrawal.value) return null;
    if (!props.output?.challengePeriodEnds) return null;
    if (lifecycleStatus.value.provenComplete) return null;

    const endTime = new Date(props.output.challengePeriodEnds);
    if (endTime <= new Date()) return 'Challenge period ended - ready to prove';

    return `Challenge period ends ${$dt.fromNow(props.output.challengePeriodEnds)}`;
});
</script>
