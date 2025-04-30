<template>
    <ImportArtifactModal ref="importModal" />
    <v-card>
        <v-card-text>
            <v-chip-group :selected-class="`text-${contrastingColor}`" v-model="activeTab" mandatory>
                <v-chip label size="small" value="code">Code</v-chip>
                <v-chip label size="small" value="read">Read Contract ({{ filteredCounts.read }})</v-chip>
                <v-chip label size="small" value="write">Write Contract ({{ filteredCounts.write }})</v-chip>
            </v-chip-group>

            <v-card v-if="userStore.isAdmin" class="mt-2">
                <v-card-text>
                    Manually override contract name & ABI <a href="#" class="text-primary text-decoration-none" @click.prevent="openImportModal">here</a>.
                </v-card-text>
            </v-card>

            <div v-show="activeTab === 'code'" class="mt-4">
                <ContractCode :contract="contract" />
            </div>

            <div v-show="activeTab === 'read' || activeTab === 'write'" class="mt-4">
                <ContractReadWrite 
                    :contract="contract" 
                    :force-tab="activeTab"
                    @update-filtered-counts="onUpdateFilteredCounts" />
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import { useUserStore } from '../stores/user';
import { getBestContrastingColor } from '../lib/utils';
import ContractCode from './ContractCode.vue';
import ContractReadWrite from './ContractReadWrite.vue';
import ImportArtifactModal from './ImportArtifactModal.vue';

const props = defineProps(['contract']);

const userStore = useUserStore();
const activeTab = ref('code');
const filteredCounts = ref({ read: 0, write: 0 });
const importModal = ref(null);

// Add for chip group styling
const contrastingColor = computed(() => {
    const theme = useTheme();
    return getBestContrastingColor(theme.current.value.colors['surface-variant'], theme.current.value.colors);
});

const onUpdateFilteredCounts = (counts) => {
    filteredCounts.value = counts;
};

const updateTabFromHash = () => {
    const hash = window.location.hash.substring(1);
    if (hash === 'readContract') {
        activeTab.value = 'read';
    } else if (hash === 'writeContract') {
        activeTab.value = 'write';
    } else if (hash === 'code') {
        activeTab.value = 'code';
    }
};

const openImportModal = async () => {
    if (importModal.value) {
        const updated = await importModal.value.open({
            address: props.contract.address,
            name: props.contract.name,
            abi: props.contract.abi ? JSON.stringify(props.contract.abi, null, 2) : ''
        });

        if (updated)
            window.location.reload();
    }
};

// Watch for hash changes
onMounted(() => {
    updateTabFromHash();
    window.addEventListener('hashchange', updateTabFromHash);
});

// Update hash when tab changes
watch(() => activeTab.value, (newTab) => {
    const hashMap = {
        'code': 'code',
        'read': 'readContract',
        'write': 'writeContract'
    };
    if (window.location.hash.substring(1) !== hashMap[newTab]) {
        window.location.hash = hashMap[newTab];
    }
});
</script>

<style>
:deep(.v-chip-group) {
    overflow: visible !important;
}

:deep(.v-chip-group__content) {
    overflow: visible !important;
}
</style>
