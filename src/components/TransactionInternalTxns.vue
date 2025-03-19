<template>
  <div class="internal-txns-tab-content">
    <!-- Trace Card -->
    <v-card class="pb-2">
      <v-card-text>
        <template v-if="traceSteps && traceSteps.length">
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
import { ref, computed, onErrorCaptured } from 'vue';
import TraceStep from './TraceStep.vue';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

// Define emits
const emit = defineEmits(['error']);

// Error handling
onErrorCaptured((error) => {
  console.error('Transaction internal txns error:', error);
  emit('error', error);
  return false; // prevent error propagation
});

// Computed property to extract trace steps
const traceSteps = computed(() => {
  return props.transaction?.traceSteps || [];
});
</script>

<style scoped>
.internal-txns-tab-content {
  /* Any specific styling needed */
}
</style> 