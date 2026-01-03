<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">
            Batch <span class="text-grey-darken-1">#{{ $route.params.batchIndex }}</span>
        </h2>
        <v-divider class="my-4"></v-divider>

        <template v-if="loading">
            <v-card>
                <v-card-text>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-card-text>
            </v-card>
        </template>
        <template v-else-if="batch && !loading">
            <BaseChipGroup v-model="selectedTab" mandatory>
                <v-chip label size="small" value="overview">Overview</v-chip>
                <v-chip label size="small" value="blocks">Blocks</v-chip>
                <v-chip label size="small" value="transactions">Transactions</v-chip>
            </BaseChipGroup>

            <OpBatchOverview
                v-if="selectedTab === 'overview'"
                :batch="batch"
            />

            <OpBatchBlocks
                v-if="selectedTab === 'blocks'"
                :batchIndex="Number(batch.batchIndex)"
            />

            <OpBatchTransactions
                v-if="selectedTab === 'transactions'"
                :batchIndex="Number(batch.batchIndex)"
            />
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <p>Couldn't find batch #{{ $route.params.batchIndex }}</p>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseChipGroup from './base/BaseChipGroup.vue';
import OpBatchOverview from './OpBatchOverview.vue';
import OpBatchBlocks from './OpBatchBlocks.vue';
import OpBatchTransactions from './OpBatchTransactions.vue';

const props = defineProps({
    batchIndex: {
        type: [String, Number],
        required: true
    }
});

const $server = inject('$server');
const router = useRouter();

const selectedTab = ref('overview');

// Reactive data
const loading = ref(false);
const batch = ref(null);
const error = ref(null);

// Methods
function loadBatch() {
    loading.value = true;
    error.value = null;

    $server.getOpBatchDetail(props.batchIndex)
        .then(response => batch.value = response.data)
        .catch(console.log)
        .finally(() => loading.value = false);
}

const checkUrlHash = () => {
    if (window.location.hash === '#blocks') {
        selectedTab.value = 'blocks';
    } else if (window.location.hash === '#transactions') {
        selectedTab.value = 'transactions';
    } else {
        selectedTab.value = 'overview';
    }
};

// Watch with optimization
watch(() => props.batchIndex, (batchIndex) => {
    // Reset state when hash changes
    if (batchIndex !== props.batchIndex) {
        batch.value = null;
    }

    loadBatch(batchIndex);
}, { immediate: true });

watch(() => selectedTab.value, (newTab) => {
    const currentPath = router.currentRoute.value.fullPath.split('#')[0];
    let hash = '';

    if (newTab === 'blocks') {
        hash = '#blocks';
    } else if (newTab === 'transactions') {
        hash = '#transactions';
    }

    router.replace(currentPath + hash);
});

onMounted(() => {
    checkUrlHash();
    router.afterEach(() => {
        checkUrlHash();
    });
});
</script>
