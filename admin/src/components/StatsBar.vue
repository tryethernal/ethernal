<template>
    <v-row v-if="stats" dense class="mb-4">
        <v-col v-for="item in statusCounts" :key="item.status" cols="6" sm="3" md="2">
            <v-card variant="outlined" class="text-center pa-2">
                <div class="text-h5">{{ item.count }}</div>
                <div class="text-caption text-medium-emphasis">{{ formatStatus(item.status) }}</div>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ stats: Object });

const statusCounts = computed(() => {
    if (!props.stats?.byStatus) return [];
    return props.stats.byStatus.map(s => ({
        status: s.status,
        count: parseInt(s.count, 10)
    }));
});

function formatStatus(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
</script>
