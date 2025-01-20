<template>
    <v-container fluid>
        <v-card>
            <v-card-text>
                <v-data-table-server
                    class="hide-table-count"
                    :loading="loading"
                    :items="tokens"
                    :items-length="tokenCount"
                    :headers="headers"
                    :sort-by="[{ key: currentOptions.orderBy, order: currentOptions.order }]"
                    :must-sort="true"
                    items-per-page-text="Rows per page:"
                    no-data-text="No ERC-20 tokens found"
                    last-icon=""
                    first-icon=""
                    :items-per-page-options="[
                        { value: 10, title: '10' },
                        { value: 25, title: '25' },
                        { value: 100, title: '100' }
                    ]"
                    item-key="address"
                    @update:options="getTokens">
                    <template v-slot:item.address="{ item }">
                        <Hash-Link :type="'token'" :hash="item.address" :contract="item" />
                    </template>
                    <template v-slot:item.tokenName="{ item }">
                        {{ item.tokenName }}
                    </template>
                    <template v-slot:item.tokenSymbol="{ item }">
                        {{ item.tokenSymbol }}
                    </template>
                    <template v-slot:item.tags="{ item }">
                        <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" size="x-small" class="bg-success mr-2">
                            {{ formatContractPattern(pattern) }}
                        </v-chip>
                    </template>
                </v-data-table-server>
            </v-card-text>
        </v-card>
    </v-container>
</template>
<script>
import HashLink from '@/components/HashLink.vue';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'Contracts',
    components: {
        HashLink
    },
    data: () => ({
        loading: true,
        tokens: [],
        headers: [
            {
                title: 'Address',
                key: 'address'
            },
            {
                title: 'Name',
                key: 'tokenName'
            },
            {
                title: 'Symbol',
                key: 'tokenSymbol'
            },
            {
                title: '',
                key: 'tags',
                sortable: false
            }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, orderBy: 'timestamp', order: 'desc', pattern: 'erc20' },
        newTokenPusherHandler: null,
        destroyedContractPusherHandler: null
    }),
    mounted: function() {
        this.newTokenPusherHandler = this.$pusher.onNewToken(() => this.getTokens(this.currentOptions), this);
        this.destroyedContractPusherHandler = this.$pusher.onDestroyedContract(() => this.getTokens(this.currentOptions), this);
    },
    destroyed() {
        this.newTokenPusherHandler();
        this.destroyedContractPusherHandler.unbind(null, null, this);
    },
    methods: {
        getTokens({ page, itemsPerPage, sortBy } = {}) {
            this.loading = true;

            if (!page || !itemsPerPage || !sortBy || !sortBy.length)
                return this.loading = false;

            if (this.currentOptions.page == page && this.currentOptions.itemsPerPage == itemsPerPage && this.currentOptions.sortBy == sortBy[0].key && this.currentOptions.sort == sortBy[0].order)
                return this.loading = false;

            this.currentOptions = {
                page,
                itemsPerPage,
                orderBy: sortBy[0].key,
                order: sortBy[0].order,
                pattern: 'erc20'
            };

            this.$server.getContracts(this.currentOptions)
                .then(({ data }) => {
                    this.tokens = data.items;
                    this.tokenCount = data.items.length == this.currentOptions.itemsPerPage ?
                        (this.currentOptions.page * data.items.length) + 1 :
                        this.currentOptions.page * data.items.length;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        formatContractPattern
    }
}
</script>
