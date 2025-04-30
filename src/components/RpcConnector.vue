<template>
    <v-app-bar elevation="0" :class="['top-bar', 'theme-background']" height="50">
        <v-container class="d-flex align-center justify-space-between">
            <div class="d-flex align-center w-100">
                <v-app-bar-nav-icon @click.stop="$emit('toggleMenu')" v-if="$vuetify.display.mobile"></v-app-bar-nav-icon>

                <!-- Desktop Info Section -->
                <template v-if="!$vuetify.display.mobile">
                    <template v-if="isUserAdmin && !currentWorkspaceStore.public">
                        <span class="text-body-2" style="max-width: 50ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(currentWorkspaceStore.rpcServer) }}</span>
                        <v-divider vertical inset class="mx-2"></v-divider>
                    </template>
                    <template v-if="currentWorkspaceStore.currentBlock.number !== null && currentWorkspaceStore.currentBlock.number !== undefined">
                        <span class="text-body-2">Latest Block: <router-link class="text-decoration-none ml-1" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link></span>
                    </template>
                    <template v-if="explorerStore.id && explorerStore.gasAnalyticsEnabled && gasPrice">
                        <v-divider vertical inset class="mx-2"></v-divider>
                        <span class="text-body-2">Gas: <router-link class="text-decoration-none ml-1" :to="'/gas'">{{ gasPrice }}</router-link></span>
                    </template>
                    <div v-show="processingContracts" class="text-body-2">
                        <v-divider vertical inset class="mx-2"></v-divider>
                        <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
                    </div>
                </template>

                <!-- Search Bar Section -->
                <template v-if="isNotOverviewPage">
                    <v-spacer v-if="!$vuetify.display.mobile"></v-spacer>
                    <div :class="[
                        'search-container',
                        { 'search-container-mobile': $vuetify.display.mobile }
                    ]">
                        <SearchBar :compact="true" />
                    </div>
                </template>

                <!-- Theme Toggle and Other Controls -->
                <v-spacer v-if="!isNotOverviewPage"></v-spacer>
                <div class="d-flex align-center ml-2">
                    <theme-toggle />
                </div>
            </div>
        </v-container>
    </v-app-bar>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue';
import { useRoute } from 'vue-router';
import { utils as ethersUtils } from 'ethers';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useExplorerStore } from '../stores/explorer';
import { useEnvStore } from '../stores/env';
import { useUserStore } from '../stores/user';
import { shortRpcUrl } from '@/lib/utils';
import SearchBar from './SearchBar.vue';
import ThemeToggle from './ThemeToggle.vue';

const MINIMUM_DISPLAY_GWEI = 10000000;

// Props
const props = defineProps({
    styles: {
        type: Object,
        default: () => ({})
    }
});

// Emits
const emit = defineEmits(['toggleMenu']);

// Inject services
const $pusher = inject('$pusher');
const $server = inject('$server');
const $fromWei = inject('$fromWei');

// Store instances
const currentWorkspaceStore = useCurrentWorkspaceStore();
const explorerStore = useExplorerStore();
const envStore = useEnvStore();
const userStore = useUserStore();

// Route instance
const route = useRoute();

// Reactive state
const processingContracts = ref(false);
const page = ref(null);
const gasPrice = ref(null);

// Computed properties
const isUserAdmin = computed(() => envStore.isAdmin);
const isNotOverviewPage = computed(() => route.path !== '/' && route.path !== '/overview');

// Methods
const commify = ethersUtils.commify;

const processContracts = async () => {
    processingContracts.value = true;
    try {
        await $server.processContracts(currentWorkspaceStore.rpcServer);
    } catch (error) {
        console.log(error);
    } finally {
        processingContracts.value = false;
    }
};

const processTransactions = async () => {
    try {
        const { data } = await $server.getProcessableTransactions();
        data.forEach(transaction => 
            $server.processTransaction(currentWorkspaceStore, transaction)
        );
    } catch (error) {
        console.log(error);
    }
};

const processFailedTransactions = async () => {
    try {
        const { data } = await $server.getFailedProcessableTransactions();
        await $server.processFailedTransactions(data, currentWorkspaceStore);
    } catch (error) {
        console.log(error);
    }
};

const getAccounts = async () => {
    try {
        const { data: { items } } = await $server.getAccounts({ page: -1 });
        currentWorkspaceStore.updateAccounts(items);
    } catch (error) {
        console.log(error);
    }
};

// Lifecycle hooks and initialization
onMounted(async () => {
    page.value = route.path;
    try {
        const { data: { items } } = await $server.getBlocks({ page: 1, itemsPerPage: 1 }, false);
        if (items.length) {
            currentWorkspaceStore.updateCurrentBlock(items[0]);
        }
    } catch (error) {
        console.log(error);
    }

    if (userStore.isAdmin) {
        getAccounts();
    }

    if (!currentWorkspaceStore.public) {
        processContracts();
        processTransactions();
        processFailedTransactions();
        
        $pusher.onNewContract(processContracts);
        $pusher.onNewProcessableTransactions((transaction) => 
            $server.processTransaction(currentWorkspaceStore, transaction)
        );
        $pusher.onNewFailedTransactions((transaction) => 
            $server.processFailedTransactions([transaction], currentWorkspaceStore.rpcServer)
        );

        if (currentWorkspaceStore.browserSyncEnabled === true) {
            currentWorkspaceStore.startBrowserSync();
        }
    }

    $pusher.onNewBlock(block => {
        if (block.number > currentWorkspaceStore.currentBlock.number) {
            currentWorkspaceStore.updateCurrentBlock(block);
        }
    });

    if (explorerStore.id && explorerStore.gasAnalyticsEnabled) {
        $pusher.onNewBlockEvent(blockEvent => {
            if (blockEvent.gasPrice < 0) {
                gasPrice.value = '0 gwei';
            } else if (blockEvent.gasPrice < MINIMUM_DISPLAY_GWEI) {
                gasPrice.value = '<0.01 gwei';
            } else {
                gasPrice.value = $fromWei(blockEvent.gasPrice, 'gwei', 'gwei', false, 2);
            }
        });
    }
});
</script>

<style>
.v-app-bar {
    display: flex;
    justify-content: center;
    color: var(--text-primary);
    min-height: 50px !important;
}

.v-app-bar.top-bar {
    border-bottom: 1px solid var(--border-color);
}

.v-app-bar .v-container {
    flex: none;
    width: 100%;
    padding: 0;
}

/* Links in the app bar */
.v-app-bar a {
    color: var(--text-primary);
    text-decoration: none;
}

.v-app-bar a:hover {
    color: rgb(var(--v-theme-primary));
}

/* Progress circular color */
.v-app-bar .v-progress-circular {
    color: rgb(var(--v-theme-primary));
}

.search-container {
    width: 500px;
}

/* Mobile specific styles */
@media (max-width: 600px) {
    .v-app-bar .v-container {
        padding: 0 8px;
    }
    .search-container-mobile {
        width: 100%;
    }
}
</style>
