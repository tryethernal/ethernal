<template>
    <v-card border flat :disabled="disabled">
        <New-Explorer-Domain-Modal ref="newExplorerDomainModal" />
        <v-card-text>
            <v-alert v-if="disabled" text type="warning">Upgrade your plan to activate domain aliases.</v-alert>
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

<script>
import ExplorerDomain from './ExplorerDomain';
import NewExplorerDomainModal from './NewExplorerDomainModal.vue';

export default {
    name: 'ExplorerDomainsList',
    props: ['explorer', 'disabled'],
    components: {
        ExplorerDomain,
        NewExplorerDomainModal
    },
    data: () => ({
        loading: false,
        domains: []
    }),
    mounted() {
        this.domains = this.explorer.domains;
    },
    methods: {
        reloadDomains() {
            this.$server.getExplorer(this.explorer.id)
                .then(({ data }) => this.domains = data.domains)
                .catch(console.log);
        },
        openNewExplorerDomainModal() {
            this.$refs.newExplorerDomainModal
                .open({ explorer: this.explorer })
                .then(refresh => {
                    if (refresh) this.reloadDomains();
                });
        },
        showDnsInfo(domain) {
            this.$refs.newExplorerDomainModal
                .open({ onlyDnsInfo: true, domain });
        }
    },
    computed: {
    }
}
</script>
