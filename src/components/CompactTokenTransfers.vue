<template>
  <div class="token-transfers-container">
    <!-- Standard Card View (Non-embedded) -->
    <v-card v-if="!embedded" class="token-transfers-compact" variant="outlined">
      <v-card-item>
        <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-swap-horizontal</v-icon>
          Token Transfers
        </v-card-title>
      </v-card-item>
      <v-divider></v-divider>
      <v-card-text>
        <!-- Controls -->
        <div class="d-flex align-center justify-end mb-2">
          <v-switch 
            hide-details 
            density="compact"
            color="primary"
            v-model="unformatted" 
            label="Unformatted"
            class="mr-2"
          ></v-switch>
          <v-btn
            density="comfortable"
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-refresh"
            @click="$emit('refresh')"
            :loading="loading"
            class="mr-2"
          >
            Refresh
          </v-btn>
        </div>
        
        <!-- Simple Sentence List -->
        <v-list class="pa-0">
          <v-list-item
            v-for="(transfer, index) in displayedTransfers"
            :key="transfer.id || index"
            class="transfer-item py-2"
            :class="index % 2 === 0 ? 'bg-surface-variant-subtle' : ''"
            density="compact"
          >
            <div class="d-flex align-center">
              <!-- Transfer Sentence -->
              <div class="transfer-sentence">
                <span class="mx-1">From</span>
                
                <span class="font-weight-medium">
                  <Hash-Link
                    :type="'address'"
                    :hash="transfer.src"
                    :withName="true"
                    truncate="true"
                  />
                </span>
                
                <span class="mx-1">To</span>
                
                <span class="font-weight-medium">
                  <Hash-Link
                    :type="'address'"
                    :hash="transfer.dst"
                    :withName="true"
                    truncate="true"
                  />
                </span>
                
                <span class="mx-1">For</span>
                
                <span :class="getAmountClass(transfer)" class="font-weight-medium">
                  {{ $fromWei(transfer.amount, decimals[transfer.token], symbols[transfer.token], unformatted) }}
                </span>
                
                <v-tooltip location="end">
                  <template v-slot:activator="{ props }">
                    <v-chip
                      size="x-small"
                      :color="getTokenTypeColor(transfer.token)"
                      variant="flat"
                      class="ml-2"
                      v-bind="props"
                    >
                      {{ formatContractPattern(typeCache[transfer.token] || 'Token') }}
                    </v-chip>
                  </template>
                  <div class="pa-2">
                    <div class="mb-1">Token: 
                      <span class="font-weight-medium">
                        {{ transfer.contract ? transfer.contract.name || transfer.token : transfer.token }}
                      </span>
                    </div>
                    <div class="text-caption">{{ transfer.token }}</div>
                  </div>
                </v-tooltip>
              </div>
            </div>
          </v-list-item>
        </v-list>
        
        <!-- Empty State -->
        <v-alert
          v-if="displayedTransfers.length === 0 && !loading"
          type="info"
          variant="tonal"
          icon="mdi-information-outline"
          class="ma-2"
          density="compact"
        >
          No token transfers found for this transaction
        </v-alert>
        
        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center align-center pa-4">
          <v-progress-circular
            indeterminate
            color="primary"
            class="mr-3"
            size="24"
          ></v-progress-circular>
          <span>Loading token transfers...</span>
        </div>
        
        <!-- Pagination -->
        <div v-if="count > 0 && Math.ceil(count / itemsPerPage) > 1" class="text-center mt-4">
          <v-pagination
            v-model="currentPage"
            :length="Math.max(1, Math.ceil(count / itemsPerPage))"
            :total-visible="5"
            density="compact"
            color="primary"
            active-color="primary"
            border
            size="small"
            @update:model-value="onPageChange"
          />
        </div>
      </v-card-text>
    </v-card>
    
    <!-- Embedded View -->
    <div v-else class="embedded-transfers pa-0 rounded">
      <!-- Simple Sentence List - Embedded Version -->
      <div v-if="displayedTransfers.length > 0 && !loading" class="transfers-list">
        <div 
          v-for="(transfer, index) in displayedTransfers"
          :key="transfer.id || index"
          class="embedded-transfer-item py-2 px-0 rounded-sm"
          :class="{'border-bottom': index < displayedTransfers.length - 1}"
        >
          <div class="d-flex align-center">
            <!-- Transfer Sentence -->
            <span class="transfer-sentence text-body-2">
              <span class="mx-1 text-grey-darken-1">From</span>
              
              <span class="font-weight-medium">
                <Hash-Link
                  :type="'address'"
                  :hash="transfer.src"
                  :withName="true"
                  truncate="true"
                />
              </span>
              
              <span class="mx-1 text-grey-darken-1">To</span>
              
              <span class="font-weight-medium">
                <Hash-Link
                  :type="'address'"
                  :hash="transfer.dst"
                  :withName="true"
                  truncate="true"
                />
              </span>
              
              <span class="mx-1 text-grey-darken-1">For</span>
              
              <span :class="getAmountClass(transfer)" class="font-weight-medium">
                {{ $fromWei(transfer.amount, decimals[transfer.token], symbols[transfer.token], unformatted) }}
              </span>
            </span>
          </div>
        </div>
        
        <!-- Pagination -->
        <div v-if="count > 0 && Math.ceil(count / itemsPerPage) > 1" class="text-center mt-4">
          <v-pagination
            v-model="currentPage"
            :length="Math.max(1, Math.ceil(count / itemsPerPage))"
            :total-visible="5"
            density="compact"
            color="primary"
            active-color="primary"
            border
            size="small"
            @update:model-value="onPageChange"
          />
        </div>
      </div>
      
      <!-- Loading State - Embedded Version -->
      <div v-else-if="loading" class="loading-state d-flex justify-center align-center pa-4">
        <v-progress-circular
          indeterminate
          color="primary"
          class="mr-2"
          size="16"
          width="2"
        ></v-progress-circular>
        <span class="text-caption">Loading token transfers...</span>
      </div>
      
      <!-- Empty State - Embedded Version -->
      <div v-else class="empty-state pa-4 text-center">
        <v-icon color="grey-lighten-1" size="24" class="mb-2">mdi-swap-horizontal-off</v-icon>
        <div class="text-body-2 text-grey-darken-1">No token transfers found for this transaction</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import HashLink from './HashLink.vue';
