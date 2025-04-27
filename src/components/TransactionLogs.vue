<template>
  <div class="logs-tab-content">
    <!-- Emitted Events -->
    <div class="transaction-events">
      <template v-if="!transactionLogLoading">
        <div class="d-flex flex-column gap-2">
          <v-hover v-for="log in logs" :key="log.id" v-slot="{ isHovering, props }">
            <v-card
              v-bind="props"
              class="mb-3"
              :class="{ 'event-card-hover': isHovering }"
              :color="isHovering ? 'primary-lighten-5' : undefined"
              rounded="lg"
            >
              <v-card-text class="px-4 py-3">
                <Transaction-Event :log="log" />
              </v-card-text>
            </v-card>
          </v-hover>
        </div>
      </template>
      <v-card v-else variant="flat" bg-color="transparent" class="border-0">
        <v-card-text>
          <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
        </v-card-text>
      </v-card>
      <v-pagination v-if="logCount > 10"
        v-model="page"
        :length="pageCount"
        :total-visible="5"
        @update:model-value="pageChanged"
        class="mt-4 white-bg-pagination"
        color="primary"
        active-color="primary"
        border
        density="compact"
      ></v-pagination>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, inject, onMounted, computed } from 'vue';
import TransactionEvent from './TransactionEvent.vue';

const props = defineProps({
  hash: {
    type: String,
    required: true
  }
});

// Inject server
const $server = inject('$server');

// Reactive state
const page = ref(1);
const transactionLogLoading = ref(true);
const currentOptions = ref({ page: 1, itemsPerPage: 10 });
const logs = ref([]);
const logCount = ref(0);

// Computed properties
const pageCount = computed(() => Math.ceil(logCount.value / currentOptions.value.itemsPerPage));

// Methods
const loadTransactionLogs = async () => {
  if (!props.hash) return;
  
  transactionLogLoading.value = true;
  try {
    const { data: { logs: newLogs, count } } = await $server.getTransactionLogs(props.hash, currentOptions.value);
    logs.value = newLogs;
    logCount.value = count;
  } catch(error) {
    console.log(error);
  } finally {
    transactionLogLoading.value = false;
  }
};

const pageChanged = (newPage) => {
  if (currentOptions.value.page === newPage) return;
  currentOptions.value = { ...currentOptions.value, page: newPage };
  loadTransactionLogs();
};

// Optimize watch with debounce for transaction changes
let logsLoadTimeout = null;

// Load logs on component mount
onMounted(() => {
  loadTransactionLogs();
});

// Watch for hash changes to reload logs
watch(() => props.hash, (newHash) => {
  if (newHash) {
    clearTimeout(logsLoadTimeout);
    logsLoadTimeout = setTimeout(() => {
      page.value = 1;
      currentOptions.value.page = 1;
      loadTransactionLogs();
    }, 50);
  }
});

// Cleanup
watch(() => page.value, (newPage) => {
  pageChanged(newPage);
});

defineExpose({
  reloadLogs: loadTransactionLogs
});
</script>

<style scoped>
/* Minimal custom styling */
.event-card-hover {
  border-color: rgba(var(--v-theme-primary), 0.5) !important;
}

/* Make sure we maintain spacing at the top of the logs tab */
.logs-tab-content {
  margin-top: 0;
  position: relative;
  z-index: 1;
}

/* Force white background on pagination elements - highly specific */
:deep(.white-bg-pagination .v-pagination) * {
  background-color: white !important;
}

:deep(.white-bg-pagination .v-btn) {
  background-color: white !important;
}
</style>
