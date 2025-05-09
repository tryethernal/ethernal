<template>
    <v-list-item :disabled="loading" class="pl-0">
        <Explorer-Domain-DNS-Info-Modal ref="explorerDomainDnsInfo" />
        <template v-slot:prepend>
            <v-btn density="compact" variant="text" @click.stop="deleteDomain()" icon="mdi-delete" :color="loading ? 'grey' : 'error'" size="small"></v-btn>
            <v-btn density="compact" variant="text" @click.stop="loadDnsStatus()" icon="mdi-refresh" :color="loading ? 'grey' : 'primary'" size="small"></v-btn>
        </template>
        <template v-slot:subtitle>
            <a class="ml-2" :href="`//${domain.domain}`" target="_blank">{{  domain.domain }}</a>&nbsp;|&nbsp;
            <span v-if="loading && !deleting">Fetching DNS status...</span>
            <template v-else-if="dnsStatus.status_message">
                <v-icon size="small" :color="status ? 'success' : 'error'">{{ status ? 'mdi-check' : 'mdi-close' }}</v-icon>
                <a style="text-decoration: underline;" @click.stop="showDnsInfo()">
                    <template v-if="status">{{ dnsStatus.status_message }}</template>
                    <template v-else>Incomplete DNS setup</template>
                </a>
            </template>
            <span v-else>DNS status not available yet.</span>
        </template>
    </v-list-item>
</template>

<script>
import ExplorerDomainDNSInfoModal from './ExplorerDomainDNSInfoModal.vue';

export default {
    name: 'ExplorerDomain',
    props: ['domain'],
    components: {
        ExplorerDomainDNSInfoModal
    },
    data: () => ({
        loading: true,
        deleting: false,
        dnsStatus: {}
    }),
    mounted() {
        this.loadDnsStatus();
    },
    methods: {
        loadDnsStatus() {
            this.loading = true;
            this.$server.getExplorerDomainStatus(this.domain.id)
                .then(({ data }) => this.dnsStatus = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        deleteDomain() {
            if (!confirm('Are you sure you want to delete this alias?'))
                return;
            this.loading = true;
            this.deleting = true;
            this.$server.removeExplorerDomain(this.domain.id)
                .then(() => this.$emit('deleted'))
                .catch(console.log)
                .finally(() => {
                    this.loading = false;
                    this.deleting = false;
                });
        },
        showDnsInfo() {
            this.$refs.explorerDomainDnsInfo
                .open({ dnsStatus: this.dnsStatus, domain: this.domain.domain });
        }
    },
    computed: {
        status() {
            if (!this.dnsStatus)
                return false;
            return this.dnsStatus.apx_hit && this.hasDnsRecord && this.dnsStatus.is_resolving && this.dnsStatus.has_ssl;
        },
        hasDnsRecord() {
            return this.dnsStatus.dns_pointed_at == '37.16.1.34';
        }
    }
}
</script>
