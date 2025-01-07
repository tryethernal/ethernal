<template>
    <v-container fluid>
        <v-data-table-server
            :loading="loading"
            :items="logs"
            :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
            :must-sort="true"
            :sort-desc="true"
            :items-length="logCount"
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
                    {{ $dt.shortDate(item.receipt.transaction.timestamp) }}<br>
                    <small>{{ $dt.fromNow(item.receipt.transaction.timestamp) }}</small>
                </div>
            </template>
            <template v-slot:item.transactionHash="{ item }">
                <Hash-Link :type="'transaction'" :hash="item.receipt.transactionHash" />
            </template>
            <template v-slot:item.blockNumber="{ item }">
                <router-link :to="'/block/' + item.receipt.blockNumber">{{ item.receipt.blockNumber }}</router-link>
            </template>
        </v-data-table-server>
    </v-container>
</template>

<script>
import HashLink from './HashLink.vue';
import TransactionEvent from './TransactionEvent.vue';

export default {
    name: 'ContractLogs',
    props: ['address'],
    components: {
        HashLink,
        TransactionEvent
    },
    data: () => ({
        loading: true,
        logs: [],
        logCount: 0,
        contract: {},
        headers: [
            { title: 'Log', key: 'log', sortable: false },
            { title: 'Emitted On', key: 'timestamp' },
            { title: 'Transaction', key: 'transactionHash', sortable: false },
            { title: 'Block', key: 'blockNumber' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] },
        pusherChannelHandler: null
    }),
    destroy() {
        this.pusherChannelHandler.unbind(null, null, this);
    },
    methods: {
        onPagination(options) {
            this.getTransfers(options);
            this.pusherChannelHandler = this.$pusher.onNewContractLog(() => this.getTransfers(this.currentOptions), this.address, this);
        },
        getTransfers({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            if (this.currentOptions.page == page && this.currentOptions.itemsPerPage == itemsPerPage && this.currentOptions.sortBy == sortBy[0].key && this.currentOptions.sort == sortBy[0].order)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order
            };

            this.$server.getContractLogs(this.address, this.currentOptions)
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
                this.$server.getContract(address)
                    .then(({ data }) => this.contract = data)
                    .finally(() => this.loading = false);
            }
        }
    }
}
</script>
