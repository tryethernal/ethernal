<template>
    <v-container fluid v-if="!loading">
        <template v-if="block">
            <v-row>
                <v-col cols="6">
                    <v-alert density="compact" text type="warning" class="my-2" v-show="syncing">
                        Some transactions in this block are still being processed ({{ block.syncedTransactionCount }} / {{ block.transactionsCount }}).
                    </v-alert>
                    <h2>Block {{ block.number && commify(block.number) }}</h2>
                </v-col>
            </v-row>
            <v-row class="mb-4">
                <v-col lg="2" md="12" sm="12">
                    <v-list-subheader class="text-overline">Gas Limit</v-list-subheader>
                    {{ parseInt(block.gasLimit).toLocaleString() }}
                </v-col>
                <v-divider vertical></v-divider>
                <v-col lg="2" md="12" sm="12">
                    <v-list-subheader class="text-overline">Mined On</v-list-subheader>
                    {{ $dt.shortDate(block.timestamp) }}<br>
                    <small>{{ $dt.fromNow(block.timestamp) }}</small>
                </v-col>
                <v-divider vertical></v-divider>
                <v-col lg="4" md="12" sm="12">
                    <v-list-subheader class="text-overline">Hash</v-list-subheader>
                    <span style="overflow-wrap: break-word;">{{ block.hash }}</span>
                </v-col>
                <template v-if="explorerStore.l1Explorer && block.l1BlockNumber">
                    <v-divider vertical></v-divider>
                    <v-col lg="2" md="12" sm="12">
                        <v-list-subheader class="text-overline">L1 Block</v-list-subheader>
                        <a style="text-decoration: none;" :href="`${explorerStore.l1Explorer}/block/${block.l1BlockNumber}`" target="_blank">{{ commify(block.l1BlockNumber) }}</a>
                    </v-col>
                </template>
            </v-row>
            <h4>Transactions</h4>
            <v-card>
                <Transactions-List @listUpdated="listUpdated(number)" :blockNumber="number" :withCount="true" />
            </v-card>
        </template>
        <template v-else>
            <v-card>
                <v-card-text>
                    <v-row>
                        <v-col align="center">
                            <v-icon style="opacity: 0.25;" size="200" color="primary-lighten-1">mdi-cube-outline</v-icon>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col class="text-body-1 text-center">
                            This block has not been mined. Current block: <router-link style="text-decoration: none;" :to="'/block/' + currentWorkspaceStore.currentBlock.number">{{ currentWorkspaceStore.currentBlock.number && commify(currentWorkspaceStore.currentBlock.number) }}</router-link>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </template>
    </v-container>
    <v-container fluid v-else>
        <v-card>
            <v-card-text>
                <v-row>
                    <v-col cols="2"><v-skeleton-loader type="list-item-three-line"></v-skeleton-loader></v-col>
                    <v-col cols="2"><v-skeleton-loader type="list-item-three-line"></v-skeleton-loader></v-col>
                    <v-col cols="2"><v-skeleton-loader type="list-item-three-line"></v-skeleton-loader></v-col>
                </v-row>
                <v-row>
                    <v-col>
                        <v-skeleton-loader type="table"></v-skeleton-loader>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';
import { useExplorerStore } from '../stores/explorer';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { utils } from 'ethers';
import TransactionsList from './TransactionsList.vue';

// Get Vue instance to access global properties
const { proxy } = getCurrentInstance();

// Props
const props = defineProps({
    number: {
        type: [String, Number],
        required: true
    }
});

// Stores
const explorerStore = useExplorerStore();
const currentWorkspaceStore = useCurrentWorkspaceStore();

// Reactive state
const block = ref(null);
const pusherChannelHandler = ref(null);
const loading = ref(true);

// Methods
const commify = utils.commify;

const loadBlock = (number) => {
    loading.value = true;
    proxy.$server.getBlock(number)
        .then(({ data }) => block.value = data)
        .catch(console.log)
        .finally(() => loading.value = false);
};

const listUpdated = (number) => {
    proxy.$server.getBlock(number)
        .then(({ data }) => block.value = data)
        .catch(console.log);
};

// Computed properties
const syncing = computed(() => {
    return block.value && block.value.syncedTransactionCount < block.value.transactionsCount;
});

// Lifecycle hooks
onMounted(() => {
    pusherChannelHandler.value = proxy.$pusher.onNewBlock(data => {
        if (data.number == props.number)
            loadBlock(props.number);
    });
});

onBeforeUnmount(() => {
    if (pusherChannelHandler.value) {
        pusherChannelHandler.value.unbind(null, null);
    }
});

// Watch for changes to the number prop
watch(() => props.number, (newNumber) => {
    loadBlock(newNumber);
}, { immediate: true });
</script>
