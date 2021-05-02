<template>
    <v-container fluid>
        <Import-Contract-Modal ref="importContractModal" />
        <v-data-table
            :loading="loading"
            :items="contracts"
            :headers="headers">
            <template v-slot:top>
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
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
        </v-data-table>
    </v-container>
</template>
<script>
import ImportContractModal from './ImportContractModal';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'Contracts',
    components: {
        HashLink,
        ImportContractModal
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
            this.$refs.importContractModal.open();
        }
    }
}
</script>
