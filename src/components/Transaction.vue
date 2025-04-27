<template>
    <v-container fluid>
        <h2 class="text-h5 font-weight-medium">Transaction Details</h2>
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
        <template v-else-if="transaction.hash && !loading">
            <!-- Navigation Tabs -->
            <v-chip-group mandatory :selected-class="`text-${contrastingColor}`" v-model="selectedTab">
                <v-chip label size="small" value="overview">Overview</v-chip>
                <v-chip label size="small" value="internal" v-if="hasInternalTxns">Internal Transactions ({{ transaction.internalTransactionCount }})</v-chip>
                <v-chip label v-if="hasLogs" size="small" value="logs">Logs ({{ logCount }})</v-chip>
                <v-chip label size="small" value="statechange" v-if="transaction.tokenBalanceChangeCount > 0">State Changes ({{ transaction.tokenBalanceChangeCount }})</v-chip>
            </v-chip-group>

            <!-- Tab Content -->
            <Transaction-Overview 
                v-show="selectedTab === 'overview'" 
                :transaction="transaction"
                @error="handleComponentError"
            />
            
            <Transaction-Internal-Txns
                v-if="hasInternalTxns && selectedTab === 'internal'"
                :transaction="transaction"
                @error="handleComponentError"
            />
            
            <Transaction-Logs
                v-if="hasLogs && selectedTab === 'logs'"
                :hash="transaction.hash"
                ref="logsComponent"
            />

            <Transaction-State
                v-if="transaction.tokenBalanceChangeCount > 0 && selectedTab === 'statechange'"
                :transaction="transaction"
            />
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <div class="d-flex align-center justify-center py-8">
                        <v-icon size="large" color="grey-lighten-1" class="mr-4">mdi-alert-circle-outline</v-icon>
                        <span class="text-body-1">
                            Cannot find transaction. If you just sent it, it might not have been picked up yet by our indexer.
                            This page will refresh automatically as soon as we find it.
                        </span>
                    </div>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject, nextTick } from 'vue';
import { useTheme } from 'vuetify';
import { useRouter } from 'vue-router';
import { getBestContrastingColor } from '../lib/utils';
import TransactionOverview from './TransactionOverview.vue';
import TransactionLogs from './TransactionLogs.vue';
import TransactionInternalTxns from './TransactionInternalTxns.vue';
import TransactionState from './TransactionState.vue';

const props = defineProps(['hash']);

// Inject all required globals
const $server = inject('$server');
const $pusher = inject('$pusher');

// Reactive state with optimized defaults
const transaction = ref({
    error: '',
    value: '0',
    gasPrice: '0',
    gasLimit: '0',
    trace: null,
    tokenTransferCount: 0,
    receipt: null,
    formattedBalanceChanges: {},
    block: {},
    contract: {},
    traceSteps: []
});
const loading = ref(false);
const selectedTab = ref('overview');
const logsComponent = ref(null);
let pusherUnsubscribe = null;

// Computed properties for improved null safety
const hasLogs = computed(() => transaction.value.receipt && transaction.value.receipt.logCount > 0);
const logCount = computed(() => transaction.value.receipt ? transaction.value.receipt.logCount : 0);
const hasInternalTxns = computed(() => transaction.value.internalTransactionCount && transaction.value.internalTransactionCount > 0);

// Initialize empty transaction with safe defaults
const resetTransaction = () => {
    transaction.value = {
        error: '',
        value: '0',
        gasPrice: '0',
        gasLimit: '0',
        trace: null,
        tokenTransferCount: 0,
        receipt: null,
        formattedBalanceChanges: {},
        block: {},
        contract: {},
        traceSteps: []
    };
};

const router = useRouter();

// Check URL hash for initial tab
const checkUrlHash = () => {
    if (window.location.hash === '#eventlogs') {
        selectedTab.value = 'logs';
    } else if (window.location.hash === '#internal') {
        selectedTab.value = 'internal';
    } else if (window.location.hash === '#statechange') {
        selectedTab.value = 'statechange';
    } else {
        selectedTab.value = 'overview';
    }
};

const contrastingColor = computed(() => {
    const theme = useTheme();
    return getBestContrastingColor('#4242421f', theme.current.value.colors);
});

// Methods
const loadTransaction = async (hash) => {
    if (!hash) return;

    loading.value = true;
    try {
        const { data } = await $server.getTransaction(hash);
        
        // Create a safe transaction object with proper defaults
        const safeTransaction = {
            ...data,
            // Ensure receipt is either the data from the server or null
            receipt: data.receipt || null,
            // Ensure other commonly accessed properties have defaults
            formattedBalanceChanges: data.formattedBalanceChanges || {},
            traceSteps: data.traceSteps || [],
            block: data.block || {},
            contract: data.contract || {}
        };
        
        transaction.value = safeTransaction;
    } catch (error) {
        console.error('Error loading transaction:', error);
        // Keep the current transaction state but mark as not loading
    } finally {
        loading.value = false;
    }
};

// Lifecycle hooks
onMounted(() => {
    pusherUnsubscribe = $pusher.onNewTransaction(data => {
        if (data.hash === props.hash) {
            loadTransaction(props.hash);
        }
    });

    // Check URL hash on mount
    checkUrlHash();

    // Listen for route changes
    router.afterEach(() => {
        checkUrlHash();
    });
});

onUnmounted(() => {
    if (pusherUnsubscribe) {
        pusherUnsubscribe();
    }
});

// Watch with optimization
watch(() => props.hash, (hash) => {
    // Reset state when hash changes
    if (hash !== transaction.value.hash) {
        resetTransaction();
    }
    
    loadTransaction(hash);
}, { immediate: true });

// Update URL hash when tab changes
watch(() => selectedTab.value, (newTab) => {
    const currentPath = router.currentRoute.value.fullPath.split('#')[0];
    let hash = '';
    
    if (newTab === 'logs') {
        hash = '#eventlogs';
    } else if (newTab === 'internal') {
        hash = '#internal';
    } else if (newTab === 'statechange') {
        hash = '#statechange';
    }
    
    router.replace(currentPath + hash);
});

// Error handling
const handleComponentError = (error) => {
    console.error(`Component error: ${error.message}`, error);
    return false; // prevent propagation
};
</script>
