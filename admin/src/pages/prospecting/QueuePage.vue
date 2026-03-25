<template>
    <v-container>
        <h1 class="text-h5 mb-4">Prospect Queue</h1>
        <StatsBar :stats="store.stats" />

        <v-progress-linear v-if="store.loading" indeterminate color="primary" />

        <div v-if="!store.loading && !store.prospects.length" class="text-center text-medium-emphasis py-8">
            No prospects awaiting review
        </div>

        <ProspectCard
            v-for="prospect in store.prospects"
            :key="prospect.id"
            :prospect="prospect"
        >
            <template #actions>
                <v-btn
                    size="small"
                    color="success"
                    :disabled="!prospect.contactEmail"
                    @click="handleSend(prospect)"
                >
                    Approve & Send
                </v-btn>
                <v-btn size="small" color="info" :to="`/prospecting/${prospect.id}`">Edit</v-btn>
                <v-btn size="small" color="warning" @click="handleSnooze(prospect)">Snooze</v-btn>
                <v-btn size="small" color="error" @click="handleReject(prospect)">Reject</v-btn>
            </template>
        </ProspectCard>
    </v-container>
</template>

<script setup>
import { onMounted } from 'vue';
import { useProspectsStore } from '@/stores/prospects';
import StatsBar from '@/components/StatsBar.vue';
import ProspectCard from '@/components/ProspectCard.vue';

const store = useProspectsStore();

onMounted(async () => {
    await Promise.all([
        store.fetchProspects({ status: 'draft_ready' }),
        store.fetchStats()
    ]);
});

async function handleSend(prospect) {
    if (confirm(`Send email to ${prospect.contactEmail}?`)) {
        await store.sendProspect(prospect.id);
    }
}

async function handleSnooze(prospect) {
    await store.updateProspect(prospect.id, { status: 'snoozed' });
    await store.fetchProspects({ status: 'draft_ready' });
}

async function handleReject(prospect) {
    await store.updateProspect(prospect.id, { status: 'rejected' });
    await store.fetchProspects({ status: 'draft_ready' });
}
</script>
