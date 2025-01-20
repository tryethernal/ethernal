<template>
    <v-container fluid>
        <v-card>
            <v-card-text>
                <template v-if="envStore.isAdmin">
                    <v-alert class="mb-4" v-if="removedContract" density="compact" text type="success">Contract at address <b>{{ removedContract }}</b> has been successfully removed.</v-alert>
                    <v-alert class="mb-4" density="compact" text v-show="!canImport" type="warning">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true"><span class="text-white text-decoration-underline font-weight-bold">upgrade</span></Upgrade-Link> to the Premium plan for more.</v-alert>
                    <Import-Contract-Modal ref="importContractModal" />
                    <Remove-Contract-Confirmation-Modal @refresh="getContracts" ref="removeContractConfirmationModal" />
                </template>
                <v-data-table-server
                    class="hide-table-count"
                    :loading="loading"
                    :items="contracts"
                    :items-length="0"
                    :headers="headers"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    :sort-desc="true"
                    items-per-page-text="Rows per page:"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    item-key="address"
                    @update:options="getContracts">
                    <template v-slot:top v-if="envStore.isAdmin">
                        <div class="d-flex justify-end">
                            <v-btn max-width="175" size="small" variant="flat" color="primary" class="mr-2" @click="openImportContractModal()">
                                <v-icon size="small" class="mr-1">mdi-import</v-icon>Import Contract
                            </v-btn>
                        </div>
                    </template>
                    <template v-slot:no-data>
                        No contracts found
                    </template>
                    <template v-slot:item.tags="{ item }">
                        <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </template>
                    <template v-slot:item.address="{ item }">
                        <Hash-Link :type="'address'" :hash="item.address" :contract="item" />
                    </template>
                    <template v-slot:item.timestamp="{ item }">
                        <template v-if="item.creationTransaction">
                            <v-tooltip location="top" :open-delay="150" color="grey-darken-3">
                                <template v-slot:activator="{ props }">
                                    <span v-bind="props">
                                        {{ $dt.shortDate(item.timestamp) }}
                                    </span>
                                </template>
                                {{ $dt.fromNow(item.timestamp) }}
                            </v-tooltip>
                        </template>
                    </template>
                    <template v-slot:item.actions="{ item }" v-if="envStore.isAdmin">
                        <v-btn variant="text" icon="mdi-delete" color="error" size="x-small" @click="openRemoveContractConfirmationModal(item.address)"></v-btn>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useUserStore } from '@/stores/user';
import { useEnvStore } from '@/stores/env';
import ImportContractModal from './ImportContractModal.vue';
import HashLink from './HashLink.vue';
import UpgradeLink from './UpgradeLink.vue';
import RemoveContractConfirmationModal from './RemoveContractConfirmationModal.vue';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'Contracts',
    components: {
        HashLink,
        ImportContractModal,
        UpgradeLink,
        RemoveContractConfirmationModal
    },
    data: () => ({
        loading: true,
        contracts: [],
        contractCount: 0,
        headers: [
            {
                title: 'Address',
                key: 'address'
            },
            {
                title: 'Name',
                key: 'name'
            },
            {
                title: 'Deployed On',
                key: 'timestamp'
            },
            {
                title: '',
                key: 'tags',
                sortable: false
            },
            {
                title: '',
                key: 'actions',
                sortable: false
            }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'timestamp', order: 'desc' }] },
        newContractPusherHandler: null,
        destroyedContractPusherHandler: null
    }),
    mounted() {
        if (this.envStore.isAdmin)
            this.headers.push({ text: '', value: 'remove' });

        this.newContractPusherHandler = this.$pusher.onNewContract(() => this.getContracts(this.currentOptions), this);
        this.destroyedContractPusherHandler = this.$pusher.onDestroyedContract(() => this.getContracts(this.currentOptions), this);
    },
    destroyed() {
        this.newContractPusherHandler.unbind(null, null, this);
        this.destroyedContractPusherHandler.unbind(null, null, this);
    },
    methods: {
        getContracts({ page, itemsPerPage, sortBy }) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                sortBy
            };

            this.$server.getContracts({ page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order })
                .then(({ data }) => {
                    this.contracts = data.items;
                    this.contractCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        formatContractPattern,
        openRemoveContractConfirmationModal(address) {
            this.$refs.removeContractConfirmationModal
                .open({ address: address, workspace: this.currentWorkspaceStore.name });
        },
        openImportContractModal() {
            this.$refs.importContractModal
                .open({ contractsCount: this.contracts.length })
                .then(() => this.getContracts(this.currentOptions));
        },
        goToBilling() {
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
    },
    computed: {
        ...mapStores(
            useCurrentWorkspaceStore,
            useUserStore,
            useEnvStore
        ),
        canImport() {
            return this.currentWorkspaceStore.public || this.contracts.length < 10 || this.userStore.plan != 'free';
        },
        removedContract() {
            return this.$route.query.removedContract ? this.$route.query.removedContract : null;
        }
    }
}
</script>
