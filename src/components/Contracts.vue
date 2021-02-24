<template>
    <v-container fluid>
        <v-data-table
            loading="true"
            :items="contracts"
            :headers="headers">
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
        this.$bind('contracts', this.db.collection('contracts'), { serialize: snapshot => Object.defineProperty(snapshot.data(), 'address', { value: snapshot.id })});
    }
}
</script>
