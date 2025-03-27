<template>
  <v-container fluid>
    <h2 class="text-h6 font-weight-medium">Top ERC20 Tokens</h2>
    <v-divider class="my-4"></v-divider>
    <v-card>
      <v-card-text>
        <v-data-table-server
          class="hide-table-count"
          :headers="headers"
          :items="tokens"
          :loading="loading"
          :items-per-page="itemsPerPage"
          :items-length="totalTokens"
          :disable-pagination="true"
          items-per-page-text="Rows per page:"
          last-icon=""
          first-icon=""
          :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
          ]"
          @update:options="fetchTokens">
          <template v-slot:['footer.page-text']=""></template>
          <template v-slot:item.address="{ item }">
            <HashLink type="token" :hash="item.token" />
          </template>
          <template v-slot:item.holderCount="{ item }">
            {{ item.holders.toLocaleString() }}
          </template>
          <template v-slot:item.name="{ item }">
            {{ item.contract.tokenName || item.contract.name }}
          </template>
          <template v-slot:item.symbol="{ item }">
            {{ item.contract.tokenSymbol }}
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { inject, ref, onMounted } from 'vue';
import HashLink from '@/components/HashLink.vue';

const $server = inject('$server');
const tokens = ref([]);
const loading = ref(true);
const itemsPerPage = ref(10);
const totalTokens = ref(0);

const headers = [
  { title: 'Address', key: 'address', sortable: false },
  { title: 'Name', key: 'name', sortable: false },
  { title: 'Symbol', key: 'symbol', sortable: false },
  { title: 'Holder Count', key: 'holderCount', sortable: false }
];

const fetchTokens = async (options) => {
  loading.value = true;
  try {
    const { data } = await $server.getTopErc20ByHolders(options);
    console.log(data);
    tokens.value = data.items;
    totalTokens.value = data.items.length == itemsPerPage.value ?
      (options.page * itemsPerPage.value) + 1 :
      options.page * itemsPerPage.value;
  } catch (error) {
    console.error('Error fetching top ERC20 tokens:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTokens();
});
</script> 