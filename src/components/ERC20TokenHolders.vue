<template>
    <v-data-table-server
        class="hide-table-count"
        :loading="loading"
        :items="holders"
        :items-length="holderCount"
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
            <span v-tooltip="item.amount">
                {{ $fromWei(item.amount, tokenDecimals, tokenSymbol) }}
            </span>
        </template>
        <template v-slot:item.share="{ item }">
            <div class="share-cell">
                <div class="d-flex align-center">
                    <span>{{ formatShare(item.share) }}</span>
                </div>
                <v-progress-linear
                    class="mt-1"
                    :model-value="item.share * 100"
                    height="2"
                    color="primary"
                    bg-color="primary-lighten-4"
                ></v-progress-linear>
            </div>
        </template>
    </v-data-table-server>
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
        },
        formatShare(share) {
            if (share > 0 && share < 0.0001) {
                return '<0.01%';
            }
            return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 }).format(share);
        }
    }
}
</script>

<style>
.share-cell {
    max-width: fit-content;
    min-width: 100px;
}
</style>
