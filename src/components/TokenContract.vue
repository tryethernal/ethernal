<template>
    <v-container v-if="loadingContract" fluid>
        <v-skeleton-loader
            type="text"
            max-width="600"
            class="mb-4"
        />
        <v-divider class="my-4"></v-divider>
        
        <!-- Skeleton for token info cards -->
        <v-row class="mb-6">
            <v-col cols="12" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
            <v-col cols="12" lg="4">
                <v-skeleton-loader type="card" height="200" />
            </v-col>
        </v-row>
    </v-container>
    <v-container v-else-if="notAContract" fluid>
        <v-row justify="center" align="center" style="min-height: 400px">
            <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
                <v-icon size="100" color="primary" class="mb-4" style="opacity: 0.25">mdi-file</v-icon>
                <div class="text-h6 mb-2">No Contract Found</div>
                <div class="text-body-1 text-medium-emphasis">There doesn't seem to be a contract at this address.</div>
            </v-col>
        </v-row>
    </v-container>
    <ERC20Contract
        v-else-if="isERC20"
        :address="address"
        :contract="contract"
        :loading-contract="loadingContract"
        :key="`erc20-${address}`"
    />
    <ERC721Collection
        v-else-if="isERC721"
        :address="address"
        :contract="contract"
        :loading-contract="loadingContract"
        :key="`erc721-${address}`"
    />
    <v-container v-else fluid>
        <v-row justify="center" align="center" style="min-height: 400px">
            <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
                <v-icon size="100" color="primary" class="mb-4" style="opacity: 0.25">mdi-help-circle</v-icon>
                <div class="text-h6 mb-2">Unknown Contract Type</div>
                <div class="text-body-1 text-medium-emphasis">This contract doesn't appear to be an ERC20 or ERC721 token.</div>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';
import ERC20Contract from './ERC20Contract.vue';
import ERC721Collection from './ERC721Collection.vue';

// Props
const props = defineProps({
    address: {
        type: String,
        required: true
    }
});

// Inject server instance
const $server = inject('$server');

// Reactive state
const loadingContract = ref(true);
const contract = ref({});
const notAContract = ref(false);

// Computed properties
const isERC20 = computed(() => {
    return contract.value?.patterns?.includes('erc20');
});

const isERC721 = computed(() => {
    return contract.value?.patterns?.includes('erc721') || 
           contract.value?.patterns?.includes('erc1155');
});

// Load contract data
const loadContract = async (address) => {
    try {
        loadingContract.value = true;
        notAContract.value = false;
        contract.value = {};

        const { data } = await $server.getContract(address);
        if (data) {
            contract.value = data;
        } else {
            notAContract.value = true;
        }
    } catch (error) {
        console.error('Error loading contract:', error);
        notAContract.value = true;
    } finally {
        loadingContract.value = false;
    }
};

// Watchers
watch(() => props.address, (newAddress) => {
    if (newAddress) {
        loadContract(newAddress);
    }
}, { immediate: true });
</script> 