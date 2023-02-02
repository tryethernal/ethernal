<template>
    <v-container fluid>
        <Token-Transfers
            :transfers="transfers"
            :loading="loading"
            :sortBy="currentOptions.sortBy[0]"
            :count="transferCount"
            :headers="headers"
            @pagination="onPagination"
            @update:options="getTransfers" />
    </v-container>
</template>

<script>
const moment = require('moment');
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
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['from'], sortDesc: [true] },
        headers: [
            { text: 'Type', value: 'type' },
            { text: 'From', value: 'src' },
            { text: 'To', value: 'dst' },
            { text: 'Token', value: 'token' },
            { text: 'Amount', value: 'amount' }
        ]
    }),
    methods: {
        moment: moment,
        onPagination(options) {
            this.getTransfers(options);
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

            this.server.getTransactionTokenTransfers(this.hash, options)
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
