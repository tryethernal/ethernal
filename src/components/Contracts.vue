<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="contracts"
            :headers="headers">
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
import HashLink from './HashLink.vue';
import FromWei from '../filters/FromWei';

export default {
    name: 'Contracts',
    components: {
        HashLink
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
    }
}
</script>
