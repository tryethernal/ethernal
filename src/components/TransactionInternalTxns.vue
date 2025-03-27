<template>
  <div class="internal-txns-tab-content">
    <!-- Trace Card -->
    <v-card class="pb-2">
      <v-card-text>
        <template v-if="loading">
          <div class="d-flex align-center justify-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>
        </template>
        <template v-else-if="error">
          <div class="d-flex align-center justify-center py-8">
            <v-icon size="large" color="error" class="mr-4">mdi-alert-circle-outline</v-icon>
            <span class="text-body-1 text-error">
              {{ error }}
            </span>
          </div>
        </template>
        <template v-else-if="traceSteps && traceSteps.length">
          <Trace-Step v-for="step in traceSteps" :step="step" :key="step.id" />
        </template>
        <template v-else>
          <div class="d-flex align-center justify-center py-8">
            <v-icon size="large" color="grey-lighten-1" class="mr-4">mdi-information-outline</v-icon>
            <span class="text-body-1">
              No internal transactions found for this transaction.
            </span>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, onErrorCaptured } from 'vue';
import TraceStep from './TraceStep.vue';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

// Define emits
const emit = defineEmits(['error']);

// Inject server instance
const $server = inject('$server');

// State management
const loading = ref(false);
const error = ref(null);
const cachedTraceSteps = ref(null);

// Error handling
onErrorCaptured((err) => {
  console.error('Transaction internal txns error:', err);
  error.value = 'Failed to load internal transactions. Please try again later.';
  emit('error', err);
  return false; // prevent error propagation
});

// Fetch trace steps
const fetchTraceSteps = async () => {
  if (!props.transaction?.hash) return;
  
  // Return cached data if available
  if (cachedTraceSteps.value) {
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { data } = await $server.getTransactionTraceSteps(props.transaction.hash);
    cachedTraceSteps.value = data;
  } catch (err) {
    console.error('Error fetching trace steps:', err);
    error.value = 'Failed to load internal transactions. Please try again later.';
    emit('error', err);
  } finally {
    loading.value = false;
  }
};

// Computed property to get trace steps
const traceSteps = computed(() => {
  return cachedTraceSteps.value || props.transaction?.traceSteps || [];
});

// Fetch data on mount
onMounted(() => {
  fetchTraceSteps();
});
</script>

<style scoped>
.internal-txns-tab-content {
  /* Any specific styling needed */
}
</style> 