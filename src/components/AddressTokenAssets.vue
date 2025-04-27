<template>
  <div>
    <v-data-table
      :loading="loading"
      :headers="headers"
      :items="tokens"
      :items-per-page="10"
    >
      <template v-slot:item.token="{ item }">
        <Hash-Link :type="'address'" :contract="item.tokenContract" :hash="item.token" :fullHash="true" :withName="true" :withTokenName="true" :notCopiable="true" />
        <span class="ml-2 text-caption text-medium-emphasis" v-if="item.tokenContract.tokenSymbol">({{ item.tokenContract.tokenSymbol }})</span>
      </template>
      
      <template v-slot:item.contract="{ item }">
        <Hash-Link :type="'address'" :hash="item.token" :fullHash="true" />
      </template>
      
      <template v-slot:item.amount="{ item }">
        <span v-tooltip="item.currentBalance">
          {{ fromWei(item.currentBalance, item.tokenContract.tokenDecimals, item.tokenContract.tokenSymbol) }}
        </span>
      </template>
      
      <template v-slot:no-data>
        <div class="text-center py-6">
          <p class="text-medium-emphasis">No token found</p>
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import HashLink from './HashLink.vue';

// Props
const props = defineProps({
    address: {
        type: String,
        required: true
    }
});

// Injected services
const server = inject('$server');
const fromWei = inject('$fromWei');

// Reactive state
const loading = ref(true);
const tokens = ref([]);
const headers = [
    { title: 'Token', key: 'token' },
    { title: 'Contract', key: 'contract' },
    { title: 'Amount', key: 'amount' }
];

const fetchTokens = () => {
    loading.value = true;
    server.getTokenBalances(props.address, ['erc20'])
        .then(({ data }) => tokens.value = data)
        .catch(error => console.error('Error fetching token balances:', error))
        .finally(() => loading.value = false);
};

// Lifecycle hooks
onMounted(() => {
    fetchTokens();
});
</script> 
