<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="traceSteps"
        :items-length="traceStepCount"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        :headers="headers"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        :row-props="rowClasses"
        no-data-text="No internal transactions indexed yet"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        item-key="id"
        @update:options="getTraceSteps">
        <template v-if="!withCount" v-slot:footer.page-text>
            <span></span>
        </template>
        
        <template v-slot:item.transaction="{ item }">
            <Hash-Link :type="'transaction'" :hash="item.transaction.hash" :xsHash="true" />
        </template>

        <template v-slot:item.method="{ item }">
            <v-tooltip v-if="item.method.name">
                <template v-slot:activator="{ props }">
                    <v-chip v-bind="props" color="primary-lighten-1" label size="small" variant="flat">
                        {{ item.method.name }}
                    </v-chip>
                </template>
                <span style="white-space: pre">{{ item.method.label }}</span>
            </v-tooltip>
            <v-chip v-else-if="item.method.sighash" color="primary-lighten-1" label size="small" variant="flat">
                {{ item.method.sighash }}
            </v-chip>
        </template>
        
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.transaction.timestamp) }}<br>
                <small class="text-caption text-medium-emphasis">{{ $dt.fromNow(item.transaction.timestamp) }}</small>
            </div>
        </template>
        
        <template v-slot:item.from="{ item }">
            <template v-if="dense">
                <div class="my-2 text-left">
                    From: <Hash-Link :type="'address'" :hash="item.from.address" /><br>
                </div>
            </template>
            <template v-else>
                <v-chip size="x-small" class="mr-2" v-if="item.from && item.from.address === address">self</v-chip>
                <Hash-Link :contract="item.from.address != address ? item.from.contract : null" :type="'address'" :hash="item.from.address" :withTokenName="true" :withName="true" />
            </template>
        </template>

        <template v-slot:item.to="{ item }">
            <v-chip size="x-small" class="mr-2" v-if="item.to && item.to.address === address">self</v-chip>
            <Hash-Link :contract="item.to.address != address ? item.to.contract : null" :type="'address'" :hash="item.to.address" :withTokenName="true" :withName="true" />
        </template>
        
        <template v-slot:item.value="{ item }">
            {{ $fromWei(item.value, 'ether', currentWorkspaceStore.chain.token, false, 4) }}
        </template>
        
        <template v-slot:item.type="{ item }">
            <v-chip label size="small" color="primary-lighten-1" variant="flat">{{ item.op }}</v-chip>
        </template>
    </v-data-table-server>
</template>

<script setup>
import { defineProps, shallowRef, ref, inject, defineEmits, watch, computed } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import HashLink from './HashLink.vue';

const props = defineProps({
    address: {
        type: String,
        required: true
    },
    dense: Boolean,
    withCount: Boolean
});

const emit = defineEmits(['listUpdated']);

const currentWorkspaceStore = useCurrentWorkspaceStore();
const $server = inject('$server');
const $dt = inject('$dt');
const $fromWei = inject('$fromWei');

const currentOptions = ref({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'timestamp', order: 'desc' }] });
const traceSteps = shallowRef([]);
const traceStepCount = ref(0);
const loading = ref(false);
const headers = shallowRef(
    [
        { title: 'Transaction', key: 'transaction', align: 'start', sortable: false },
        { title: 'Type', key: 'type', sortable: false },
        { title: 'Method', key: 'method', sortable: false },
        { title: 'Mined On', key: 'timestamp', sortable: false },
        { title: 'From', key: 'from', sortable: false },
        { title: 'To', key: 'to', sortable: false },
        { title: 'Value', key: 'value', sortable: false }
    ]
);

// Create a local reference to address for template
const address = computed(() => props.address);

const getTraceSteps = ({ page, itemsPerPage, sortBy }) => {
    if (loading.value) {
        return;
    }

    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length) {
        loading.value = false;
        return;
    }

    currentOptions.value = { page, itemsPerPage, sortBy };

    $server.getAddressInternalTransactions(props.address, page, itemsPerPage)
        .then(({ data}) => {
            traceSteps.value = data.items;
            
            if (data.total !== undefined && data.total !== null) {
                traceStepCount.value = data.total;
            } else {
                const itemsLength = Array.isArray(data.items) ? data.items.length : 0;
                const isFullPage = itemsLength === currentOptions.value.itemsPerPage;
                
                traceStepCount.value = isFullPage 
                    ? (currentOptions.value.page * itemsLength) + 1 
                    : (currentOptions.value.page * itemsLength);
            }
            emit('listUpdated');
        })
        .catch((error) => {
            console.log('Error fetching trace steps:', error);
            traceSteps.value = [];
            traceStepCount.value = 0;
        })
        .finally(() => loading.value = false);
};

const rowClasses = (item) => {
    if (item && item.state === 'syncing') {
        return 'isSyncing';
    }
    return '';
};

watch(currentOptions, (newOptions, oldOptions) => {
    if (JSON.stringify(newOptions) !== JSON.stringify(oldOptions)) {
        getTraceSteps(newOptions);
    }
}, { deep: false });

</script>

<style scoped>
:deep(.isSyncing) {
    font-style: italic;
    opacity: 0.7;
}
</style> 