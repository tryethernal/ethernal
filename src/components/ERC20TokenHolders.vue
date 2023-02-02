<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="holders"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="holderCount"
            :headers="headers"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            item-key="address"
            @update:options="onPagination">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" withName="true" :withTokenName="true" />
            </template>
            <template v-slot:item.amount="{ item }">
                {{ item.amount | fromWei(tokenDecimals, tokenSymbol) }}
            </template>
            <template v-slot:item.share="{ item }">
                {{ new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(item.share) }}
            </template>
        </v-data-table>
    </v-container>
</template>

<script>
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'ERC20TokenHolders',
    props: ['address', 'tokenDecimals', 'tokenSymbol'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        loading: true,
        holders: [],
        holderCount: 0,
        headers: [
            { text: 'Address', value: 'address' },
            { text: 'Quantity', value: 'amount'},
            { text: 'Percentage', value: 'share'}
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['amount'], sortDesc: [true] }
    }),
    methods: {
        onPagination(options) {
            this.getHolders(options)
        },
        getHolders(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                orderBy: this.currentOptions.sortBy[0],
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc'
            };

            this.server.getTokenHolders(this.address, options)
                .then(({ data }) => {
                    this.holders = data.items;
                    this.holderCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    }
}
</script>
