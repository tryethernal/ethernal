<template>
    <v-data-table
        :loading="loading"
        :items="transactions"
        :sort-by="sortBy"
        :must-sort="true"
        :sort-desc="true"
        :server-items-length="count"
        :headers="headers"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        :footer-props="{
            itemsPerPageOptions: [10, 25, 100]
        }"
        item-key="hash"
        @update:options="onPagination">
        <template v-slot:no-data>
            No transactions found
        </template>
        <template v-slot:item.hash="{ item }">
            <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                    <span v-if="item.receipt">
                        <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'succeeded'" color="success lighten-1" class="mr-2">mdi-check-circle</v-icon>
                        <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'failed'" color="error lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                        <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'unknown'" color="grey lighten-1" class="mr-2">mdi-help-circle</v-icon>
                    </span>
                </template>
                <span v-show="txStatus(item) == 'succeeded'">Suceeded Transaction</span>
                <span v-show="txStatus(item) == 'failed'">Failed Transaction</span>
                <span v-show="txStatus(item) == 'unknown'">Unkown Transaction Status</span>
            </v-tooltip>
            <Hash-Link :type="'transaction'" :hash="item.hash" />
        </template>
        <template v-slot:item.method="{ item }">
            <v-tooltip v-if="item.methodDetails && Object.keys(item.methodDetails).length" top :open-delay="150">
                <template v-slot:activator="{ on, attrs }">
                    <v-chip class="primary lighten-1" v-bind="attrs" v-on="on" label small>
                        <span class="color--text methodName">{{ getMethodName(item) }}</span>
                    </v-chip>
                </template>
                <span style="white-space: pre">{{ getMethodLabel(item.methodDetails) }}</span>
            </v-tooltip>
            <span v-else>
                <v-chip label small color="color--text primary lighten-1" v-show="getMethodName(item)">{{ getMethodName(item) }}</v-chip>
            </span>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ moment(item.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                <small>{{ moment(item.timestamp).fromNow() }}</small>
            </div>
        </template>
        <template v-slot:item.from="{ item }">
            <template v-if="dense">
                <div class="my-2 text-left">
                    From: <Hash-Link :type="'address'" :hash="item.from" /><br>
                    <span v-if="item.to">To: <Hash-Link :type="'address'" :hash="item.to" :withTokenName="true" :withName="true" /></span>
                    <span v-else-if="item.receipt.contractAddress">Created: <Hash-Link :type="'address'" :hash="item.receipt.contractAddress" :withTokenName="true" :withName="true" /></span>
                </div>
            </template>
            <template v-else>
                <v-chip x-small class="mr-2" v-if="item.from && item.from === currentAddress">self</v-chip>
                <Hash-Link :type="'address'" :hash="item.from" />
            </template>
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link :to="'/block/' + item.blockNumber">{{ item.blockNumber }}</router-link>
        </template>
        <template v-slot:item.to="{ item }">
            <v-chip x-small class="mr-2" v-if="item.to && item.to === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.to" :withTokenName="true" :withName="true" />
        </template>
        <template v-slot:item.value="{ item }">
            {{ item.value | fromWei('ether', chain.token) }}
        </template>
        <template v-slot:item.fee="{ item }">
            <span v-if="item.receipt">{{ item.gasPrice * (item.gas || item.receipt.gasUsed)  | fromWei('ether', chain.token) }}</span>
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
    props: ['transactions', 'currentAddress', 'loading', 'sortBy', 'count', 'dense'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        headers: []
    }),
    mounted() {
        if (!this.dense)
            this.headers = [
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
            ]
        else
            this.headers = [
                {
                    text: 'Txn Hash',
                    value: 'hash',
                    align: 'start',
                },
                {
                    text: 'Mined On',
                    value: 'timestamp'
                },
                {
                    text: 'From',
                    value: 'from'
                }
            ]
    },
    methods: {
        moment: moment,
        txStatus(item) {
            if (!item || !item.receipt)
                return 'unknown';

            const receipt = item.receipt;
            if (receipt.status !== null && receipt.status !== undefined)
                return receipt.status ? 'succeeded' : 'failed';

            if (receipt.root && receipt.root != '0x' && receipt.cumulativeGasUsed === receipt.gasUsed)
                return 'succeeded';

            return 'failed';
        },
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