import { formatContractPattern } from '@/lib/utils';

const props = defineProps({
  transfers: Array,
  headers: Array, 
  loading: Boolean, 
  sortBy: Array, 
  count: Number, 
  address: String,
  showAll: {
    type: Boolean,
    default: false
  },
  embedded: {
    type: Boolean,
    default: false
  },
  itemsPerPage: {
    type: Number,
    default: 5
  }
});

const emit = defineEmits(['view-all', 'refresh', 'pagination', 'update:options']);

// Reactive state
const unformatted = ref(false);
const decimals = ref({});
const symbols = ref({});
const typeCache = ref({});
const currentPage = ref(1);
const maxEmbeddedItems = ref(5);

// Memoize contract type colors
const typeColors = {
  'erc20': 'success',
  'erc721': 'info',
  'default': 'grey'
};

// Optimized computed property
const displayedTransfers = computed(() => props.transfers || []);

// Methods
function onPagination(page) {
  if (currentPage.value === page) return;
  currentPage.value = page;
  console.log(`Pagination changed to page ${page}, emitting event`);
  emit('pagination', { page, itemsPerPage: props.itemsPerPage, sortBy: props.sortBy });
}

function onPageChange(page) {
  console.log(`Page changed to ${page}`);
  // Update local page state
  currentPage.value = page;
  // Emit pagination event to parent
  emit('pagination', { 
    page, 
    itemsPerPage: props.itemsPerPage, 
    sortBy: props.sortBy 
  });
}

function loadContractData() {
  if (!props.transfers || !props.transfers.length) return;

  // Process only transfers that haven't been processed yet
  const newDecimals = { ...decimals.value };
  const newSymbols = { ...symbols.value };
  const newTypeCache = { ...typeCache.value };
  
  let hasChanges = false;

  props.transfers.forEach(transfer => {
    if (!transfer.contract || !transfer.token) return;
    const token = transfer.token;
    
    // Only process if we don't have this data yet
    if (newDecimals[token] === undefined) {
      newDecimals[token] = transfer.contract.tokenDecimals || 0;
      hasChanges = true;
    }
    
    if (newSymbols[token] === undefined) {
      newSymbols[token] = transfer.contract.tokenSymbol || '';
      hasChanges = true;
    }
    
    if (newTypeCache[token] === undefined && transfer.contract.patterns) {
      if (transfer.contract.patterns.includes('erc20')) {
        newTypeCache[token] = 'erc20';
      } else if (transfer.contract.patterns.includes('erc721')) {
        newTypeCache[token] = 'erc721';
      } else {
        newTypeCache[token] = 'token';
      }
      hasChanges = true;
    }
  });
  
  // Only update reactive state if we have changes
  if (hasChanges) {
    decimals.value = newDecimals;
    symbols.value = newSymbols;
    typeCache.value = newTypeCache;
  }
}

// Optimized helpers
function getTokenTypeColor(token) {
  return typeColors[typeCache.value[token]] || typeColors.default;
}

function getAmountClass() {
  return 'font-weight-medium';
}

// Watch with optimizations
watch(() => props.transfers, (newTransfers, oldTransfers) => {
  if (!newTransfers || !newTransfers.length) return;
  
  // Check if we have new transfers that need processing
  const needsUpdate = !oldTransfers || 
    newTransfers.some(transfer => 
      !decimals.value[transfer.token] || 
      !symbols.value[transfer.token] || 
      !typeCache.value[transfer.token]
    );
  
  if (needsUpdate) {
    loadContractData();
  }
}, { deep: false });

// Initial setup
onMounted(() => {
  loadContractData();
});
</script>

<style>
.bg-surface-variant-subtle {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}
.transfer-item {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}
.transfer-sentence {
  line-height: 1.5;
  word-break: break-word;
}

/* Embedded View Styles */
.embedded-transfers {
  width: 100%;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background-color: rgba(var(--v-theme-surface), 1);
}

.token-transfers-header {
  width: 100%;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-bottom: 4px;
}

.embedded-transfer-item {
  margin-bottom: 0;
  transition: background-color 0.2s ease;
}

.embedded-transfer-item:hover {
  background-color: transparent !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.03);
}

.transfer-sentence {
  flex: 1;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}

.transfer-type-chip {
  min-width: 60px;
  text-align: center;
}

.transfers-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.compact-amount {
  max-width: 120px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.empty-state, .loading-state {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
