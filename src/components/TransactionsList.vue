<template>
    <v-data-table
        :loading="loading"
        :items="transactions"
        :sort-by="sortBy"
        :must-sort="true"
        :sort-desc="true"
        :headers="headers"
        :server-items-length="total"
        :footer-props="{
            itemsPerPageOptions: [10, 25, 100]
        }"
        item-key="hash"
        @update:options="onPagination">
        <template v-slot:no-data>
            No transactions found - <a href="https://doc.tryethernal.com/getting-started/cli" target="_blank">Did you set up the CLI?</a>
        </template>
        <template v-slot:item.hash="{ item }">
            <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                    <span v-if="item.receipt">
                        <v-icon v-bind="attrs" v-on="on" small v-if="!item.receipt.status" color="error lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                        <v-icon v-bind="attrs" v-on="on" small v-else color="success lighten-1" class="mr-2">mdi-check-circle</v-icon>
                    </span>
                    <span v-else>
                        <v-icon v-bind="attrs" v-on="on" small color="grey lighten-1" class="mr-2">mdi-help-circle</v-icon>
                    </span>
                </template>
                <div v-if="item.receipt">
                    <span v-if="!item.receipt.status">Failed Transaction</span>
                    <span v-else>Succeeded Transaction</span>
                </div>
                <span v-else>Couldn't retrieve receipt, some info is not available.</span>
            </v-tooltip>
            <Hash-Link :type="'transaction'" :hash="item.hash" />
        </template>
        <template v-slot:item.method="{ item }">
            <v-tooltip v-if="item.methodDetails" top :open-delay="150" color="grey darken-3">
                <template v-slot:activator="{ on, attrs }">
                    <v-chip v-bind="attrs" v-on="on" label small color="primary lighten-1">
                        <span class="methodName">{{ getMethodName(item) }}</span>
                    </v-chip>
                </template>
                <span style="white-space: pre">{{ getMethodLabel(item.methodDetails) }}</span>
            </v-tooltip>
            <span v-else>
                <v-chip label small color="primary lighten-1" v-show="getMethodName(item)">{{ getMethodName(item) }}</v-chip>
            </span>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <v-tooltip top :open-delay="150" color="grey darken-3">
                <template v-slot:activator="{ on, attrs }">
                    <span v-bind="attrs" v-on="on">
                        {{ parseInt(item.timestamp) | moment('MM/DD h:mm:ss A') }}
                    </span>
                </template>
                {{ moment(item.timestamp * 1000).fromNow() }}
            </v-tooltip>
        </template>
        <template v-slot:item.from="{ item }">
            <v-chip x-small class="mr-2" v-if="item.from && item.from === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.from" />
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link :to="'/block/' + item.blockNumber">{{ item.blockNumber }}</router-link>
        </template>
        <template v-slot:item.to="{ item }">
            <v-chip x-small class="mr-2" v-if="item.to && item.to === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.to" :withName="true" />
        </template>
        <template v-slot:item.value="{ item }">
            {{ item.value | fromWei('ether', chain.token, 10) }}
        </template>
        <template v-slot:item.fee="{ item }">
            <span v-if="item.receipt">{{ item.gasPrice * (item.gas || item.receipt.gasUsed)  | fromWei('ether', chain.token, 10) }}</span>
        </template>
    </v-data-table>
</template>

<script>
const moment = require('moment');
import { mapGetters } from 'vuex';
import FromWei from '../filters/FromWei.js';
import HashLink from './HashLink.vue';

export default {
    name: 'TransactionsList',
    props: ['transactions', 'currentAddress', 'loading', 'total', 'sortBy'],
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
                align: 'start',
            },
            {
                text: 'Method',
                value: 'method',
                sortable: false
            },
            {
                text: 'Block',
                value: 'blockNumber'
            },
            {
                text: 'Mined On',
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
                value: 'fee',
                sortable: false
            }
        ],
    }),
    methods: {
        moment: moment,
        onPagination: function(pagination) {
            this.$emit('pagination', pagination);
        },
        getMethodName: function(transaction) {
            if (!transaction.methodDetails) return this.getSighash(transaction);
            return transaction.methodDetails.name ? transaction.methodDetails.name : this.getSighash(transaction);
        },
        getMethodLabel: function(methodDetails) {
            if (!methodDetails) return null;
            return methodDetails.label ? methodDetails.label : null;
        },
        getSighash: function(transaction) {
            return transaction.data && transaction.data != '0x' ? transaction.data.slice(0, 10) : null;
        }
    },
    computed: {
        ...mapGetters([
            'chain'
        ])
    }
}
</script>
<style scoped>
.methodName {
    display: block;
    max-width: 11ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
