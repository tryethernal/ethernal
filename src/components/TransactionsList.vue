<template>
    <v-data-table-server
        class="hide-table-count"
        :dense="dense"
        :loading="loading"
        :items="transactions"
        :items-length="transactionCount"
        :sort-by="currentOptions.sortBy"
        :must-sort="true"
        :headers="headers"
        :hide-default-footer="dense"
        :hide-default-header="dense"
        :row-props="rowClasses"
        no-data-text="No transactions indexed yet"
        last-icon=""
        first-icon=""
        :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 100, title: '100' }
        ]"
        item-key="hash"
        @update:options="getTransactions">
        <template v-if="!withCount" v-slot:[`footer.page-text`]=""></template>
        <template v-slot:item.hash="{ item }">
            <v-tooltip location="left">
                <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" size="small" v-show="txStatus(item) == 'succeeded'" color="success-lighten-1" class="mr-2">mdi-check-circle</v-icon>
                    <v-icon v-bind="props" size="small" v-show="txStatus(item) == 'failed'" color="error-lighten-1" class="mr-2">mdi-alert-circle</v-icon>
                    <v-icon v-bind="props" size="small" v-show="txStatus(item) == 'unknown'" color="grey-lighten-1" class="mr-2">mdi-help-circle</v-icon>
                    <v-progress-circular v-bind="props" size="16" width="2" indeterminate color="primary" v-show="txStatus(item) == 'syncing'" class="mr-2"></v-progress-circular>
                </template>
                <span v-show="txStatus(item) == 'succeeded'">Succeeded Transaction</span>
                <span v-show="txStatus(item) == 'failed'">Failed Transaction</span>
                <span v-show="txStatus(item) == 'unknown'">Unkown Transaction Status</span>
                <span v-show="txStatus(item) == 'syncing'">Indexing Transaction...</span>
            </v-tooltip>
            <Hash-Link :type="'transaction'" :hash="item.hash" :xsHash="true" />
        </template>
        <template v-slot:item.method="{ item }">
            <v-tooltip v-if="item.methodDetails && Object.keys(item.methodDetails).length" location="top" :open-delay="150" color="grey-darken-1" content-class="tooltip">
                <template v-slot:activator="{ props }">
                    <v-chip color="primary-lighten-1" label v-bind="props" size="small" variant="flat">
                        <span class="color--text methodName">{{ getMethodName(item) }}</span>
                    </v-chip>
                </template>
                <span style="white-space: pre">{{ getMethodLabel(item.methodDetails) }}</span>
            </v-tooltip>
            <span v-else>
                <v-chip variant="flat" label size="small" color="primary-lighten-1" v-show="getMethodName(item)">{{ getMethodName(item) }}</v-chip>
            </span>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.timestamp) }}<br>
                <small>{{ $dt.fromNow(item.timestamp) }}</small>
            </div>
        </template>
        <template v-slot:item.from="{ item }">
            <template v-if="dense">
                <div class="my-2 text-left">
                    From: <Hash-Link :type="'address'" :hash="item.from" /><br>
                    <span v-if="item.to">To: <Hash-Link :type="'address'" :hash="item.to" :withTokenName="true" :withName="true" :contract="item.contract" /></span>
                    <span v-else-if="item.receipt && item.receipt.contractAddress">Created: <Hash-Link :type="'address'" :hash="item.receipt.contractAddress" :withTokenName="true" :withName="true" /></span>
                </div>
            </template>
            <template v-else>
                <v-chip size="x-small" class="mr-2" v-if="item.from && item.from === currentAddress">self</v-chip>
                <Hash-Link :type="'address'" :hash="item.from" />
            </template>
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link style="text-decoration: none;" :to="'/block/' + item.blockNumber" :contract="item.contract">{{ commify(item.blockNumber) }}</router-link>
        </template>
        <template v-slot:item.to="{ item }">
            <v-chip size="x-small" class="mr-2" v-if="item.to && item.to === currentAddress">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.to" :withTokenName="true" :withName="true" :contract="item.contract" />
        </template>
        <template v-slot:item.value="{ item }">
            {{ $fromWei(item.value, 'ether', currentWorkspaceStore.chain.token, false, 4) }}
        </template>
        <template v-slot:item.fee="{ item }">
            <span v-if="item.receipt">{{ $fromWei(getGasPriceFromTransaction(item) * (item.gas || item.receipt.gasUsed), 'ether', currentWorkspaceStore.chain.token, false, 4) }}</span>
        </template>
    </v-data-table-server>
</template>

<script>
const moment = require('moment');
const ethers = require('ethers');
import { getGasPriceFromTransaction } from '../lib/utils';
import { mapStores } from 'pinia';
import HashLink from './HashLink.vue';
import { useCurrentWorkspaceStore } from '../stores/currentWorkspace';

const DEBOUNCING_DELAY = 3000;

export default {
    name: 'TransactionsList',
    props: ['currentAddress', 'dense', 'blockNumber', 'address', 'withCount'],
    components: {
        HashLink
    },
    data: () => ({
        headers: [],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'timestamp', order: 'desc' }] },
        transactions: [],
        transactionCount: 0,
        loading: false,
        lastUpdatedAt: 0,
        debounced: false
    }),
    mounted() {
        this.currentOptions.orderBy = this.blockNumber ? 'timestamp' : 'blockNumber';

        this.pusherUnsubscribe = this.$pusher.onNewTransaction(transaction => {
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
                { title: 'Txn Hash', key: 'hash', align: 'start' },
                { title: 'Mined On', key: 'timestamp' },
                { title: 'From', key: 'from' }
            ];
        else
            this.headers = [
                { title: 'Txn Hash', key: 'hash', align: 'start' },
                { title: 'Method', key: 'method', sortable: false },
                { title: 'Block', key: 'blockNumber', sortable: !this.blockNumber },
                { title: 'Mined On', key: 'timestamp' },
                { title: 'From', key: 'from' },
                { title: 'To', key: 'to' },
                { title: 'Value', key: 'value' },
                { title: 'Fee', key: 'fee', sortable: false }
            ];
    },
    destroyed() {
        this.pusherUnsubscribe();
    },
    methods: {
        getGasPriceFromTransaction,
        moment,
        commify: ethers.utils.commify,
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
        getTransactions({ page, itemsPerPage, sortBy }) {
            this.loading = true;
            if (!this.lastUpdatedAt)
                this.lastUpdatedAt = Date.now();
            else if (this.lastUpdatedAt - DEBOUNCING_DELAY < Date.now() && !this.debounced && page == this.currentOptions.page) {
                this.debounced = true;
                return setTimeout(() => {
                    this.debounced = false;
                }, DEBOUNCING_DELAY);
            }

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                sortBy
            };

            const query = this.blockNumber ?
                this.$server.getBlockTransactions(this.blockNumber, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order }, !this.dense && !!this.withCount) :
                    this.address ?
                        this.$server.getAddressTransactions(this.address, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order }, !this.dense && !!this.withCount) :
                        this.$server.getTransactions({ page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order }, !this.dense && !!this.withCount);

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
        ...mapStores(useCurrentWorkspaceStore)
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
