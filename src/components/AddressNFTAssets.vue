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
          <p class="text-medium-emphasis">No NFTs found</p>
        </div>
      </v-col>
    </v-row>

    <template v-else>
      <v-row>
        <v-col v-for="(nft, idx) in displayedNFTs" :key="idx" cols="6" sm="4" md="2">
          <ERC721TokenCard :contract="nft.tokenContract" :contractAddress="nft.token" :tokenIndex="parseInt(nft.tokenTransfer.tokenId)" :key="`${nft.token}-${nft.tokenTransfer.tokenId}`" />
        </v-col>
      </v-row>

      <div class="d-flex justify-center mt-4">
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="7"
          density="compact"
          color="primary"
          active-color="primary"
          border
        ></v-pagination>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue';
import ERC721TokenCard from './ERC721TokenCard.vue';
// Props
const props = defineProps({
  address: {
    type: String,
    required: true
  }
});

// Injected services
const server = inject('$server');

// Constants
const ITEMS_PER_PAGE = 12; // 2 rows of 6

// Reactive state
const loading = ref(true);
const nfts = ref([]);
const page = ref(1);

// Computed properties
const totalPages = computed(() => {
  return Math.ceil(nfts.value.length / ITEMS_PER_PAGE);
});

const displayedNFTs = computed(() => {
  const start = (page.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return nfts.value.slice(start, end);
});

// Methods
const fetchNFTs = async () => {
  try {
    loading.value = true;
    server.getTokenBalances(props.address, ['erc721', 'erc1155'])
      .then(({ data }) => nfts.value = data)
      .catch(error => console.error('Error fetching NFT balances:', error));
    page.value = 1;
  } catch (error) {
    console.error('Error fetching NFT balances:', error);
  } finally {
    loading.value = false;
  }
};

// Watchers
watch(() => props.address, (newAddress) => {
  if (newAddress) {
    fetchNFTs();
  }
});

// Lifecycle hooks
onMounted(() => {
  fetchNFTs();
});
</script> 