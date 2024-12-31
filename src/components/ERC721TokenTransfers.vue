<template>
    <v-container fluid>
        <Token-Transfers
            :transfers="transfers"
            :headers="headers"
            :loading="loading"
            :sort-by="currentOptions.sortBy"
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
            { title: 'Mined On', key: 'timestamp' },
            { title: 'Transaction', key: 'transactionHash', sortable: false },
            { title: 'Block', key: 'blockNumber' },
            { title: 'From', key: 'src' },
            { title: 'To', key: 'dst' },
            { title: 'Token', key: 'token', sortable: false }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'blockNumber', order: 'desc' }] }
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

            this.currentOptions = {
                page,
                itemsPerPage,
                sortBy
            };

            if (this.tokenId)
                this.$server.getErc721TokenTransfers(this.address, this.tokenId)
                    .then(({ data }) => {
                        this.transfers = data;
                        this.transferCount = data.length;
                    })
                    .catch(console.log)
                    .finally(() => this.loading = false);
            else {
                this.$server.getTokenTransfers(this.address, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order })
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
