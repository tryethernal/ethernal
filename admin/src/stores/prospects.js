import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/lib/api';

export const useProspectsStore = defineStore('prospects', () => {
    const prospects = ref([]);
    const total = ref(0);
    const stats = ref(null);
    const loading = ref(false);

    async function fetchProspects(filters = {}) {
        loading.value = true;
        try {
            const { data } = await api.get('/prospects', { params: filters });
            prospects.value = data.prospects;
            total.value = data.total;
        } finally {
            loading.value = false;
        }
    }

    async function fetchStats() {
        const { data } = await api.get('/prospects/stats');
        stats.value = data;
    }

    async function updateProspect(id, updates) {
        const { data } = await api.put(`/prospects/${id}`, updates);
        const idx = prospects.value.findIndex(p => p.id === id);
        if (idx !== -1) prospects.value[idx] = data;
        return data;
    }

    async function sendProspect(id) {
        await api.post(`/prospects/${id}/send`);
        await fetchProspects({ status: 'draft_ready' });
    }

    return { prospects, total, stats, loading, fetchProspects, fetchStats, updateProspect, sendProspect };
});
