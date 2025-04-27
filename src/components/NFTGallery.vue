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
            :contractAddress="nft.token || nft.contractAddress" 
            :tokenIndex="Number(nft.tokenId || nft.tokenTransfer?.tokenId)"
            :mode="mode"
            :key="`${nft.token || nft.contractAddress}-${nft.tokenId || nft.tokenTransfer?.tokenId}`" 
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
import { ref, computed, watch, inject, onMounted } from 'vue';
import ERC721TokenCard from './ERC721TokenCard.vue';

// Inject server instance
const $server = inject('$server');

// Props
const props = defineProps({
  address: {
    type: String,
    required: true
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
const loading = ref(true);
const nfts = ref([]);
const page = ref(1);
const contract = ref(null);

// Computed properties
const totalPages = computed(() => {
  return Math.ceil(nfts.value.length / ITEMS_PER_PAGE);
});

const displayedNFTs = computed(() => {
  const start = (page.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return nfts.value.slice(start, end);
});

const emptyMessage = computed(() => {
  if (props.mode === 'collection') {
    return 'There are no tokens in this collection, or the contract is missing the totalSupply() method.';
  }
  return 'No NFTs found';
});

// Methods
const loadCollectionTokens = async () => {
  try {
    // First get the contract details
    const { data: contractData } = await $server.getContract(props.address);
    if (!contractData) {
      nfts.value = [];
      return;
    }
    contract.value = contractData;

    // Then get the total supply
    const { data: { totalSupply } } = await $server.getErc721TotalSupply(props.address);
    if (totalSupply) {
      nfts.value = Array.from({ length: totalSupply }, (_, i) => ({
        tokenId: i.toString(),
        contractAddress: props.address,
        tokenContract: contract.value
      }));
    } else {
      nfts.value = [];
    }
  } catch (error) {
    console.error('Error loading collection tokens:', error);
    nfts.value = [];
  }
};

const loadAddressTokens = async () => {
  try {
    const { data } = await $server.getTokenBalances(props.address, ['erc721', 'erc1155']);
    nfts.value = data || [];
  } catch (error) {
    console.error('Error loading address tokens:', error);
    nfts.value = [];
  }
};

const fetchNFTs = async () => {
  loading.value = true;
  try {
    if (props.mode === 'collection') {
      await loadCollectionTokens();
    } else {
      await loadAddressTokens();
    }
  } finally {
    loading.value = false;
  }
};

// Reset page when nfts change
watch(() => nfts.value, () => {
  page.value = 1;
});

// Watch for address changes
watch(() => props.address, () => {
  fetchNFTs();
});

// Lifecycle hooks
onMounted(() => {
  fetchNFTs();
});
</script>
