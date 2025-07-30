<template>
    <v-container fluid>
        <h2 class="text-h6 font-weight-medium">Top Accounts by {{ explorerStore.token }} Balance</h2>
        <v-divider class="my-4"></v-divider>
        <v-card class="mt-4">
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :dense="dense"
                    :loading="loading"
                    :items="accounts"
                    :items-length="accountCount"
                    :sort-by="currentOptions.sortBy"
                    :must-sort="true"
                    :headers="headers"
                    :hide-default-footer="dense"
                    :hide-default-header="dense"
                    no-data-text="No accounts indexed yet"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    item-key="address"
                    @update:options="getAccounts">
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted } from 'vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';
import { useEnvStore } from '../stores/env';
import { useExplorerStore } from '../stores/explorer';
import AddAccountModal from './AddAccountModal.vue';
import UnlockAccountModal from './UnlockAccountModal.vue';
import HashLink from './HashLink.vue';
import fromWei from '../filters/FromWei';
import { ethers } from 'ethers';

const $server = inject('$server');

const currentWorkspaceStore = useCurrentWorkspaceStore();
const envStore = useEnvStore();
const explorerStore = useExplorerStore();

const dense = ref(false);
const accounts = ref([]);
const loading = ref(false);
const currentOptions = ref({ page: 1, itemsPerPage: 10, orderBy: 'address', order: 'desc' });
const headers = ref([
    { title: 'Address', key: 'address' },
    { title: 'Balance', key: 'balance' }
]);


function getAccounts({ page, itemsPerPage, sortBy } = {}) {
}

</script>
