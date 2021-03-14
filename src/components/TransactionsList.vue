<template>
    <v-data-table
        loading="true"
        :items="transactions"
        :sort-by="'blockNumber'"
        :sort-desc="true"
        :headers="headers"
        item-key="hash">
        <template v-slot:item.hash="{ item }">
            <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" small v-if="!item.receipt.status" color="error lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                    <v-icon v-bind="attrs" v-on="on" small v-else color="success lighten-1" class="mr-2">mdi-check-circle</v-icon>
                </template>
                <span v-if="!item.receipt.status">Failed Transaction</span>
                <span v-else>Succeeded Transaction</span>
            </v-tooltip>
            <Hash-Link :type="'transaction'" :hash="item.hash" />
        </template>
        <template v-slot:item.timestamp="{ item }">
            {{ item.timestamp | moment('from') }}
        </template>
        <template v-slot:item.from="{ item }">
            <v-chip x-small class="mr-2" v-if="item.from && item.from === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.from" />
        </template>
        <template v-slot:item.to="{ item }">
            <v-chip x-small class="mr-2" v-if="item.to && item.to === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.to" />
        </template>
        <template v-slot:item.value="{ item }">
            {{ item.value | fromWei }}
        </template>
        <template v-slot:item.fee="{ item }">
            {{ item.gasPrice * (item.gas || item.receipt.gasUsed)  | fromWei }}
        </template>
    </v-data-table>
</template>

<script>
import FromWei from '../filters/FromWei.js';
import HashLink from './HashLink.vue';

export default {
    name: 'TransactionsList',
    props: ['transactions', 'currentAddress'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
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
    })
}
</script>
