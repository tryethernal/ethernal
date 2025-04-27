<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Block <span class="text-grey-darken-1">#{{ props.number }}</span></h2>
        <v-alert density="compact" variant="tonal" type="info" class="mt-2 mb-4" v-if="block && block.syncedTransactionCount < block.transactionsCount">
            Some transactions in this block are still being processed ({{ block.syncedTransactionCount }} / {{ block.transactionsCount }}).
        </v-alert>
        <v-divider class="my-4"></v-divider>
        <template v-if="loading">
            <v-card>
                <v-card-text>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                    <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
                </v-card-text>
            </v-card>
        </template>
        <template v-else-if="block">
            <!-- Navigation Tabs -->
            <v-chip-group :selected-class="`text-${contrastingColor}`" v-model="selectedTab">
                <v-chip size="small" value="overview">Overview</v-chip>
                <v-chip size="small" value="transactions">Transactions ({{ block.transactionsCount || 0 }})</v-chip>
            </v-chip-group>

            <!-- Tab Content -->
            <template v-if="selectedTab === 'overview'">
                <Block-Overview 
                    :block="block" 
                    @change-tab="selectedTab = $event"
                />
            </template>

            <template v-if="selectedTab === 'transactions'">
                <Block-Transaction-List 
                    :blockNumber="number" 
                    @list-updated="listUpdated(number)"
                />
            </template>
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <div class="d-flex align-center justify-center py-8">
                        <v-icon size="large" color="grey-lighten-1" class="mr-4">mdi-cube-outline</v-icon>
                        <span class="text-body-1">
                            This block has not been mined. Current block: <router-link style="text-decoration: none;" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link>
                        </span>
                    </div>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, inject } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { utils } from 'ethers';
import { useTheme } from 'vuetify';
import { getBestContrastingColor } from '../lib/utils';
import BlockOverview from './BlockOverview.vue';
import BlockTransactionList from './BlockTransactionList.vue';

// Get Vue instance to access global properties
const $server = inject('$server');
const $pusher = inject('$pusher');

// Props
const props = defineProps({
    number: {
        type: [String, Number],
        required: true
    }
});

// Stores
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const block = ref(null);
const pusherChannelHandler = ref(null);
const loading = ref(true);
const selectedTab = ref('overview');

// Methods
const commify = utils.commify;

const loadBlock = (number) => {
    loading.value = true;
    $server.getBlock(number)
        .then(({ data }) => block.value = data)
        .catch(console.log)
        .finally(() => loading.value = false);
};

const listUpdated = (number) => {
    $server.getBlock(number)
        .then(({ data }) => block.value = data)
        .catch(console.log);
};

// Update URL hash when tab changes
const updateUrlHash = (tab) => {
    if (tab === 'overview') {
        if (window.location.hash) {
            history.pushState(null, null, window.location.pathname);
        }
    } else {
        history.pushState(null, null, `#${tab}`);
    }
};

// Handle hash changes
const handleHashChange = () => {
    const hash = window.location.hash.substring(1);
    if (hash === 'transactions') {
        selectedTab.value = 'transactions';
    } else if (hash === '') {
        selectedTab.value = 'overview';
    }
};

// Computed properties
const contrastingColor = computed(() => {
    const theme = useTheme();
    return getBestContrastingColor('#4242421f', theme.current.value.colors);
});

// Lifecycle hooks
onMounted(() => {
    // Check for hash in URL on initial load
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    pusherChannelHandler.value = $pusher.onNewBlock(data => {
        if (data.number == props.number)
            loadBlock(props.number);
    });
});

onBeforeUnmount(() => {
    // Remove hash change listener
    window.removeEventListener('hashchange', handleHashChange);
    
    if (pusherChannelHandler.value) {
        pusherChannelHandler.value.unbind(null, null);
    }
});

// Watch for changes to the number prop
watch(() => props.number, (newNumber) => {
    loadBlock(newNumber);
}, { immediate: true });

// Watch for tab changes to update URL hash
watch(() => selectedTab.value, (newTab) => {
    updateUrlHash(newTab);
});
</script>

<style scoped>
/* Remove margin-top from the overview card to eliminate spacing after chips */
.v-chip-group + template > .v-alert,
.v-chip-group + template > .v-card {
  margin-top: 0;
}
</style>
