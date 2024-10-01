<template>
    <v-container fluid>
        <v-card border flat>
            <v-card-text>
                <template v-if="userStore.isAdmin">
                    <v-alert v-if="removedContract" density="compact" text type="success">Contract at address <b>{{ removedContract }}</b> has been successfully removed.</v-alert>
                    <v-alert density="compact" text v-show="!canImport" type="warning">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true">upgrade</Upgrade-Link> to the Premium plan for more.</v-alert>
                    <Import-Contract-Modal ref="importContractModal" />
                    <Remove-Contract-Confirmation-Modal @refresh="getContracts" ref="removeContractConfirmationModal" />
                </template>
                <v-data-table-server
                    :loading="loading"
                    :items="contracts"
                    :headers="headers"
                    :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
                    :must-sort="true"
                    :sort-desc="true"
                    :items-length="contractCount"
                    :footer-props="{
                        itemsPerPageOptions: [10, 25, 100]
                    }"
                    item-key="address"
                    @update:options="getContracts">
                    <template v-slot:top v-if="userStore.isAdmin">
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
                    <template v-slot:item.actions="{ item }" v-if="userStore.isAdmin">
                        <v-btn variant="text" icon="mdi-delete" color="error" size="x-small" @click="openRemoveContractConfirmationModal(item.address)"></v-btn>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
const moment = require('moment');
import { mapStores } from 'pinia';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
import { useUserStore } from '@/stores/user';
import ImportContractModal from './ImportContractModal';
import HashLink from './HashLink';
import UpgradeLink from './UpgradeLink';
import RemoveContractConfirmationModal from './RemoveContractConfirmationModal';
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
        currentOptions: { page: 1, itemsPerPage: 10, orderBy: 'timestamp', order: 'desc' },
        newContractPusherHandler: null,
        destroyedContractPusherHandler: null
    }),
    mounted: function() {
        if (this.userStore.isAdmin)
            this.headers.push({ text: '', value: 'remove' });

        this.newContractPusherHandler = this.$pusher.onNewContract(() => this.getContracts(this.currentOptions), this);
        this.destroyedContractPusherHandler = this.$pusher.onDestroyedContract(() => this.getContracts(this.currentOptions), this);
    },
    destroyed() {
        this.newContractPusherHandler.unbind(null, null, this);
        this.destroyedContractPusherHandler.unbind(null, null, this);
    },
    methods: {
        moment: moment,
        getContracts: function({ page, itemsPerPage, sortBy }) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            if (this.currentOptions.page == page && this.currentOptions.itemsPerPage == itemsPerPage && this.currentOptions.sortBy == sortBy[0].key && this.currentOptions.sort == sortBy[0].order)
                return this.loading = false;

            const options = {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order
            };

            this.$server.getContracts(options)
                .then(({ data }) => {
                    this.contracts = data.items;
                    this.contractCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        formatContractPattern,
        openRemoveContractConfirmationModal: function(address) {
            this.$refs.removeContractConfirmationModal
                .open({ address: address, workspace: this.currentWorkspaceStore.name });
        },
        openImportContractModal: function() {
            this.$refs.importContractModal.open({ contractsCount: this.contracts.length });
        },
        goToBilling: function() {
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
    },
    computed: {
        ...mapStores(
            useCurrentWorkspaceStore,
            useUserStore
        ),
        canImport: function() {
            return this.currentWorkspaceStore.public || this.contracts.length < 10 || this.user.plan != 'free';
        },
        removedContract: function() {
            return this.$route.query.removedContract ? this.$route.query.removedContract : null;
        }
    }
}
</script>
