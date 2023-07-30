<template>
    <v-container fluid>
        <Create-Explorer-Modal ref="createExplorerModalRef" />
        <v-alert v-if="deletedExplorer" dense text type="success">Explorer "<b>{{ deletedExplorer }}</b>" has been successfully deleted.</v-alert>
        <v-data-table
            :loading="loading"
            :items="explorers"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="explorerCount"
            :sort-by="currentOptions.sortBy[0]"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            :headers="headers"
            @update:options="getExplorers">
            <template v-slot:top>
                <v-toolbar flat dense class="py-0">
                    <v-spacer></v-spacer>
                    <v-btn small depressed color="primary" class="mr-2" @click="openCreateExplorerModal()">
                        <v-icon small class="mr-1">mdi-plus</v-icon>Create Explorer
                    </v-btn>
                </v-toolbar>
            </template>
            <template v-slot:item.name="{ item }">
                <v-tooltip top>
                    <template v-slot:activator="{ on, attrs }">
                        <v-icon v-bind="attrs" v-on="on" small :color="statusClass(item.stripeSubscription) + ' lignthen'" class="mr-2">{{ statusIcon(item.stripeSubscription) }}</v-icon>
                    </template>
                    {{ statusText(item.stripeSubscription) }}
                </v-tooltip>
                <router-link :to="`/explorers/${item.id}`">{{ item.name }}</router-link>
            </template>
            <template v-slot:item.domain="{ item }">
                <template v-if="item.domains.length > 0">
                    <a :href="`https://${ item.domains[0].domain }`" target="_blank">https://{{ item.domains[0].domain }}</a>
                    <v-tooltip top v-if="item.domains.length > 1">
                        <template v-slot:activator="{ on, attrs }">
                            <v-chip v-bind="attrs" v-on="on" class="ml-2" x-small >+ {{ item.domains.length - 1 }}</v-chip>
                        </template>
                        <ul>
                            <li v-for="(domain, idx) in item.domains.slice(1)" :key="idx">{{ domain.domain }}</li>
                        </ul>
                    </v-tooltip>
                </template>
                <template v-else>
                    <a :href="`https://${ item.slug }.${ mainDomain }`" target="_blank">https://{{ item.slug }}.{{ mainDomain }}</a>
                </template>
            </template>
            <template v-slot:item.rpcServer="{ item }">
                {{ shortRpcUrl(item.rpcServer) }}
            </template>
            <template v-slot:item.workspace="{ item }">
                {{ item.workspace.name }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import CreateExplorerModal from './CreateExplorerModal.vue';
import { shortRpcUrl } from '../lib/utils';

export default {
    name: 'Explorers',
    components: {
        CreateExplorerModal
    },
    data: () => ({
        mainDomain: process.env.VUE_APP_MAIN_DOMAIN,
        explorers: [],
        explorerCount: 0,
        headers: [],
        loading: true,
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['id'], sortDesc: [true] },
    }),
    mounted() {
        this.headers.push(
            { text: 'Name', value: 'name' },
            { text: 'Workspace', value: 'workspace', sortable: false },
            { text: 'Domains', value: 'domain', sortable: false },
            { text: 'RPC', value: 'rpcServer', sortable: false }
        );
    },
    methods: {
        shortRpcUrl,
        getExplorers(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc',
                orderBy: this.currentOptions.sortBy[0]
            };
            this.server.getExplorers(options)
                .then(({ data }) => {
                    this.explorers = data.items;
                    this.explorerCount = data.total;
                })
                .catch(console.log)
                .finally(this.loading = false);
        },
        openCreateExplorerModal() {
            this.$refs.createExplorerModalRef.open();
        },
        statusClass(subscription) {
            if (!subscription) return 'error';
            else if (subscription.isActive) return 'success';
            else if (subscription.isPendingCancelation) return 'warning';
            return '';
        },
        statusIcon(subscription) {
            if (!subscription) return 'mdi-alert-circle';
            else if (subscription.isActive) return 'mdi-check-circle';
            else if (subscription.isPendingCancelation) return 'mdi-alert';
            return '';
        },
        statusText(subscription) {
            if (!subscription) return 'Inactive';
            else if (subscription.isActive) return 'Active';
            else if (subscription.isPendingCancelation) return 'Pending Cancelation';
            return '';
        }
    },
    computed: {
        deletedExplorer() {
            return this.$route.query.deletedExplorer ? this.$route.query.deletedExplorer : null;
        }
    }
}
</script>
