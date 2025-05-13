<template>
    <v-list-item :disabled="loading" class="pl-0">
        <Explorer-Domain-DNS-Info-Modal ref="explorerDomainDnsInfo" />
        <template v-slot:prepend>
            <v-btn density="compact" variant="text" @click.stop="deleteDomain" icon="mdi-delete" :color="loading ? 'grey' : 'error'" size="small"></v-btn>
            <v-btn v-if="!envStore.isSelfHosted" density="compact" variant="text" @click.stop="loadDnsStatus" icon="mdi-refresh" :color="loading ? 'grey' : 'primary'" size="small"></v-btn>
        </template>
        <template v-slot:subtitle>
            <a class="ml-2" :href="`//${props.domain.domain}`" target="_blank">{{  props.domain.domain }}</a>
            <template v-if="!envStore.isSelfHosted">
                &nbsp;|&nbsp;
                <span v-if="loading && !deleting">Fetching DNS status...</span>
                <template v-else-if="dnsStatus.status_message">
                    <v-icon size="small" :color="status ? 'success' : 'error'">{{ status ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    <a style="text-decoration: underline;" @click.stop="showDnsInfo">
                        <template v-if="status">{{ dnsStatus.status_message }}</template>
                        <template v-else>Incomplete DNS setup</template>
                    </a>
                </template>
                <span v-else>DNS status not available yet.</span>
            </template>
        </template>
    </v-list-item>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue';
import ExplorerDomainDNSInfoModal from './ExplorerDomainDNSInfoModal.vue';
import { useEnvStore } from '@/stores/env';

const props = defineProps({
    domain: { type: Object, required: true }
});

const loading = ref(true);
const deleting = ref(false);
const dnsStatus = ref({});
const explorerDomainDnsInfo = ref(null);
const $server = inject('$server');
const envStore = useEnvStore();

function loadDnsStatus() {
    loading.value = true;
    $server.getExplorerDomainStatus(props.domain.id)
        .then(({ data }) => dnsStatus.value = data)
        .catch(console.log)
        .finally(() => loading.value = false);
}

function deleteDomain() {
    if (!confirm('Are you sure you want to delete this alias?'))
        return;
    loading.value = true;
    deleting.value = true;
    $server.removeExplorerDomain(props.domain.id)
        .then(() => emit('deleted'))
        .catch(console.log)
        .finally(() => {
            loading.value = false;
            deleting.value = false;
        });
}

function showDnsInfo() {
    explorerDomainDnsInfo.value.open({ dnsStatus: dnsStatus.value, domain: props.domain.domain });
}

const status = computed(() => {
    if (!dnsStatus.value)
        return false;
    return dnsStatus.value.apx_hit && hasDnsRecord.value && dnsStatus.value.is_resolving && dnsStatus.value.has_ssl;
});

const hasDnsRecord = computed(() => {
    return dnsStatus.value.dns_pointed_at == '37.16.1.34';
});

const emit = defineEmits(['deleted']);

onMounted(() => {
    loadDnsStatus();
});
</script>
