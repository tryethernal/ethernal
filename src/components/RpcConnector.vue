<template>
    <v-app-bar height="48" :style="styles" flat class="top-bar">
        <v-container class="d-flex align-center">
            <div class="d-flex align-center w-100">
                <v-app-bar-nav-icon @click.stop="toggleMenu" v-if="$vuetify.display.mobile"></v-app-bar-nav-icon>
                <template v-if="isUserAdmin && !currentWorkspaceStore.public">
                    <span style="max-width: 50ch; text-overflow: ellipsis; overflow: hidden;">{{ shortRpcUrl(currentWorkspaceStore.rpcServer) }}</span>
                    <v-divider vertical inset class="mx-2"></v-divider>
                </template>
                <template v-if="currentWorkspaceStore.currentBlock.number">
                    Latest Block: <router-link class="text-decoration-none ml-1" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link>
                </template>
                <template v-if="explorerStore.id && explorerStore.gasAnalyticsEnabled && gasPrice">
                    <v-divider vertical inset class="mx-2"></v-divider>
                    Gas: <router-link class="text-decoration-none ml-1" :to="'/gas'">{{ gasPrice }}</router-link>
                </template>
                <div v-show="processingContracts">
                    <v-divider vertical inset class="mx-2"></v-divider>
                    <v-progress-circular indeterminate class="mr-2" size="16" width="2" color="primary"></v-progress-circular>Processing Contracts...
                </div>
                <template v-if="isNotOverviewPage">
                    <v-spacer></v-spacer>
                    <SearchBar :compact="true" />
                </template>
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

const MINIMUM_DISPLAY_GWEI = 10000000;

// Props
defineProps({
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

// Methods
const commify = ethersUtils.commify;

const toggleMenu = () => {
    emit('toggleMenu');
};

const isNotOverviewPage = computed(() => route.path !== '/' && route.path !== '/overview');

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
    background-color: white !important;
}
.v-app-bar.top-bar {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.v-app-bar .v-container {
    flex: none;
    width: 100%;
    padding: 0;
}
</style>
