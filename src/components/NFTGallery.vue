<template>
  <div>
    <v-row v-if="loading">
      <v-col class="d-flex justify-center align-center pa-4">
        <div class="d-flex flex-column align-center justify-center fill-height">
          <span class="text-caption text-medium-emphasis">Loading NFTs...</span>
          <v-progress-circular
              indeterminate
              color="primary"
              class="mt-2"
              size="32"
          ></v-progress-circular>
        </div>
      </v-col>
    </v-row>

    <v-row v-else-if="nfts.length === 0">
      <v-col cols="12">
        <div class="text-center py-6">
          <p class="text-medium-emphasis">{{ emptyMessage }}</p>
        </div>
      </v-col>
    </v-row>

    <template v-else>
      <v-row>
        <v-col v-for="(nft, idx) in displayedNFTs" :key="idx" cols="6" sm="4" md="2">
          <ERC721TokenCard 
            :contract="nft.tokenContract || nft.contract" 
            :contractAddress="nft.token || contractAddress" 
            :tokenIndex="parseInt(nft.tokenId || nft.tokenTransfer?.tokenId)"
            :mode="mode"
            :key="`${nft.token || contractAddress}-${nft.tokenId || nft.tokenTransfer?.tokenId}`" 
          />
        </v-col>
      </v-row>

      <div class="d-flex justify-center mt-4" v-if="totalPages > 1">
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="5"
          density="comfortable"
          color="primary"
          active-color="primary"
          border
        >
        </v-pagination>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import ERC721TokenCard from './ERC721TokenCard.vue';

// Props
const props = defineProps({
  nfts: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  contractAddress: {
    type: String,
    default: null
  },
  emptyMessage: {
    type: String,
    default: 'No NFTs found'
  },
  mode: {
    type: String,
    default: 'address',
    validator: (value) => ['address', 'collection'].includes(value)
  }
});

// Constants
const ITEMS_PER_PAGE = 12; // 2 rows of 6

// Reactive state
const page = ref(1);

// Computed properties
const totalPages = computed(() => {
  return Math.ceil(props.nfts.length / ITEMS_PER_PAGE);
});

const displayedNFTs = computed(() => {
  const start = (page.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return props.nfts.slice(start, end);
});

// Reset page when nfts change
watch(() => props.nfts, () => {
  page.value = 1;
});
</script>
