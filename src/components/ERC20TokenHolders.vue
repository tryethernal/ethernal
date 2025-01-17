<template>
    <v-container fluid>
        <v-data-table-server
            class="hide-table-count"
            :loading="loading"
            :items="holders"
            :items-length="0"
            no-data-text="No holders"
            :sort-by="currentOptions.sortBy"
            :headers="headers"
            items-per-page-text="Rows per page:"
            last-icon=""
            first-icon=""
            :items-per-page-options="[
                { value: 10, title: '10' },
                { value: 25, title: '25' },
                { value: 100, title: '100' }
            ]"
            item-key="address"
            @update:options="getHolders">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" withName="true" :withTokenName="true" />
            </template>
            <template v-slot:item.amount="{ item }">
                {{ $fromWei(item.amount, tokenDecimals, tokenSymbol) }}
            </template>
            <template v-slot:item.share="{ item }">
                {{ new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(item.share) }}
            </template>
        </v-data-table-server>
    </v-container>
</template>

<script>
import HashLink from './HashLink.vue';

export default {
    name: 'ERC20TokenHolders',
    props: ['address', 'tokenDecimals', 'tokenSymbol'],
    components: {
        HashLink
    },
    data: () => ({
        loading: true,
        holders: [],
        holderCount: 0,
        headers: [
            { title: 'Address', key: 'address' },
            { title: 'Quantity', key: 'amount'},
            { title: 'Percentage', key: 'share'}
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: [{ key: 'amount', order: 'desc' }] }
    }),
    methods: {
        getHolders({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            this.currentOptions = { page, itemsPerPage, sortBy };

            this.$server.getTokenHolders(this.address, { page, itemsPerPage, orderBy: sortBy[0].key, order: sortBy[0].order })
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
