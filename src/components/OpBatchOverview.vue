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
                        {{ Number(batch.batchIndex).toLocaleString() }}
                    </v-list-item-title>
                </v-list-item>

                <v-list-item class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Status:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <v-chip :color="statusColors[batch.status]" size="small">
                            {{ statusLabels[batch.status] }}
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
                        {{ `${$dt.shortDate(batch.timestamp)}` }}<span class="text-medium-emphasis"> ({{ $dt.fromNow(batch.timestamp) }})</span>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="batch.txCount" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Batch Size:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <router-link to="#transactions" class="text-decoration-none">
                            {{ batch.txCount.toLocaleString() }} transactions
                        </router-link>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="batch.l2BlockStart !== null" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            L2 Block Range:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        {{ batch.l2BlockStart.toLocaleString() }} - {{ batch.l2BlockEnd.toLocaleString() }}
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
                            {{ batch.l1TransactionHash }}
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
                            {{ batch.l1BlockNumber.toLocaleString() }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="batch.dataContainer" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Data Container:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <v-chip size="small" :color="batch.dataContainer === 'in_blob4844' ? 'primary' : 'secondary'">
                            {{ dataContainerLabels[batch.dataContainer] }}
                        </v-chip>
                    </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="batch.blobHash" class="d-flex flex-column flex-sm-row">
                    <template v-slot:prepend>
                        <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 180px;">
                            Blob Hash:
                        </div>
                    </template>
                    <v-list-item-title class="text-body-2">
                        <a class="text-decoration-none" :href="blobViewerUrl" target="_blank">
                            {{ batch.blobHash }}
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </v-list-item-title>
                </v-list-item>

            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
    batch: {
        type: Object,
        required: true
    }
});

const $dt = inject('$dt');

const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    finalized: 'success'
};

const statusLabels = {
    pending: 'Unfinalized',
    confirmed: 'Confirmed',
    finalized: 'Finalized'
};

const dataContainerLabels = {
    in_blob4844: 'EIP-4844 Blob',
    in_calldata: 'Calldata'
};

const parentChainExplorer = computed(() => {
    return props.batch.parentChainExplorer || 'https://etherscan.io';
});

const l1TransactionUrl = computed(() => {
    return `${parentChainExplorer.value}/tx/${props.batch.l1TransactionHash}`;
});

const l1BlockUrl = computed(() => {
    return `${parentChainExplorer.value}/block/${props.batch.l1BlockNumber}`;
});

const blobViewerUrl = computed(() => {
    if (!props.batch.blobHash) return '';
    return `${parentChainExplorer.value}/blob/${props.batch.blobHash}`;
});
</script>
