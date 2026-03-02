<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">L2 to L1 Message Relayer</h2>
        <v-divider class="my-4"></v-divider>
        <v-card class="mb-4">
            <v-card-text>
                <span class="text-body-2">L2 to L1 message relayer: search for your L2 transaction to execute a manual withdrawal.</span>
                <v-form :style="{ width: '55%' }" @submit.prevent="getWithdrawal" class="d-flex mt-4">
                    <v-text-field
                        prepend-inner-icon="mdi-magnify"
                        placeholder="0x..."
                        hide-details
                        density="compact"
                        v-model="hash"
                        @update:focused="getWithdrawal"
                        label="L2 Transaction Hash"
                        clearable>
                        <template v-slot:clear>
                            <v-icon size="small" @click="clearInput()">mdi-close</v-icon>
                        </template>
                    </v-text-field>
                </v-form>
            </v-card-text>
        </v-card>

        <template v-if="loading">
            <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
            <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
        </template>
        <v-card v-else>
            <v-card-text>
                <v-alert v-if="successMessage" density="compact" variant="tonal" type="success" :text="successMessage"></v-alert>
                <v-alert v-if="errorMessage" density="compact" variant="tonal" type="error">
                    <template v-slot:text>
                        <span v-html="errorMessage"></span>
                    </template>
                </v-alert>
                <v-data-table
                    :headers="headers"
                    :items="withdrawals"
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 50, title: '50' }
                    ]"
                    :total-items="count"
                    :loading="loading">
                    <template v-slot:item.messageNumber="{ item }">
                        {{ item.messageNumber.toLocaleString() }}
                    </template>

                    <template v-slot:item.to="{ item }">
                        <HashLink type="address" :hash="item.to" :fullHash="true" />
                    </template>

                    <template v-slot:item.token="{ item }">
                        {{ $fromWei(item.amount, item.tokenDecimals || 18, item.tokenSymbol || explorer.token, false, 4) }}
                        <a v-if="item.l1TokenAddress" :href="`${currentWorkspace.orbitConfig.parentChainExplorer}/token/${item.l1TokenAddress}`" target="_blank">
                            <v-icon size="x-small">mdi-open-in-new</v-icon>
                        </a>
                    </template>

                    <template v-slot:item.status="{ item }">
                        <OrbitWithdrawalClaimButton v-if="item.status == 'ready'" @success="onClaimSuccess" @error="onClaimError" :hash="hash" :messageNumber="item.messageNumber" />
                        <v-chip v-else :color="statusColors[item.status]">
                            {{ statusLabels[item.status] }}
                        </v-chip>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script setup>
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useExplorerStore } from '@/stores/explorer';
import HashLink from './HashLink.vue';
import OrbitWithdrawalClaimButton from './OrbitWithdrawalClaimButton.vue';

const route = useRoute();

const currentWorkspace = useCurrentWorkspaceStore();
const explorer = useExplorerStore();

const router = useRouter();
const hash = ref(route.query.search || route.query.q || '');

const headers = ref([
    { title: 'Message Number', key: 'messageNumber', sortable: true },
    { title: 'Receiver', key: 'to', sortable: false },
    { title: 'Token', key: 'token', sortable: false },
    { title: 'Status', key: 'status', sortable: false }
]);

const $server = inject('$server');
const $fromWei = inject('$fromWei');

const withdrawals = ref([]);
const count = ref(0);
const loading = ref(false);
const successMessage = ref(null);
const errorMessage = ref(null);

const statusLabels = {
    waiting: 'Waiting',
    relayed: 'Relayed',
    failed: 'Failed'
};

const statusColors = {
    waiting: 'warning',
    relayed: 'success',
    failed: 'error'
};

function onClaimSuccess(hash) {
    successMessage.value = `Withdrawal succesfully claimed. Status will update in a few seconds once we are finished indexing everything. You can view your claim transaction <a href="${currentWorkspace.orbitConfig.parentChainExplorer}/tx/${hash}" target="_blank">here</a>.`;
};

function onClaimError(error) {
    errorMessage.value = `Error while claiming withdrawal: ${error}`;
};

function getWithdrawal() {
    loading.value = true;

    if (!hash.value || hash.value.length !== 66)
        return loading.value = false;

    if (!route.query.search)
        router.push({ query: { search: hash.value } });

    $server.getL2TransactionWithdrawals(hash.value)
        .then(({ data: { items, total } }) => {
            withdrawals.value = items;
            count.value = total;
        })
        .catch(err => console.error(err))
        .finally(() => loading.value = false);
};

function clearInput() {
    hash.value = '';
    withdrawals.value = [];
    count.value = 0;
    router.push({ query: {} });
}

onMounted(() => {
    getWithdrawal();
});
</script>
