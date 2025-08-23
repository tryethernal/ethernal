<template>
    <v-card>
        <v-card-text class="pa-0">
            <v-list density="compact" class="transaction-list">

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Batch Index:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ Number(batch.batchSequenceNumber).toLocaleString() }}
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Status:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <v-chip :color="l1StatusColors[batch.confirmationStatus]" size="small">
                            {{ l1StatusLabels[batch.confirmationStatus] }}
                        </v-chip>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L1 Timestamp:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ `${$dt.shortDate(batch.postedAt)}` }}<span class="text-medium-emphasis"> ({{ $dt.fromNow(batch.postedAt) }})</span>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Batch Size:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <router-link to="#transactions" class="text-decoration-none">
                            {{ batch.transactionCount.toLocaleString() }} transactions
                        </router-link>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Blocks:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <router-link to="#blocks" class="text-decoration-none">
                            {{ batch.blockCount.toLocaleString() }} blocks
                        </router-link>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L1 Transaction Hash:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <a class="text-decoration-none" :href="`${currentWorkspaceStore.parentChainExplorer}/tx/${batch.parentChainTxHash}`" target="_blank">
                            {{ batch.parentChainTxHash }}
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
                        <a class="text-decoration-none" :href="`${currentWorkspaceStore.parentChainExplorer}/block/${batch.parentChainBlockNumber}`" target="_blank">
                            {{ batch.parentChainBlockNumber.toLocaleString() }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Before Acc:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ batch.beforeAcc.slice(2).toUpperCase() }}
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            After Acc:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ batch.afterAcc.slice(2).toUpperCase() }}
                    </v-list-item-title>
                </v-list-item>

            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { inject } from 'vue';

import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';

const currentWorkspaceStore = useCurrentWorkspaceStore();

const l1StatusColors = {
    pending: 'warning',
    challenged: 'error',
    confirmed: 'success',
};

const l1StatusLabels = {
    pending: 'Unfinalized',
    challenged: 'Challenged',
    confirmed: 'Finalized'
};

const props = defineProps({
    batch: {
        type: Object,
        required: true
    }
});

const $dt = inject('$dt');
</script>