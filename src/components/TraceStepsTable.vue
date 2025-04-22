<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="items"
        :items-length="totalItems"
        :sort-by="sortBy"
        :must-sort="true"
        items-per-page-text="Rows per page:"
        :headers="headers"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        no-data-text="No internal transactions indexed yet"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        item-key="id"
        @update:options="onUpdateOptions">
        <template v-slot:footer.page-text>
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
                <v-chip size="x-small" class="mr-2" v-if="item.from && item.from.address === highlightAddress">self</v-chip>
                <Hash-Link :contract="item.from.address != highlightAddress ? item.from.contract : null" :type="'address'" :hash="item.from.address" :withTokenName="true" :withName="true" />
            </template>
        </template>

        <template v-slot:item.to="{ item }">
            <v-chip size="x-small" class="mr-2" v-if="item.to && item.to.address === highlightAddress">self</v-chip>
            <Hash-Link :contract="item.to.address != highlightAddress ? item.to.contract : null" :type="'address'" :hash="item.to.address" :withTokenName="true" :withName="true" />
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
import { inject } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import HashLink from './HashLink.vue';

const props = defineProps({
    dense: Boolean,
    highlightAddress: {
        type: String,
        default: ''
    },
    loading: {
        type: Boolean,
        required: true
    },
    items: {
        type: Array,
        required: true
    },
    totalItems: {
        type: Number,
        required: true
    },
    sortBy: {
        type: Array,
        default: () => [{ key: 'timestamp', order: 'desc' }]
    }
});

const emit = defineEmits(['update:options']);

const currentWorkspaceStore = useCurrentWorkspaceStore();
const $dt = inject('$dt');
const $fromWei = inject('$fromWei');

const headers = [
    { title: 'Transaction', key: 'transaction', align: 'start', sortable: false },
    { title: 'Type', key: 'type', sortable: false },
    { title: 'Method', key: 'method', sortable: false },
    { title: 'Mined On', key: 'timestamp', sortable: false },
    { title: 'From', key: 'from', sortable: false },
    { title: 'To', key: 'to', sortable: false },
    { title: 'Value', key: 'value', sortable: false }
];

const onUpdateOptions = (options) => {
    emit('update:options', options);
};

</script>
