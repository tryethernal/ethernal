<template>
  <div class="embedded-transfers pa-0 rounded">
    <!-- Simple Sentence List -->
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
            <span class="mx-1 font-weight-medium">From</span>
            
            <span class="font-weight-medium">
              <Hash-Link
                :type="'address'"
                :hash="transfer.src"
                :withName="true"
                truncate="true"
              />
            </span>
            
            <span class="mx-1 font-weight-medium">To</span>
            
            <span class="font-weight-medium">
              <Hash-Link
                :type="'address'"
                :hash="transfer.dst"
                :withName="true"
                truncate="true"
              />
            </span>
            
            <span class="mx-1 font-weight-medium">For</span>
            
            <span>
              {{ $fromWei(transfer.amount, decimals[transfer.token], ' ', unformatted) }}
            </span>
            
            <span class="mx-1">
              <template v-if="transfer.contract.tokenName">
                <Hash-Link
                  :type="'address'"
                  :hash="transfer.token"
                  :contract="transfer.contract"
                  :notCopiable="true"
                  :withName="true"
                  truncate="true"
                />&nbsp;
                <span v-if="transfer.contract.tokenSymbol" class="text-medium-emphasis">({{ transfer.contract.tokenSymbol }})</span>
              </template>
              <template v-else>
                (<Hash-Link
                  :type="'address'"
                  :hash="transfer.token"
                  :withName="true"
                  :contract="transfer.contract"
                  :notCopiable="!!transfer.contract.name"
                  truncate="true"
                />)
              </template>
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
    
    <!-- Loading State -->
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
    
    <!-- Empty State -->
    <div v-else class="empty-state pa-4 text-center">
      <v-icon color="grey-lighten-1" size="24" class="mb-2">mdi-swap-horizontal-off</v-icon>
      <div class="text-body-2 text-grey-darken-1">No token transfers found for this transaction</div>
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

// Optimized computed property
const displayedTransfers = computed(() => props.transfers || []);

function onPageChange(page) {
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
.embedded-transfers {
  width: 100%;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background-color: rgba(var(--v-theme-surface), 1);
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

.transfers-list {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
}

.empty-state, .loading-state {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
