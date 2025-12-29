<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <h2 class="text-h6 font-weight-medium">State Output #{{ outputIndex }}</h2>
                <v-divider class="my-4"></v-divider>
            </v-col>
        </v-row>

        <v-row v-if="loading">
            <v-col cols="12" class="text-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </v-col>
        </v-row>

        <v-row v-else-if="output">
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-title>Output Information</v-card-title>
                    <v-card-text>
                        <v-table density="compact">
                            <tbody>
                                <tr>
                                    <td class="font-weight-medium">Output Index</td>
                                    <td>#{{ output.outputIndex.toLocaleString() }}</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Output Root</td>
                                    <td style="font-family: monospace; word-break: break-all;">{{ output.outputRoot }}</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L2 Block</td>
                                    <td v-if="output.l2BlockNumber">
                                        <HashLink :type="'block'" :hash="output.l2BlockNumber" />
                                    </td>
                                    <td v-else class="text-medium-emphasis">-</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L1 Block</td>
                                    <td>{{ output.l1BlockNumber.toLocaleString() }}</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">L1 Transaction</td>
                                    <td style="font-family: monospace;">
                                        {{ output.l1TransactionHash ? `${output.l1TransactionHash.slice(0, 20)}...${output.l1TransactionHash.slice(-16)}` : '-' }}
                                    </td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Proposer</td>
                                    <td>
                                        <HashLink :type="'address'" :hash="output.proposer" :withTokenName="true" />
                                    </td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Proposed At</td>
                                    <td>{{ $dt.shortDate(output.timestamp) }} ({{ $dt.fromNow(output.timestamp) }})</td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Challenge Period Ends</td>
                                    <td>
                                        {{ $dt.shortDate(output.challengePeriodEnds) }}
                                        <span v-if="new Date(output.challengePeriodEnds) > new Date()" class="text-warning">
                                            ({{ $dt.fromNow(output.challengePeriodEnds) }})
                                        </span>
                                        <span v-else class="text-success">(Ended)</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="font-weight-medium">Status</td>
                                    <td>
                                        <v-chip :color="statusColors[output.status]">
                                            {{ statusLabels[output.status] }}
                                        </v-chip>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="6" v-if="output.disputeGameAddress">
                <v-card>
                    <v-card-title>Dispute Game</v-card-title>
                    <v-card-text>
                        <v-table density="compact">
                            <tbody>
                                <tr>
                                    <td class="font-weight-medium">Game Address</td>
                                    <td>
                                        <HashLink :type="'address'" :hash="output.disputeGameAddress" />
                                    </td>
                                </tr>
                                <tr v-if="output.gameType !== null">
                                    <td class="font-weight-medium">Game Type</td>
                                    <td>{{ output.gameType }}</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';

const props = defineProps({
    outputIndex: {
        type: [String, Number],
        required: true
    }
});

const $server = inject('$server');
const $dt = inject('$dt');

const loading = ref(true);
const output = ref(null);

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

async function loadOutput() {
    loading.value = true;
    try {
        const { data } = await $server.getOpOutputDetail(props.outputIndex);
        output.value = data;
    } catch (error) {
        console.error('Error loading output:', error);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    loadOutput();
});
</script>
