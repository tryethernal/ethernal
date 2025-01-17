<template>
    <v-container fluid>
        <Token-Transfers
            :transfers="transfers"
            :headers="headers"
            :loading="loading"
            :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
            :count="transferCount"
            :withTransactionData="true"
            :withTokenData="true"
            :address="address"
            @pagination="onPagination"
            @update:options="getTransfers" />
    </v-container>
</template>

<script>
const moment = require('moment');
import TokenTransfers from './TokenTransfers.vue';

export default {
    name: 'AddressTokenTransfers',
    props: ['address'],
    components: {
        TokenTransfers,
    },
    data: () => ({
        loading: true,
        transfers: [],
        transferCount: 0,
        headers: [
            { title: 'Mined On', key: 'timestamp' },
            { title: 'Transaction', key: 'transactionHash', sortable: false },
            { title: 'Block', key: 'blockNumber' },
            { title: 'From', key: 'src' },
            { title: 'To', key: 'dst' },
            { title: 'Amount', key: 'amount' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, orderBy: 'blockNumber', order: 'desc' }
    }),
    methods: {
        moment: moment,
        onPagination(options) {
            this.getTransfers(options);
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

            this.$server.getAddressTokenTransfers(this.address, this.currentOptions)
                .then(({ data }) => {
                    this.transfers = data.items;
                    this.transferCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
