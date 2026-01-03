<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">
            State Output <span class="text-grey-darken-1">#{{ $route.params.outputIndex }}</span>
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
        <template v-else-if="output && !loading">
            <BaseChipGroup v-model="selectedTab" mandatory>
                <v-chip label size="small" value="overview">Overview</v-chip>
            </BaseChipGroup>

            <OpOutputOverview
                v-if="selectedTab === 'overview'"
                :output="output"
            />
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <p>Couldn't find state output #{{ $route.params.outputIndex }}</p>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script setup>
import { ref, onMounted, inject, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseChipGroup from './base/BaseChipGroup.vue';
import OpOutputOverview from './OpOutputOverview.vue';

const props = defineProps({
    outputIndex: {
        type: [String, Number],
        required: true
    }
});

const $server = inject('$server');
const router = useRouter();

const selectedTab = ref('overview');

// Reactive data
const loading = ref(false);
const output = ref(null);
const error = ref(null);

// Methods
function loadOutput() {
    loading.value = true;
    error.value = null;

    $server.getOpOutputDetail(props.outputIndex)
        .then(response => output.value = response.data)
        .catch(console.log)
        .finally(() => loading.value = false);
}

// Watch with optimization
watch(() => props.outputIndex, (outputIndex) => {
    // Reset state when index changes
    if (outputIndex !== props.outputIndex) {
        output.value = null;
    }

    loadOutput(outputIndex);
}, { immediate: true });

onMounted(() => {
    // Future: could add hash-based tab switching if more tabs are added
});
</script>
