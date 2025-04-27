<template>
  <div class="receipt-tab-content">
    <v-card variant="outlined">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold">Transaction Receipt</v-card-title>
      </v-card-item>
      <v-card-text class="pa-0">
        <v-list density="compact">
          <template v-for="(value, key) in formattedReceipt" :key="key">
            <v-list-item>
              <template v-slot:prepend>
                <div class="text-subtitle-2 font-weight-medium text-grey-darken-1" style="width: 220px;">
                  {{ formatKey(key) }}:
                </div>
              </template>
              <v-list-item-title class="text-body-2">
                {{ formatValue(value) }}
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import * as ethers from 'ethers';

const props = defineProps({
  receipt: {
    type: Object,
    required: true
  }
});

// Format receipt for display
const formattedReceipt = computed(() => {
  if (!props.receipt) return {};
  
  // Filter out some properties we don't want to display
  const { logs, ...filteredReceipt } = props.receipt;
  
  return filteredReceipt;
});

// Helper function to format keys
const formatKey = (key) => {
  // Convert camelCase to Title Case with spaces
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

// Helper function to format values
const formatValue = (value) => {
  if (value === null || value === undefined) return '-';
  
  // Check if it's a BigNumber or can be parsed as one
  try {
    if (typeof value === 'string' && value.startsWith('0x')) {
      if (value.length > 42) return value; // Full hex string
      const num = ethers.BigNumber.from(value);
      return num.toString();
    }
  } catch (e) {
    // Not a BigNumber, continue with other formatting
  }
  
  // Format boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Format numbers with commas
  if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value))) {
    return Number(value).toLocaleString();
  }
  
  return value.toString();
};
</script>

<style scoped>
.receipt-tab-content :deep(.v-list-item) {
  min-height: 48px;
  padding-top: 8px;
  padding-bottom: 8px;
}
</style> 