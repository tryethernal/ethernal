<template>
    <v-container fluid>
        <v-card outlined>
            <v-card-text>
                <Create-Explorer-Modal ref="createExplorerModalRef" @explorerCreated="getExplorers" />
                <v-card v-if="!explorers.length && !loading" flat outlined>
                    <v-card-title>Public Explorers</v-card-title>
                    <v-card-text>
                        At the moment, only your account is able to use this explorer.
                        If you are collaborating with others on this chain or another, or if you want to provide your users with an explorer,
                        you might be interested in setting up a public explorer that will
                        be easily accessible, without needing a login, to anyone that needs it.<br><br>

                        You will get the following:
                        <ul>
                            <li>A public explorer showing blocks, transactions, contracts, tokens, etc...</li>
                            <li>A custom url like http://explorer.myprotocol.com to access it</li>
                            <li>A Metamask integration so your users can easily interact with contracts</li>
                            <li>A contract verification system through a CLI or an UI</li>
                            <li>Chain analytics</li>
                            <li>Custom branding with your colors, logo, etc...</li>
                            <li>And of course all the feature that you are already currently using such as transaction decoding, transfers & balance changes display, tokens detection, etc...</li>
                        </ul>

                        <div class="mt-4" align="center">
                            <v-btn depressed color="primary" class="mr-2" @click="openCreateExplorerModal()">
                                <v-icon class="mr-1">mdi-plus</v-icon>Create Explorer
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
                <template v-else>
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
                                <a :href="`http://${ item.domains[0].domain }`" target="_blank">{{ item.domains[0].domain }}</a>
                                <v-tooltip top v-if="item.domains.length > 1">
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-chip v-bind="attrs" v-on="on" class="ml-2" x-small>+ {{ item.domains.length - 1 }}</v-chip>
                                    </template>
                                    <ul>
                                        <li v-for="(domain, idx) in item.domains.slice(1)" :key="idx">{{ domain.domain }}</li>
                                    </ul>
                                </v-tooltip>
                            </template>
                            <template v-else>
                                <a :href="`http://${ item.slug }.${ mainDomain }`" target="_blank">{{ item.slug }}.{{ mainDomain }}</a>
                            </template>
                        </template>
                        <template v-slot:item.rpcServer="{ item }">
                            {{ shortRpcUrl(item.rpcServer) }}
                        </template>
                        <template v-slot:item.workspace="{ item }">
                            {{ item.workspace.name }}
                        </template>
                    </v-data-table>
                </template>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
import { mapGetters } from 'vuex';
import CreateExplorerModal from './CreateExplorerModal.vue';
import { shortRpcUrl } from '../lib/utils';

export default {
    name: 'Explorers',
    components: {
        CreateExplorerModal
    },
    data: () => ({
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
                .finally(() => this.loading = false);
        },
        openCreateExplorerModal() {
            this.$refs.createExplorerModalRef.open()
                .then(this.getExplorers);
        },
        statusClass(subscription) {
            if (!subscription) return 'error';
            else if (subscription.isActive || subscription.isTrialingWithCard) return 'success';
            else if (subscription.isPendingCancelation || subscription.isTrialing) return 'warning';
            return '';
        },
        statusIcon(subscription) {
            if (!subscription) return 'mdi-alert-circle';
            else if (subscription.isActive || subscription.isTrialingWithCard) return 'mdi-check-circle';
            else if (subscription.isPendingCancelation || subscription.isTrialing) return 'mdi-alert';
            return '';
        },
        statusText(subscription) {
            if (!subscription) return 'Inactive';
            else if (subscription.isActive) return 'Active';
            else if (subscription.isPendingCancelation) return 'Pending Cancelation';
            else if (subscription.isTrialing) return 'Ongoing Trial - Set up a payment method to keep your explorer running';
            else if (subscription.isTrialingWithCard) return 'Ongoing Trial';
            return '';
        }
    },
    computed: {
        ...mapGetters([
            'mainDomain'
        ]),
        deletedExplorer() {
            return this.$route.query.deletedExplorer ? this.$route.query.deletedExplorer : null;
        }
    }
}
</script>
