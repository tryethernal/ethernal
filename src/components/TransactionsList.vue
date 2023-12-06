<template>
    <v-data-table
        :dense="dense"
        :loading="loading"
        :items="transactions"
        :sort-by="currentOptions.sortBy[0]"
        :must-sort="true"
        :sort-desc="true"
        :server-items-length="transactionCount"
        :headers="headers"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        :item-class= "rowClasses"
        :footer-props="{
            itemsPerPageOptions: [10, 25, 100]
        }"
        item-key="hash"
        @update:options="getTransactions">
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>
        <template v-slot:no-data>
            No transactions found
        </template>
        <template v-slot:item.hash="{ item }">
            <v-tooltip top>
                <template v-slot:activator="{ on, attrs }">
                    <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'succeeded'" color="success lighten-1" class="mr-2">mdi-check-circle</v-icon>
                    <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'failed'" color="error lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                    <v-icon v-bind="attrs" v-on="on" small v-show="txStatus(item) == 'unknown'" color="grey lighten-1" class="mr-2">mdi-help-circle</v-icon>
                    <v-progress-circular v-bind="attrs" v-on="on" size="16" width="2" indeterminate color="primary" v-show="txStatus(item) == 'syncing'" class="mr-2"></v-progress-circular>
                </template>
                <span v-show="txStatus(item) == 'succeeded'">Succeeded Transaction</span>
                <span v-show="txStatus(item) == 'failed'">Failed Transaction</span>
                <span v-show="txStatus(item) == 'unknown'">Unkown Transaction Status</span>
                <span v-show="txStatus(item) == 'syncing'">Indexing Transaction...</span>
            </v-tooltip>
            <Hash-Link :type="'transaction'" :hash="item.hash" />
        </template>
        <template v-slot:item.method="{ item }">
            <v-tooltip v-if="item.methodDetails && Object.keys(item.methodDetails).length" top :open-delay="150" color="grey darken-1" content-class="tooltip">
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
                    <span v-else-if="item.receipt && item.receipt.contractAddress">Created: <Hash-Link :type="'address'" :hash="item.receipt.contractAddress" :withTokenName="true" :withName="true" /></span>
                </div>
            </template>
            <template v-else>
                <v-chip x-small class="mr-2" v-if="item.from && item.from === currentAddress">self</v-chip>
                <Hash-Link :type="'address'" :hash="item.from" />
            </template>
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link :to="'/block/' + item.blockNumber" :contract="item.contract">{{ item.blockNumber }}</router-link>
        </template>
        <template v-slot:item.to="{ item }">
            <v-chip x-small class="mr-2" v-if="item.to && item.to === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.to" :withTokenName="true" :withName="true" />
        </template>
        <template v-slot:item.value="{ item }">
            {{ item.value | fromWei('ether', chain.token) }}
        </template>
        <template v-slot:item.fee="{ item }">
            <span v-if="item.receipt">{{ getGasPriceFromTransaction(item) * (item.gas || item.receipt.gasUsed)  | fromWei('ether', chain.token) }}</span>
        </template>
    </v-data-table>
</template>

<script>
const moment = require('moment');
const { getGasPriceFromTransaction } = require('../lib/utils');
import { mapGetters } from 'vuex';
import FromWei from '../filters/FromWei.js';
import HashLink from './HashLink.vue';

export default {
    name: 'TransactionsList',
    props: ['currentAddress', 'dense', 'blockNumber', 'address', 'withCount'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        headers: [],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['timestamp'], sortDesc: [true] },
        transactions: [],
        transactionCount: 0,
        loading: false
    }),
    mounted() {
        this.currentOptions = { page: 1, itemsPerPage: 10, sortBy: [this.blockNumber ? 'timestamp' : 'blockNumber'], sortDesc: [true] };

        this.pusherUnsubscribe = this.pusher.onNewTransaction(transaction => {
            if (this.blockNumber) {
                if (transaction.blockNumber == this.blockNumber)
                    this.getTransactions(this.currentOptions);
            }
            else if (this.address) {
                if (transaction.from == this.address || transaction.to == this.address)
                    this.getTransactions(this.currentOptions);
            }
            else
                this.getTransactions(this.currentOptions);
        }, this, this.address);

        if (this.dense)
            this.headers = [
                { text: 'Txn Hash', value: 'hash', align: 'start' },
                { text: 'Mined On', value: 'timestamp' },
                { text: 'From', value: 'from' }
            ];
        else
            this.headers = [
                { text: 'Txn Hash', value: 'hash', align: 'start' },
                { text: 'Method', value: 'method', sortable: false },
                { text: 'Block', value: 'blockNumber', sortable: !this.blockNumber },
                { text: 'Mined On', value: 'timestamp' },
                { text: 'From', value: 'from' },
                { text: 'To', value: 'to' },
                { text: 'Value', value: 'value' },
                { text: 'Fee', value: 'fee', sortable: false }
            ];
    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        getGasPriceFromTransaction,
        moment,
        rowClasses(item) {
            if (item.state == 'syncing')
                return 'isSyncing'
        },
        txStatus(item) {
            if (!item) return 'unknown';

            if (item.state == 'syncing') return 'syncing';

            if (!item.receipt) return 'unknown';

            const receipt = item.receipt;
            if (receipt.status !== null && receipt.status !== undefined)
                return receipt.status ? 'succeeded' : 'failed';

            if (receipt.root && receipt.root != '0x' && parseInt(receipt.cumulativeGasUsed) >= parseInt(receipt.gasUsed))
                return 'succeeded';

            return 'failed';
        },
        getTransactions(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc',
                orderBy: this.currentOptions.sortBy[0]
            };

            const query = this.blockNumber ?
                this.server.getBlockTransactions(this.blockNumber, options, !this.dense && !!this.withCount) :
                    this.address ?
                        this.server.getAddressTransactions(this.address, options, !this.dense && !!this.withCount) :
                        this.server.getTransactions(options, !this.dense && !!this.withCount);

            query.then(({ data }) => {
                this.transactions = data.items;
                if (data.total)
                    this.transactionCount = data.total;
                else
                    this.transactionCount = data.items.length == this.currentOptions.itemsPerPage ?
                        (this.currentOptions.page * data.items.length) + 1 :
                        this.currentOptions.page * data.items.length;

                this.$emit('listUpdated');
            })
            .catch(console.log)
            .finally(() => this.loading = false);
        },
        getMethodName(transaction) {
            if (!transaction.methodDetails) return this.getSighash(transaction);
            return transaction.methodDetails.name ? transaction.methodDetails.name : this.getSighash(transaction);
        },
        getMethodLabel(methodDetails) {
            if (!methodDetails) return null;
            return methodDetails.label ? methodDetails.label : null;
        },
        getSighash(transaction) {
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
/deep/ .isSyncing {
    font-style: italic;
    opacity: 0.7;
}
.methodName {
    display: block;
    max-width: 11ch;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.tooltip {
    opacity: 1!important;
}
</style>
