<template>
    <v-list-item :disabled="loading" class="pl-0">
        <Explorer-Domain-DNS-Info-Modal ref="explorerDomainDnsInfo" />
        <v-btn style="width: inherit; height: inherit;" @click.stop="deleteDomain()" icon><v-icon small :color="loading ? 'grey' : 'error'">mdi-delete</v-icon></v-btn>
        <v-btn style="width: inherit; height: inherit;" class="mr-2" @click.stop="loadDnsStatus()" icon><v-icon small :color="loading ? 'grey' : 'primary'">mdi-refresh</v-icon></v-btn>
        <v-list-item-content clas="my-0">
            <v-list-item-subtitle>
                <a :href="`https://${domain.domain}`" target="_blank">{{  domain.domain }}</a>&nbsp;|&nbsp;
                <span v-if="loading && !deleting">Fetching DNS status...</span>
                <template v-else-if="dnsStatus.status_message">
                    <v-icon small :color="dnsStatus.status == 'ACTIVE_SSL' ? 'success' : 'error'">{{ dnsStatus.status == 'ACTIVE_SSL' ? 'mdi-check' : 'mdi-close' }}</v-icon>
                    <a style="text-decoration: underline;" @click.stop="showDnsInfo()">
                        {{ dnsStatus.status_message }}
                    </a>
                </template>
                <span v-else>DNS status not available yet.</span>
            </v-list-item-subtitle>
        </v-list-item-content>
    </v-list-item>
</template>

<script>
import ExplorerDomainDNSInfoModal from './ExplorerDomainDNSInfoModal';

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
            this.server.getExplorerDomainStatus(this.domain.id)
                .then(({ data }) => this.dnsStatus = data)
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        deleteDomain() {
            if (!confirm('Are you sure you want to delete this alias?'))
                return;
            this.loading = true;
            this.deleting = true;
            this.server.removeExplorerDomain(this.domain.id)
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
    }
}
</script>
