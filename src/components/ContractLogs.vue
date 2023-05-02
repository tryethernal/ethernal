<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="logs"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="logCount"
            :headers="headers"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            item-key="id"
            @update:options="onPagination">
            <template v-slot:item.log="{ item }">
                <Transaction-Event :log="item" :short="true" />
            </template>
            <template v-slot:item.timestamp="{ item }">
                <div class="my-2 text-left">
                    {{ moment(item.receipt.transaction.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                    <small>{{ moment(item.receipt.transaction.timestamp).fromNow() }}</small>
                </div>
            </template>
            <template v-slot:item.transactionHash="{ item }">
                <Hash-Link :type="'transaction'" :hash="item.receipt.transactionHash" />
            </template>
            <template v-slot:item.blockNumber="{ item }">
                <router-link :to="'/block/' + item.receipt.blockNumber">{{ item.receipt.blockNumber }}</router-link>
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
const moment = require('moment');
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';
import TransactionEvent from './TransactionEvent';

export default {
    name: 'ContractLogs',
    props: ['address'],
    components: {
        HashLink,
        TransactionEvent
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: true,
        logs: [],
        logCount: 0,
        contract: {},
        headers: [
            { text: 'Log', value: 'log', sortable: false },
            { text: 'Emitted On', value: 'timestamp' },
            { text: 'Transaction', value: 'transactionHash', sortable: false },
            { text: 'Block', value: 'blockNumber' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] },
        pusherChannelHandler: null
    }),
    destroy() {
        this.pusherChannelHandler.unbind(null, null, this);
    },
    methods: {
        moment: moment,
        onPagination(options) {
            this.getTransfers(options);
            this.pusherChannelHandler = this.pusher.onNewContractLog(() => this.getTransfers(this.currentOptions), this.address, this);
        },
        getTransfers(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                orderBy: this.currentOptions.sortBy[0],
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };

            this.server.getContractLogs(this.address, options)
                .then(({ data }) => {
                    this.logs = data.items;
                    this.logCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    watch: {
        address: {
            immediate: true,
            handler(address) {
                this.server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .finally(() => this.loading = false);
            }
        }
    }
}
</script>
