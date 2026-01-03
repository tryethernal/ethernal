<template>
    <v-card>
        <v-card-text class="pa-0">
            <v-list density="compact" class="transaction-list">

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Output Index:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ Number(output.outputIndex).toLocaleString() }}
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Status:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <v-chip :color="statusColors[output.status]" size="small">
                            {{ statusLabels[output.status] }}
                        </v-chip>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Proposed At:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ `${$dt.shortDate(output.timestamp)}` }}<span class="text-medium-emphasis"> ({{ $dt.fromNow(output.timestamp) }})</span>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Challenge Period Ends:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ $dt.shortDate(output.challengePeriodEnds) }}
                        <span v-if="new Date(output.challengePeriodEnds) > new Date()" class="text-warning">
                            ({{ $dt.fromNow(output.challengePeriodEnds) }})
                        </span>
                        <span v-else class="text-success">(Ended)</span>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Output Root:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2" style="word-break: break-all; font-family: monospace;">
                        {{ output.outputRoot }}
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="output.l2BlockNumber" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L2 Block:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <HashLink :type="'block'" :hash="output.l2BlockNumber" />
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L1 Transaction Hash:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <a class="text-decoration-none" :href="l1TransactionUrl" target="_blank">
                            {{ output.l1TransactionHash }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L1 Block Number:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <a class="text-decoration-none" :href="l1BlockUrl" target="_blank">
                            {{ output.l1BlockNumber.toLocaleString() }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Proposer:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <HashLink :type="'address'" :hash="output.proposer" :withTokenName="true" />
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="output.disputeGameAddress" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Dispute Game:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <a class="text-decoration-none" :href="disputeGameUrl" target="_blank">
                            {{ output.disputeGameAddress }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="output.gameType !== null && output.gameType !== undefined" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Game Type:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <v-chip size="small" color="secondary">
                            {{ gameTypeLabels[output.gameType] || `Type ${output.gameType}` }}
                        </v-chip>
                    </v-list-item-title>
                </v-list-item>

            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';

const props = defineProps({
    output: {
        type: Object,
        required: true
    }
});

const $dt = inject('$dt');

const statusColors = {
    proposed: 'info',
    challenged: 'warning',
    resolved: 'primary',
    finalized: 'success'
};

const statusLabels = {
    proposed: 'Proposed',
    challenged: 'Challenged',
    resolved: 'Resolved',
    finalized: 'Finalized'
};

const gameTypeLabels = {
    0: 'Cannon',
    1: 'Permissioned Cannon',
    2: 'Asterisc',
    255: 'Alphabet'
};

const parentChainExplorer = computed(() => {
    return props.output.parentChainExplorer || 'https://eth.blockscout.com';
});

const l1TransactionUrl = computed(() => {
    return `${parentChainExplorer.value}/tx/${props.output.l1TransactionHash}`;
});

const l1BlockUrl = computed(() => {
    return `${parentChainExplorer.value}/block/${props.output.l1BlockNumber}`;
});

const disputeGameUrl = computed(() => {
    if (!props.output.disputeGameAddress) return '';
    return `${parentChainExplorer.value}/address/${props.output.disputeGameAddress}`;
});
</script>
