<template>
    <v-card class="mb-6">
        <v-card-text>
            <div v-if="loading" class="d-flex justify-center align-center pa-4">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <div v-else>
                <div>
                    <Tokens-Balance-Diff
                    :balanceChanges="balanceChanges"
                    :blockNumber="transaction.blockNumber" 
                    :itemsPerPage="itemsPerPage"
                    v-if="balanceChanges.length > 0"
                    />
                    <div v-else-if="!loading" class="text-center pa-4">
                        <v-icon color="grey-lighten-1" size="24" class="mb-2">mdi-swap-horizontal-off</v-icon>
                        <div class="text-body-2 text-grey-darken-1">No balance changes found for this transaction</div>
                    </div>
                </div>
                <div class="d-flex justify-center mt-4" v-if="totalPages > 1">
                    <v-pagination
                        v-model="currentPage"
                        density="comfortable"
                        :length="totalPages"
                        :total-visible="7"
                        color="primary"
                        active-color="primary"
                        border
                    />
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue';
import TokensBalanceDiff from './TokensBalanceDiff.vue';

const props = defineProps({
  transaction: {
    type: Object,
    required: true
  }
});

// Inject server
const $server = inject('$server');

// State
const loading = ref(true);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const balanceChanges = ref([]);

// Compute total pages from transaction.tokenBalanceChangeCount
const totalPages = computed(() => Math.ceil((props.transaction.tokenBalanceChangeCount || 0) / itemsPerPage.value));

// Fetch balance changes
const fetchBalanceChanges = async () => {
    loading.value = true;
    try {
        const { data } = await $server.getTransactionTokenBalanceChanges(
            props.transaction.hash,
            {
                page: currentPage.value,
                itemsPerPage: itemsPerPage.value
            }
        );
        balanceChanges.value = data || [];
    } catch (error) {
        console.error('Error fetching balance changes:', error);
        balanceChanges.value = [];
    } finally {
        loading.value = false;
    }
};

// Watch for page changes
watch(currentPage, () => {
    fetchBalanceChanges();
});

// Initial fetch
onMounted(() => {
    fetchBalanceChanges();
});
</script>
<style scoped>
:deep(.v-pagination .v-btn) {
    min-width: 0px !important;
}
</style>
