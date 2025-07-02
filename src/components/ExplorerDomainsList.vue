<template>
    <v-card :disabled="disabled">
        <NewExplorerDomainModal ref="newExplorerDomainModal" />
        <v-card-text>
            <v-alert class="mb-4" density="compact" v-if="disabled" text type="warning">Upgrade your plan to activate domain aliases.</v-alert>
            <v-list v-if="domains.length" class="py-0 mb-4">
                <Explorer-Domain @deleted="reloadDomains()" v-for="(domain, idx) in domains" :domain="domain" :key="idx" />
            </v-list>
            <div v-else class="mb-2">
                No aliases yet.
            </div>
            <div>
                <v-btn :disabled="loading" color="primary" @click.stop="openNewExplorerDomainModal()">Add Domain Alias</v-btn>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import ExplorerDomain from './ExplorerDomain.vue';
import NewExplorerDomainModal from './NewExplorerDomainModal.vue';

const props = defineProps({
    explorer: { type: Object, required: true },
    disabled: { type: Boolean, default: false }
});

const loading = ref(false);
const domains = ref([]);
const newExplorerDomainModal = ref(null);

const $server = inject('$server');

onMounted(() => {
    domains.value = props.explorer.domains;
});

function reloadDomains() {
    loading.value = true;

    $server.getExplorer(props.explorer.id)
        .then(({ data }) => {
            domains.value = data.domains;
        })
        .catch(console.log)
        .finally(() => {
            loading.value = false;
        });
}

function openNewExplorerDomainModal() {
    newExplorerDomainModal.value
        .open({ explorer: props.explorer })
        .then(refresh => {
            if (refresh) reloadDomains();
        });
}

function showDnsInfo(domain) {
    newExplorerDomainModal.value
        .open({ onlyDnsInfo: true, domain });
}
</script>
