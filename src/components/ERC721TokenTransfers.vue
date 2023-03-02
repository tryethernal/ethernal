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
            @pagination="onPagination"
            @update:options="getTransfers" />
    </v-container>
</template>

<script>
const moment = require('moment');
import TokenTransfers from './TokenTransfers';

export default {
    name: 'ERC721TokenTransfers',
    props: ['address', 'tokenId'],
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
            { text: 'Token', value: 'token', sortable: false }
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

            if (this.tokenId)
                this.server.getErc721TokenTransfers(this.address, this.tokenId)
                    .then(({ data }) => {
                        this.transfers = data;
                        this.transferCount = data.length;
                    })
                    .catch(console.log)
                    .finally(() => this.loading = false);
            else {
                if (newOptions)
                    this.currentOptions = newOptions;

                const options = {
                    page: this.currentOptions.page,
                    itemsPerPage: this.currentOptions.itemsPerPage,
                    orderBy: this.currentOptions.sortBy[0],
                    order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
                };

                this.server.getTokenTransfers(this.address, options)
                    .then(({ data }) => {
                        this.transfers = data.items;
                        this.transferCount = data.total;
                    })
                    .catch(console.log)
                    .finally(() => this.loading = false);
            }
        }
    }
}
</script>
