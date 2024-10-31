<template>
    <v-container fluid>
        <Token-Transfers
            :transfers="transfers"
            :loading="loading"
            :sortBy="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
            :count="transferCount"
            :headers="headers"
            @pagination="onPagination"
            @update:options="getTransfers" />
    </v-container>
</template>

<script>
import TokenTransfers from './TokenTransfers';

export default {
    name: 'TransactionTokenTransfers',
    props: ['hash', 'tokenDecimals', 'tokenSymbol'],
    components: {
        TokenTransfers,
    },
    data: () => ({
        loading: true,
        transfers: [],
        transferCount: 0,
        currentOptions: { page: 1, itemsPerPage: 10, orderBy: 'src', order: 'desc' },
        headers: [
            { title: 'Type', key: 'type' },
            { title: 'From', key: 'src' },
            { title: 'To', key: 'dst' },
            { title: 'Token', key: 'token' },
            { title: 'Amount', key: 'amount' }
        ]
    }),
    methods: {
        onPagination(options) {
            this.getTransfers(options);
        },
        getTransfers({ page, itemsPerPage, sortBy }) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            if (this.transfers.length && this.currentOptions.page == page && this.currentOptions.itemsPerPage == itemsPerPage && this.currentOptions.orderBy == sortBy[0].key && this.currentOptions.order == sortBy[0].order)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order
            };

            this.$server.getTransactionTokenTransfers(this.hash, this.currentOptions)
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
