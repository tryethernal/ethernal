<template>
    <v-container fluid>
        <template v-if="isUserAdmin">
            <v-alert v-if="removedContract" dense text type="success">Contract at address <b>{{ removedContract }}</b> has been successfully removed.</v-alert>
            <v-alert dense text v-show="!canImport" type="warning">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link @goToBilling="goToBilling" :emit="true">upgrade</Upgrade-Link> to the Premium plan for more.</v-alert>
            <Import-Contract-Modal ref="importContractModal" />
            <Remove-Contract-Confirmation-Modal @refresh="getContracts" ref="removeContractConfirmationModal" />
        </template>
        <v-data-table
            :loading="loading"
            :items="contracts"
            :headers="headers"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="contractCount"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            item-key="address"
            @update:options="getContracts">
            <template v-slot:top v-if="isUserAdmin">
                <v-toolbar flat dense class="py-0">
                    <v-spacer></v-spacer>
                    <v-btn small depressed color="primary" class="mr-2" @click="openImportContractModal()">
                        <v-icon small class="mr-1">mdi-import</v-icon>Import Contract
                    </v-btn>
                </v-toolbar>
            </template>
            <template v-slot:no-data>
                No contracts found - <a href="https://doc.tryethernal.com/getting-started/cli" target="_blank">Did you set up the CLI?</a>
            </template>
            <template v-slot:item.tags="{ item }">
                <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" x-small class="success mr-2">
                    {{ formatContractPattern(pattern) }}
                </v-chip>
            </template>
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'contract'" :hash="item.address" />
            </template>
            <template v-slot:item.timestamp="{ item }">
                <template v-if="item.timestamp">
                    <v-tooltip top :open-delay="150" color="grey darken-3">
                        <template v-slot:activator="{ on, attrs }">
                            <span v-bind="attrs" v-on="on">
                                {{ moment(item.timestamp) | moment('MM/DD h:mm:ss A') }}
                            </span>
                        </template>
                        {{ moment(item.timestamp).fromNow() }}
                    </v-tooltip>
                </template>
            </template>
            <template v-slot:item.actions="{ item }" v-if="isUserAdmin">
                <v-btn color="error" x-small icon @click="openRemoveContractConfirmationModal(item.address)">
                    <v-icon>mdi-delete</v-icon>
                </v-btn>
            </template>
        </v-data-table>
    </v-container>
</template>
<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
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
                text: 'Address',
                value: 'address'
            },
            {
                text: 'Name',
                value: 'name'
            },
            {
                text: 'Deployed On',
                value: 'timestamp'
            },
            {
                text: '',
                value: 'tags'
            },
            {
                test: '',
                value: 'actions'
            }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['timestamp'], sortDesc: [true] },
        newContractPusherHandler: null,
        destroyedContractPusherHandler: null
    }),
    mounted: function() {
        if (this.currentWorkspace.isAdmin)
            this.headers.push({ text: '', value: 'remove' });

        this.newContractPusherHandler = this.pusher.onNewContract(() => this.getContracts(this.currentOptions), this);
        this.destroyedContractPusherHandler = this.pusher.onDestroyedContract(() => this.getContracts(this.currentOptions), this);
    },
    destroyed() {
        this.newContractPusherHandler.unbind(null, null, this);
        this.destroyedContractPusherHandler.unbind(null, null, this);
    },
    methods: {
        moment: moment,
        getContracts: function(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                sortBy: this.currentOptions.sortBy[0],
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };

            this.server.getContracts(options)
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
                .open({ address: address, workspace: this.currentWorkspace.name });
        },
        openImportContractModal: function() {
            this.$refs.importContractModal.open({ contractsCount: this.contracts.length });
        },
        goToBilling: function() {
            this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        },
    },
    computed: {
        ...mapGetters([
            'user',
            'currentWorkspace',
            'isUserAdmin'
        ]),
        canImport: function() {
            return this.contracts.length < 10 || this.user.plan != 'free';
        },
        removedContract: function() {
            return this.$route.query.removedContract ? this.$route.query.removedContract : null;
        }
    }
}
</script>
