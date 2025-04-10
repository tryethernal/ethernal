<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="blocks"
        :items-length="blockCount"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        :hide-default-footer="dense"
        :disable-pagination="true"
        :hide-default-header="dense"
        :item-class="rowClasses"
        items-per-page-text="Rows per page:"
        no-data-text="No blocks indexed yet"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        :headers="headers"
        @update:options="getBlocks">
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>
        <template v-slot:item.number="{ item }">
            <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                    <v-progress-circular v-if="item.state == 'syncing'" v-bind="props" size="16" width="2" indeterminate color="primary" class="mr-2"></v-progress-circular>
                </template>
                <span v-if="item.state == 'syncing'">Indexing block...</span>
            </v-tooltip>
            <router-link style="text-decoration: none;" :to="'/block/' + item.number">{{ commify(item.number) }}</router-link>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.timestamp) }}<br>
                <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.timestamp) }}</small>
            </div>
        </template>
        <template v-slot:item.gasUsed="{ item }">
            <div class="gas-used-cell">
                <div class="d-flex align-center">
                    <span>{{ commify(item.gasUsed) }}</span>
                    <span class="text-caption ml-1">({{ calculateGasPercentage(item) }}%)</span>
                </div>
                <v-progress-linear
                    class="mt-1"
                    :model-value="calculateGasPercentage(item)"
                    height="2"
                    color="primary"
                    bg-color="primary-lighten-4"
                ></v-progress-linear>
            </div>
        </template>
        <template v-slot:item.transactionNumber="{ item }">
            <router-link style="text-decoration: none;" :to="'/block/' + item.number + '#transactions'">
                {{ item.transactionsCount }} <template v-if="dense"> transaction<template v-if="item.transactionsCount != 1">s</template></template>
            </router-link>
        </template>
        <template v-slot:item.miner="{ item }">
            <router-link style="text-decoration: none;" :to="'/address/' + item.miner">
                {{ item.miner ? item.miner.substring(0, 8) + '...' + item.miner.substring(item.miner.length - 6) : '' }}
            </router-link>
        </template>
    </v-data-table-server>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, inject } from 'vue';

const props = defineProps({
    dense: Boolean,
    withCount: Boolean
});

// Import ethers directly
const ethers = require('ethers');

// State
const blocks = ref([]);
const blockCount = ref(0);
const headers = ref([]);
const loading = ref(true);
const currentOptions = reactive({ 
    page: 1, 
    itemsPerPage: 10, 
    sortBy: [{ key: 'number', order: 'desc' }] 
});
let pusherChannelHandler = null;

// Directly inject the provided values
const $dt = inject('$dt');
const $server = inject('$server');
const $pusher = inject('$pusher');

// Methods
const commify = ethers.utils.commify;

const rowClasses = (item) => {
    if (item.state === 'syncing')
        return 'isSyncing';
};

const calculateGasPercentage = (item) => {
    if (!item || !item.gasLimit || !item.gasUsed) return 0;
    
    // Handle cases where gasLimit or gasUsed might be strings (from API)
    const gasUsed = typeof item.gasUsed === 'string' ? parseFloat(item.gasUsed) : item.gasUsed;
    const gasLimit = typeof item.gasLimit === 'string' ? parseFloat(item.gasLimit) : item.gasLimit;
    
    if (isNaN(gasUsed) || isNaN(gasLimit) || gasLimit === 0) return 0;
    
    const percentage = (gasUsed / gasLimit) * 100;
    return parseFloat(percentage.toFixed(2));
};

const getBlocks = ({ page, itemsPerPage, sortBy } = {}) => {
    if (!$server) return;
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        loading.value = false;
        return;
    }

    // Update current options
    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getBlocks({ 
        page, 
        itemsPerPage, 
        orderBy: sortBy[0].key, 
        order: sortBy[0].order 
    }, !props.dense && !!props.withCount)
        .then(({ data }) => {
            blocks.value = data.items;
            blockCount.value = data.items.length == currentOptions.itemsPerPage ?
                (currentOptions.page * data.items.length) + 1 :
                currentOptions.page * data.items.length;
        })
        .catch(console.log)
        .finally(() => loading.value = false);
};

// Setup component on mount
onMounted(() => {
    // Initialize table headers
    headers.value.push(
        { title: 'Block', key: 'number' },
        { title: 'Mined On', key: 'timestamp' },
        { title: 'Transaction Count', key: 'transactionNumber', sortable: false },
    );
    
    if (!props.dense) {
        headers.value.push([
            { title: 'Gas Used', key: 'gasUsed', sortable: false },
            { title: 'Fee Recipient', key: 'miner', sortable: false }
        ]);
    }
    
    // Set up Pusher channel handler
    if ($pusher) {
        pusherChannelHandler = $pusher.onNewBlock(() => getBlocks(currentOptions));
    }
});

// Clean up on unmount
onBeforeUnmount(() => {
    if (pusherChannelHandler) {
        pusherChannelHandler.unbind();
        pusherChannelHandler = null;
    }
});
</script>

<style scoped>
:deep(.isSyncing) {
    font-style: italic;
    opacity: 0.7;
}

.gas-used-cell {
    max-width: fit-content;
    min-width: 100px;
    white-space: nowrap;
}
</style>
