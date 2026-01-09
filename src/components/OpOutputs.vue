<template>
    <v-container>
        <h2 class="text-h6 font-weight-medium">State Outputs</h2>
        <v-divider class="my-4"></v-divider>

        <v-card>
            <v-card-text>
                <v-data-table-server
                    :loading="loading"
                    :items="outputs"
                    :items-length="total"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    items-per-page-text="Outputs per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    :headers="headers"
                    @update:options="loadOutputs">

                    <template v-slot:item.outputIndex="{ item }">
                        <router-link :to="{ name: 'opOutputDetail', params: { outputIndex: item.outputIndex } }" class="text-decoration-none">
                            #{{ item.outputIndex.toLocaleString() }}
                        </router-link>
                    </template>

                    <template v-slot:item.outputRoot="{ item }">
                        <span class="text-truncate" style="max-width: 160px; display: inline-block; font-family: monospace;">
                            {{ item.outputRoot ? `${item.outputRoot.slice(0, 12)}...${item.outputRoot.slice(-8)}` : '-' }}
                        </span>
                    </template>

                    <template v-slot:item.l2BlockNumber="{ item }">
                        <HashLink v-if="item.l2BlockNumber" :type="'block'" :hash="item.l2BlockNumber" />
                        <span v-else class="text-medium-emphasis">-</span>
                    </template>

                    <template v-slot:item.l1BlockNumber="{ item }">
                        {{ item.l1BlockNumber.toLocaleString() }}
                    </template>

                    <template v-slot:item.proposer="{ item }">
                        <HashLink :type="'address'" :hash="item.proposer" :withTokenName="true" />
                    </template>

                    <template v-slot:item.timestamp="{ item }">
                        <div class="my-2 text-left">
                            {{ $dt.shortDate(item.timestamp) }}<br>
                            <small>{{ $dt.fromNow(item.timestamp) }}</small>
                        </div>
                    </template>

                    <template v-slot:item.status="{ item }">
                        <v-chip :color="statusColors[item.status]">
                            {{ statusLabels[item.status] }}
                        </v-chip>
                    </template>

                    <template v-slot:no-data>
                        <div class="text-center pa-4">
                            No outputs found
                        </div>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, reactive, inject } from 'vue';
import HashLink from '@/components/HashLink.vue';

const loading = ref(false);
const total = ref(0);
const outputs = ref([]);

const $server = inject('$server');
const $dt = inject('$dt');

const currentOptions = reactive({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'outputIndex', order: 'desc' }]
});

const headers = [
    { title: 'Output #', key: 'outputIndex', sortable: true },
    { title: 'Output Root', key: 'outputRoot', sortable: false },
    { title: 'L2 Block', key: 'l2BlockNumber', sortable: false },
    { title: 'L1 Block', key: 'l1BlockNumber', sortable: false },
    { title: 'Proposer', key: 'proposer', sortable: false },
    { title: 'Timestamp', key: 'timestamp', sortable: false },
    { title: 'Status', key: 'status', sortable: false }
];

const statusColors = {
    proposed: 'info',
    challenged: 'warning',
    resolved: 'primary',
    finalized: 'success'
};

const statusLabels = {
    proposed: 'Proposed',
    challenged: 'Challenged',
    resolved: 'Resolved',
    finalized: 'Finalized'
};

async function loadOutputs({ page, itemsPerPage, sortBy } = {}) {
    loading.value = true;

    if (!page || !itemsPerPage || !sortBy || !sortBy.length)
        return loading.value = false;

    Object.assign(currentOptions, {
        page,
        itemsPerPage,
        sortBy
    });

    $server.getOpOutputs({
        page,
        itemsPerPage,
        order: sortBy[0].order.toUpperCase()
    }).then(({ data }) => {
        outputs.value = data.items;
        total.value = data.total;
    })
    .catch(console.log)
    .finally(() => loading.value = false);
}
</script>
