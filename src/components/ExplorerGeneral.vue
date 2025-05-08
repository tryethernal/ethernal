<template>
    <template v-if="justCreated">
        <v-card>
            <v-card-text>
                <v-progress-circular
                    class="mr-2"
                    indeterminate
                    size="16"
                    width="2"
                    color="primary"></v-progress-circular>
                Your subscripion is being activated. The explorer will be ready soon.
            </v-card-text>
        </v-card>
    </template>
    <template v-else-if="explorer && workspaces.length > 0">
        <v-alert class="mb-2" text type="warning" v-if="explorer.stripeSubscription && explorer.stripeSubscription.isTrialing">
            This explorer is on a free trial plan. To keep it running once it's over, add a payment method.
        </v-alert>
        <v-alert text type="error" v-if="!explorer.stripeSubscription">This explorer is not active. To activate it, start a subscription.</v-alert>
        <div class="text-body-2 mt-4">
            <span class="text-caption">Explorer URL: <a :href="'//' + explorerDomain" target="_blank">{{ explorerDomain }}</a></span>
        </div>
        <v-row class="mt-2">
            <v-col cols="6">
                <h4>Settings</h4>
                <Explorer-Settings :key="JSON.stringify(capabilities)" :explorer="explorer" :workspaces="workspaces" @updated="loadExplorer(id)"/>
            </v-col>
            <v-col cols="6">
                <h4>Sync</h4>
                <Explorer-Sync :explorer="explorer" />
                <template v-if="!envStore.isSelfHosted">
                    <h4 class="mt-2">Billing</h4>
                    <Explorer-Billing :explorer="explorer" @updated="loadExplorer(id)" :sso="sso" />
                </template>
                <h4 class="mt-2">Domain Aliases</h4>
                <Explorer-Domains-List :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.customDomain" @updated="loadExplorer(id)" />
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <h4>Branding</h4>
                <Explorer-Branding :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.branding" @updated="loadExplorer(id)" />
            </v-col>
        </v-row>
        <v-row v-if="!sso">
            <v-col cols="6">
                <h4 class="text-error">Danger Zone</h4>
                <Explorer-Danger-Zone :key="JSON.stringify(capabilities)" :explorer="explorer" />
            </v-col>
        </v-row>
    </template>
    <template v-else>
        <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
    </template>
</template>

<script>
import { mapStores } from 'pinia';
import { useEnvStore } from '../stores/env';
import ExplorerSettings from './ExplorerSettings.vue';
import ExplorerSync from './ExplorerSync.vue';
import ExplorerBilling from './ExplorerBilling.vue';
import ExplorerDomainsList from './ExplorerDomainsList.vue';
import ExplorerBranding from './ExplorerBranding.vue';
import ExplorerDangerZone from './ExplorerDangerZone.vue';

export default {
    name: 'ExplorerGeneral',
    props: ['id', 'sso'],
    components: {
        ExplorerSettings,
        ExplorerSync,
        ExplorerBilling,
        ExplorerDomainsList,
        ExplorerBranding,
        ExplorerDangerZone
    },
    data: () => ({
        workspaces: [],
        explorer: null,
        capabilities: {},
        refreshInterval: null,
        explorerDomain: null
    }),
    methods: {
        loadExplorer(id) {
            this.$server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log);

            this.$server.getExplorer(id)
                .then(({ data }) => {
                    this.explorer = data;
                    if (this.explorer.stripeSubscription) {
                        if (this.refreshInterval)
                            clearInterval(this.refreshInterval);
                        this.capabilities = this.explorer.stripeSubscription.stripePlan.capabilities;
                    }
                    this.explorerDomain = this.explorer.domains.length ?
                        this.explorer.domains[0].domain :
                        `${this.explorer.slug}.${this.envStore.mainDomain}`;
                })
                .catch(console.log);
        }
    },
    computed: {
        ...mapStores(useEnvStore),
        justCreated() {
            if (!this.explorer)
                return false;
            return !this.explorer.stripeSubscription && this.$route.query.status == 'success';
        }
    },
    watch: {
        id: {
            immediate: true,
            handler(id) {
                this.loadExplorer(id);
                if (this.$route.query.status == 'success')
                    this.refreshInterval = setInterval(this.loadExplorer, 3000, id);
            }
        }
    }
}
</script>
