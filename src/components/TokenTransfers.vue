<template>
    <v-data-table-server
        :loading="loading"
        :headers="headers"
        :sort-by="sortBy"
        :must-sort="true"
        :items-length="count"
        :hide-default-header="dense"
        item-key="id"
        :items="transfers"
        @update:options="onPagination">
        <template v-slot:top v-if="!dense">
            <div class="d-flex justify-end">
                <v-switch v-model="unformatted" label="Unformatted Amounts"></v-switch>
            </div>
        </template>
        <template v-slot:item.transactionHash="{ item }">
            <Hash-Link :type="'transaction'" :hash="item.transaction.hash" />
        </template>
        <template v-slot:item.type="{ item }">
            <v-chip size="x-small" class="bg-success mr-2" v-if="type[item.token]">
                {{ formatContractPattern(type[item.token]) }}
            </v-chip>
            <span v-else>N/A</span>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ $dt.shortDate(item.transaction.timestamp) }}<br>
                <small>{{ $dt.fromNow(item.transaction.timestamp) }}</small>
            </div>
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link :to="'/block/' + item.transaction.blockNumber">{{ item.transaction.blockNumber }}</router-link>
        </template>
        <template v-slot:item.src="{ item }">
            <v-chip size="x-small" class="mr-2" v-if="item.src === address">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.src" :fullHash="!dense" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.dst="{ item }">
            <v-chip size="x-small" class="mr-2" v-if="item.dst === address">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.dst" :fullHash="!dense" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.token="{ item }">
            <Hash-Link :type="'address'" :hash="item.token" :withName="true" :withTokenName="true" :tokenId="item.tokenId" :contract="item.contract" />
        </template>
        <template v-slot:item.amount="{ item }">
            {{ $fromWei(item.amount, decimals[item.token], symbols[item.token], unformatted) }}
        </template>
    </v-data-table-server>
</template>
<script>
import HashLink from './HashLink';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'TokenTransfers',
    props: ['transfers', 'headers', 'dense', 'loading', 'sortBy', 'count', 'address'],
    components: {
        HashLink
    },
    data: () => ({
        unformatted: false,
        decimals: {},
        symbols: {},
        type: {},
    }),
    mounted() {
        this.loadContractData();
    },
    methods: {
        formatContractPattern: formatContractPattern,
        onPagination(pagination) {
            this.$emit('pagination', pagination);
        },
        loadContractData() {
            for (let i = 0; i < this.transfers.length; i++) {
                const contract = this.transfers[i].contract;

                if (!contract)
                    continue;

                this.decimals[this.transfers[i].token] = contract.tokenDecimals || 0;
                this.symbols[this.transfers[i].token] = contract.tokenSymbol || '';

                if (contract.patterns.indexOf('erc20') > -1)
                    this.type[this.transfers[i].token] = 'erc20';

                if (contract.patterns.indexOf('erc721') > -1)
                    this.type[this.transfers[i].token] = 'erc721';
            }
        }
    },
    watch: {
        transfers() {
            this.loadContractData();
        }
    }
}
</script>
