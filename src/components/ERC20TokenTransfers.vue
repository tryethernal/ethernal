<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="transfers"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="transferCount"
            :headers="headers"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            item-key="id"
            @update:options="onPagination">
            <template v-slot:item.timestamp="{ item }">
                {{ moment(item.transaction.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                <small>{{ moment(item.transaction.timestamp).fromNow() }}</small>
            </template>
            <template v-slot:item.transactionHash="{ item }">
                <Hash-Link :type="'transaction'" :hash="item.transaction.hash" />
            </template>
            <template v-slot:item.blockNumber="{ item }">
                <router-link :to="'/block/' + item.transaction.blockNumber">{{ item.transaction.blockNumber }}</router-link>
            </template>
            <template v-slot:item.src="{ item }">
                <Hash-Link :type="'address'" :hash="item.src" withName="true" :withTokenName="true" />
            </template>
            <template v-slot:item.dst="{ item }">
                <Hash-Link :type="'address'" :hash="item.dst" withName="true" :withTokenName="true" />
            </template>
            <template v-slot:item.amount="{ item }">
                {{ item.amount | fromWei(tokenDecimals, tokenSymbol) }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
const moment = require('moment');
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'ERC20TokenTransfers',
    props: ['address', 'tokenDecimals', 'tokenSymbol'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: true,
        transfers: [],
        transferCount: 0,
        headers: [
            { text: 'Mined On', value: 'timestamp' },
            { text: 'Transaction', value: 'transactionHash' },
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

            this.server.getErc20TokenTransfers(this.address, options)
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
