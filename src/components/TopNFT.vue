<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h6 font-weight-medium flex-grow-1">Top NFT Collections</h2>
    </div>
    <v-divider class="my-4"></v-divider>
    <v-card>
      <v-card-text>
        <v-data-table-server
          class="hide-table-count"
          :headers="headers"
          :items="nfts"
          :loading="loading"
          :items-per-page="itemsPerPage"
          :items-length="totalNFTs"
          :disable-pagination="true"
          items-per-page-text="Rows per page:"
          last-icon=""
          first-icon=""
          :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
          ]"
          @update:options="fetchNFTs">
          <template v-slot:loading>
            <div class="d-flex justify-center align-center pa-4">
                <v-progress-circular
                    size="24"
                    indeterminate
                    color="primary"
                    class="mr-3"
                ></v-progress-circular>
                Loading collections...
            </div>
          </template>
          <template v-slot:['footer.page-text']=""></template>
          <template v-slot:item.collection="{ item }">
            <div class="d-flex align-center">
              <router-link :to="`/token/${item.token}`" class="text-decoration-none">
                {{ item.contract.tokenName || item.contract.name }}
              </router-link>
            </div>
          </template>
          <template v-slot:item.type="{ item }">
            <span v-for="pattern in item.contract.patterns" :key="pattern">
              <v-chip
                v-if="['erc721', 'erc1155'].includes(pattern.toLowerCase())"
                color="success"
                size="x-small"
                class="text-uppercase mr-1">
                {{ formatContractPattern(pattern) }}
              </v-chip>
            </span>
          </template>
          <template v-slot:item.holders="{ item }">
            {{ item.holders.toLocaleString() }}
          </template>
          <template v-slot:item.totalSupply="{ item }">
            {{ item.contract.tokenTotalSupply ? parseInt(item.contract.tokenTotalSupply).toLocaleString() : 'N/A' }}
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { inject, ref } from 'vue';
import { formatContractPattern } from '@/lib/utils';

const $server = inject('$server');
const nfts = ref([]);
const loading = ref(true);
const itemsPerPage = ref(10);
const totalNFTs = ref(0);

const headers = [
  { title: 'Collection', key: 'collection', sortable: false },
  { title: 'Type', key: 'type', sortable: false },
  { title: 'Holders', key: 'holders', sortable: false },
  { title: 'Total Assets', key: 'totalSupply', sortable: false }
];

const fetchNFTs = async (options = { page: 1, itemsPerPage: 10 }) => {
  loading.value = true;
  try {
    const { data } = await $server.getTopTokensByHolders({
      ...options,
      patterns: ['erc721', 'erc1155']
    });
    nfts.value = data.items;
    totalNFTs.value = data.items.length == itemsPerPage.value ?
      (options.page * itemsPerPage.value) + 1 :
      options.page * itemsPerPage.value;
  } catch (error) {
    console.error('Error fetching top NFTs:', error);
  } finally {
    loading.value = false;
  }
};
</script>
