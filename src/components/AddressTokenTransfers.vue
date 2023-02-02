<template>
    <v-container fluid>
        <Token-Transfers
            :transfers="transfers"
            :headers="headers"
            :loading="loading"
            :sortBy="currentOptions.sortBy[0]"
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
import TokenTransfers from './TokenTransfers';

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
            { text: 'Mined On', value: 'timestamp' },
            { text: 'Transaction', value: 'transactionHash', sortable: false },
            { text: 'Block', value: 'blockNumber' },
            { text: 'From', value: 'src' },
            { text: 'To', value: 'dst' },
            { text: 'Amount', value: 'amount' }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['blockNumber'], sortDesc: [true] }
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

            this.server.getAddressTokenTransfers(this.address, options)
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
