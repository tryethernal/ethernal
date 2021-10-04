<template>
    <v-container fluid>
        <Import-Contract-Modal ref="importContractModal" />
        <v-data-table
            :loading="loading"
            :items="contracts"
            :headers="headers"
            sort-by="timestamp"
            :sort-desc="true">
            <template v-slot:top>
                <v-toolbar flat dense class="py-0">
                    <v-spacer></v-spacer>
                    <v-btn small depressed color="primary" class="mr-2" @click="openImportContractModal()">
                        <v-icon small class="mr-1">mdi-import</v-icon>Import Contract
                    </v-btn>
                </v-toolbar>
                <v-alert text type="warning" v-show="contracts.length >= 10 && user.plan == 'free'">Free plan users are limited to 10 synced contracts. Remove some contracts or <Upgrade-Link>upgrade</Upgrade-Link> to the Premium plan to sync more.</v-alert>
            </template>
            <template v-slot:no-data>
                No contracts found - <a href="https://doc.tryethernal.com/getting-started/cli" target="_blank">Did you set up the CLI?</a>
            </template>
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.timestamp="{ item }">
                <span v-if="item.timestamp">{{ parseInt(item.timestamp) | moment('YYYY-MM-DD h:mm:ss A') }}</span>
            </template>
        </v-data-table>
    </v-container>
</template>
<script>
import { mapGetters } from 'vuex';
import ImportContractModal from './ImportContractModal';
import HashLink from './HashLink';
import UpgradeLink from './UpgradeLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'Contracts',
    components: {
        HashLink,
        ImportContractModal,
        UpgradeLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: true,
        contracts: [],
        headers: [
            {
                text: 'Address',
                value: 'address'
            },
            {
                text: 'Deployed On',
                value: 'timestamp'
            },
            {
                text: 'Name',
                value: 'name'
            }
        ]
    }),
    mounted: function() {
        this.$bind('contracts', this.db.collection('contracts'), { serialize: snapshot => Object.defineProperty(snapshot.data(), 'address', { value: snapshot.id })}).then(() => this.loading = false);
    },
    methods: {
        openImportContractModal: function() {
            this.$refs.importContractModal.open({ contractsCount: this.contracts.length });
        }
    },
    computed: {
        ...mapGetters([
            'user'
        ])
    }
}
</script>
