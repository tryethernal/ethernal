<template>
    <v-container fluid>
        <v-data-table
            :loading="loading"
            :items="tokens"
            :headers="headers"
            :sort-by="currentOptions.sortBy[0]"
            :must-sort="true"
            :sort-desc="true"
            :server-items-length="tokenCount"
            :footer-props="{
                itemsPerPageOptions: [10, 25, 100]
            }"
            item-key="address"
            @update:options="getTokens">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.tokenName="{ item }">
                {{ item.tokenName }}
            </template>
            <template v-slot:item.tokenSymbol="{ item }">
                {{ item.tokenSymbol }}
            </template>
            <template v-slot:item.tags="{ item }">
                <v-chip v-for="(pattern, idx) in item.patterns" :key="idx" x-small class="success mr-2">
                    {{ formatContractPattern(pattern) }}
                </v-chip>
            </template>
        </v-data-table>
    </v-container>
</template>
<script>
import HashLink from '@/components/HashLink';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'Contracts',
    components: {
        HashLink
    },
    data: () => ({
        loading: true,
        tokens: [],
        tokenCount: 0,
        headers: [
            {
                text: 'Address',
                value: 'address'
            },
            {
                text: 'Name',
                value: 'tokenName'
            },
            {
                text: 'Symbol',
                value: 'tokenSymbol'
            },
            {
                text: '',
                value: 'tags'
            }
        ],
        currentOptions: { page: 1, itemsPerPage: 10, sortBy: ['timestamp'], sortDesc: [true] }
    }),
    mounted: function() {
        this.pusher.onNewToken(() => this.getTokens(this.currentOptions), this);
        this.pusher.onDestroyedContract(() => this.getTokens(this.currentOptions), this);
    },
    methods: {
        getTokens: function(newOptions) {
            this.loading = true;

            if (newOptions)
                this.currentOptions = newOptions;

            const options = {
                page: this.currentOptions.page,
                itemsPerPage: this.currentOptions.itemsPerPage,
                order: this.currentOptions.sortDesc[0] === false ? 'asc' : 'desc',
                pattern: 'erc20'
            };

            this.server.getContracts(options)
                .then(({ data }) => {
                    this.tokens = data.items;
                    this.tokenCount = data.total;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        formatContractPattern
    }
}
</script>
