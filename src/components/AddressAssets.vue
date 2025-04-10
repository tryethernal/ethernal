<template>
  <div class="d-flex justify-end">
    <v-chip-group
      v-model="selectedFilter"
      :selected-class="`text-${contrastingColor}`"
      mandatory
  >
      <v-chip size="x-small" value="asset-tokens">Tokens</v-chip>
      <v-chip size="x-small" value="asset-nft">NFTs</v-chip>
    </v-chip-group>
  </div>

    <Address-Token-Assets
      v-if="selectedFilter === 'asset-tokens'"
      :address="address"
      :key="`tokens-${address}`"
    />
    <NFT-Gallery
      v-else-if="selectedFilter === 'asset-nft'"
      :address="address"
      mode="address"
      :key="`nfts-${address}`"
    />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '../lib/utils';
import AddressTokenAssets from './AddressTokenAssets.vue';
import NFTGallery from './NFTGallery.vue';

// Props
const props = defineProps({
  address: {
    type: String,
    required: true
  }
});

// Reactive state
const selectedFilter = ref('asset-tokens');

// Hash-based navigation
const updateFromHash = () => {
  const hash = window.location.hash.slice(1);
  if (hash === 'asset-nft') {
    selectedFilter.value = 'asset-nft';
  } else {
    selectedFilter.value = 'asset-tokens';
  }
};

// Watch for changes in selectedFilter to update hash
watch(selectedFilter, (newValue) => {
  const newHash = newValue === 'asset-nft' ? 'asset-nft' : 'asset-tokens';
  if (window.location.hash.slice(1) !== newHash) {
    window.location.hash = newHash;
  }
});

// Initialize based on current hash and watch for changes
onMounted(() => {
  updateFromHash();
  window.addEventListener('hashchange', updateFromHash);
});

onUnmounted(() => {
  window.removeEventListener('hashchange', updateFromHash);
});

// Computed properties for styling
const contrastingColor = computed(() => {
  const theme = useTheme();
  return getBestContrastingColor('#4242421f', theme.current.value.colors);
});
</script> 