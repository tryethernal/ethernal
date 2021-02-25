<template>
    <v-container fluid>
        <v-data-table
            loading="true"
            :items="transactions"
            :sort-by="'blockNumber'"
            :sort-desc="true"
            :headers="headers"
            item-key="hash">
            <template v-slot:item.from="{ item }">
                <Hash-Link :type="'address'" :hash="item.from" />
            </template>
            <template v-slot:item.to="{ item }">
                <Hash-Link :type="'address'" :hash="item.to" />
            </template>
            <template v-slot:item.timestamp="{ item }">
                {{ item.timestamp | moment('from') }}
            </template>
            <template v-slot:item.hash="{ item }">
                <v-icon small v-if="!item.receipt.status" color="error lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                <Hash-Link :type="'transaction'" :hash="item.hash" />
            </template>
            <template v-slot:item.fee="{ item }">
                {{ item.gasPrice * item.gas | fromWei }}
            </template>
            <template v-slot:item.value="{ item }">
                {{ item.value | fromWei }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import FromWei from '../filters/FromWei.js';
import HashLink from './HashLink.vue';

export default {
    name: 'Transactions',
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        transactions: [],
        headers: [
            {
                text: 'Txn Hash',
                value: 'hash',
                align: 'start'
            },
            {
                text: 'Block',
                value: 'blockNumber'
            },
            {
                text: 'Age',
                value: 'timestamp'
            },
            {
                text: 'From',
                value: 'from'
            },
            {
                text: 'To',
                value: 'to'
            },
            {
                text: 'Value',
                value: 'value'
            },
            {
                text: 'Fee',
                value: 'fee'
            }
        ]
    }),
    mounted: function() {
        this.$bind('transactions', this.db.collection('transactions'));
    },
    methods: {
        getRowClass: function(item) {
            return item.receipt.status ? '' : 'error lighten-5';
        }
    }
}
</script>
