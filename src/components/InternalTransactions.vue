<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Contract Internal Transactions</h2>
        <v-divider class="my-4"></v-divider>
        <v-card>
            <v-card-text>
                <Trace-Steps-Table
                    :loading="loading"
                    :items="items"
                    :total-items="totalItems"
                    :dense="dense"
                    @update:options="fetchWorkspaceTraceSteps" />
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { defineProps, inject } from 'vue';
import TraceStepsTable from './TraceStepsTable.vue';

const props = defineProps({
    dense: Boolean,
});

// State
const loading = ref(false);
const items = ref([]);
const totalItems = ref(0);
const $server = inject('$server');

const fetchWorkspaceTraceSteps = async ({ page, itemsPerPage }) => {
    loading.value = true;
    try {
        const { data } = await $server.getWorkspaceTransactionTraceSteps({ page, itemsPerPage });
        items.value = data.items;
        totalItems.value = items.value.length == itemsPerPage ?
            (page * itemsPerPage) + 1 :
            page * itemsPerPage;
    } catch (error) {
        console.error('Error fetching trace steps:', error);
    } finally {
        loading.value = false;
    }
};
</script> 