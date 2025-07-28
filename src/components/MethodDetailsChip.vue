<template>
  <v-tooltip location="top" :open-delay="150" color="grey-darken-1" content-class="tooltip">
    <template v-slot:activator="{ props }">
      <v-chip color="primary" label v-bind="props" size="small" variant="tonal">
        <span class="methodName">{{ getMethodName(transaction) }}</span>
      </v-chip>
    </template>
    <span :style="{ whiteSpace: transaction.methodDetails?.name ? 'pre' : 'inherit' }">{{ getMethodLabel(transaction.methodDetails) || transaction.data }}</span>
  </v-tooltip>
</template>

<script setup>
const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

const getMethodName = (transaction) => {
  if (!transaction.methodDetails) return getSighash(transaction);
  return transaction.methodDetails.name ? transaction.methodDetails.name : getSighash(transaction);
};

const getMethodLabel = (methodDetails) => {
  if (!methodDetails) return null;
  return methodDetails.label ? methodDetails.label : null;
};

const getSighash = (transaction) => {
  return transaction.data && transaction.data != '0x' ? transaction.data.slice(0, 10) : null;
};
</script>

<style scoped>
.methodName {
  display: block;
  max-width: 11ch;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tooltip {
  opacity: 1!important;
}
</style>
