<template>
    <v-container fluid>
        <template v-if="justCreated">
            <v-card outlined>
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
            <v-alert text type="warning" v-if="explorer.stripeSubscription && explorer.stripeSubscription.isTrialing">
                This explorer is on a free trial plan. To keep it running once it's over, add a payment method.
            </v-alert>
            <v-alert text type="error" v-if="!explorer.stripeSubscription">This explorer is not active. To activate it, start a subscription.</v-alert>
            <h2>
                {{ explorer.name }} <span v-if="explorerDomain" class="text-caption">- (<a :href="'//' + explorerDomain" target="_blank">{{ explorerDomain }}</a>)</span>
            </h2>
            <v-row class="mt-2">
                <v-col cols="6">
                    <h4>Settings</h4>
                    <Explorer-Settings :key="JSON.stringify(capabilities)" :explorer="explorer" :workspaces="workspaces" @updated="loadExplorer(id)"/>
                </v-col>
                <v-col cols="6">
                    <h4>Sync</h4>
                    <Explorer-Sync :explorer="explorer" />
                    <template v-if="isBillingEnabled">
                        <h4 class="mt-2">Billing</h4>
                        <Explorer-Billing :explorer="explorer" @updated="loadExplorer(id)" :sso="sso" />
                    </template>
                    <h4 class="mt-2">Domain Aliases</h4>
                    <Explorer-Domains-List :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="isBillingEnabled && (!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.customDomain)" @updated="loadExplorer(id)" />
                </v-col>
            </v-row>
            <v-row>
                <v-col>
                    <h4>Branding</h4>
                    <Explorer-Branding :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="isBillingEnabled && (!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.branding)" @updated="loadExplorer(id)" />
                </v-col>
            </v-row>
            <v-row v-if="!sso">
                <v-col cols="6">
                    <h4 class="error--text">Danger Zone</h4>
                    <Explorer-Danger-Zone :key="JSON.stringify(capabilities)" :explorer="explorer" />
                </v-col>
            </v-row>
        </template>
        <template v-else>
            <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
        </template>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import ExplorerSettings from './ExplorerSettings';
import ExplorerSync from './ExplorerSync';
import ExplorerBilling from './ExplorerBilling';
import ExplorerDomainsList from './ExplorerDomainsList';
import ExplorerBranding from './ExplorerBranding';
import ExplorerDangerZone from './ExplorerDangerZone';

export default {
    name: 'Explorer',
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
            this.server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log);

            this.server.getExplorer(id)
                .then(({ data }) => {
                    this.explorer = data;
                    if (this.explorer.stripeSubscription) {
                        if (this.refreshInterval)
                            clearInterval(this.refreshInterval);
                        this.capabilities = this.explorer.stripeSubscription.stripePlan.capabilities;
                        this.$root.$emit('waitForOnlineSync');
                    }
                    this.explorerDomain = this.explorer.domains.length ?
                        this.explorer.domains[0].domain :
                        `${this.explorer.slug}.${this.mainDomain}`;
                })
                .catch(console.log);
        }
    },
    computed: {
        ...mapGetters([
            'isBillingEnabled',
            'mainDomain'
        ]),
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
