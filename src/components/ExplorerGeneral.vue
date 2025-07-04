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
    <template v-else-if="explorer">
        <v-alert class="my-2" text type="warning" v-if="explorer.stripeSubscription && explorer.stripeSubscription.isTrialing">
            This explorer is on a free trial plan. To keep it running once it's over, add a payment method.
        </v-alert>
        <v-alert class="my-2" text type="error" v-if="!explorer.stripeSubscription">
            This explorer is not active. To activate it, start a subscription.
        </v-alert>
        <div class="text-body-2 mt-4">
            <span class="text-caption">Explorer URL: <a :href="'//' + explorerDomain" target="_blank">{{ explorerDomain }}</a></span><br>
            <span class="text-caption">Workspace: {{ explorer.workspace.name }} - {{ shortRpcUrl(explorer.workspace.rpcServer) }} ({{ explorer.workspace.networkId }})</span>
        </div>
        <v-row class="mt-2">
            <v-col cols="6">
                <h4>Settings</h4>
                <Explorer-Settings :key="JSON.stringify(capabilities)" :explorer="explorer" @updated="() => loadExplorer(id)"/>
            </v-col>
            <v-col cols="6">
                <h4>Sync</h4>
                <Explorer-Sync :explorer="explorer" />
                <template v-if="!envStore.isSelfHosted">
                    <h4 class="mt-2">Billing</h4>
                    <Explorer-Billing :explorer="explorer" @updated="() => loadExplorer(id)" :sso="sso" />
                </template>
                <h4 class="mt-2">Domain Aliases</h4>
                <Explorer-Domains-List :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.customDomain" @updated="() => loadExplorer(id)" />
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <h4>Branding</h4>
                <Explorer-Branding :key="JSON.stringify(capabilities)" :explorer="explorer" :disabled="!explorer.stripeSubscription || !explorer.stripeSubscription.stripePlan.capabilities.branding" @updated="() => loadExplorer(id)" />
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

<script setup>
import { ref, computed, watch, onBeforeUnmount, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useEnvStore } from '../stores/env';
import { shortRpcUrl } from '../lib/utils';
import ExplorerSettings from './ExplorerSettings.vue';
import ExplorerSync from './ExplorerSync.vue';
import ExplorerBilling from './ExplorerBilling.vue';
import ExplorerDomainsList from './ExplorerDomainsList.vue';
import ExplorerBranding from './ExplorerBranding.vue';
import ExplorerDangerZone from './ExplorerDangerZone.vue';

const props = defineProps({
    id: {
        type: [String, Number],
        required: true
    },
    sso: {
        type: Boolean,
        default: false
    }
});

const explorer = ref(null);
const capabilities = ref({});
const refreshInterval = ref(null);
const explorerDomain = ref(null);

const envStore = useEnvStore();
const route = useRoute();
const $server = inject('$server');

function loadExplorer(id) {
    $server.getExplorer(id)
        .then(({ data }) => {
            explorer.value = data;
            if (explorer.value.stripeSubscription) {
                if (refreshInterval.value)
                    clearInterval(refreshInterval.value);
                capabilities.value = explorer.value.stripeSubscription.stripePlan.capabilities;
            }
            explorerDomain.value = explorer.value.domains.length ?
                explorer.value.domains[0].domain :
                window.location.hostname == 'app.tryethernal.com' ? `${explorer.value.slug}.tryethernal.com` : `${explorer.value.slug}.${envStore.mainDomain}`; // SaaS app is setup differently than self-hosted, so we have to rely on this workaround
        })
        .catch(console.log);
}

const justCreated = computed(() => {
    if (!explorer.value)
        return false;
    return !explorer.value.stripeSubscription && route.query.status == 'success';
});

watch(() => props.id, (id) => {
    loadExplorer(id);
    if (route.query.status == 'success') {
        if (refreshInterval.value) clearInterval(refreshInterval.value);
        refreshInterval.value = setInterval(() => loadExplorer(id), 3000);
    }
}, { immediate: true });

onBeforeUnmount(() => {
    if (refreshInterval.value) clearInterval(refreshInterval.value);
});
</script>
