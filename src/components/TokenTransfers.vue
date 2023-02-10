<template>
    <v-data-table
        :loading="loading"
        :hide-default-footer="count <= 10"
        :headers="headers"
        :sort-by="sortBy"
        :must-sort="true"
        :sort-desc="true"
        :server-items-length="count"
        :hide-default-header="dense"
        item-key="id"
        :items="transfers"
        @update:options="onPagination">
        <template v-slot:top v-if="!dense">
            <v-toolbar dense flat>
                <v-spacer></v-spacer>
                <v-switch v-model="unformatted" label="Unformatted Amounts"></v-switch>
            </v-toolbar>
        </template>
        <template v-slot:item.transactionHash="{ item }">
            <Hash-Link :type="'transaction'" :hash="item.transaction.hash" />
        </template>
        <template v-slot:item.type="{ item }">
            <v-chip x-small class="success mr-2" v-if="type[item.token]">
                {{ formatContractPattern(type[item.token]) }}
            </v-chip>
            <span v-else>N/A</span>
        </template>
        <template v-slot:item.timestamp="{ item }">
            <div class="my-2 text-left">
                {{ moment(item.transaction.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                <small>{{ moment(item.transaction.timestamp).fromNow() }}</small>
            </div>
        </template>
        <template v-slot:item.blockNumber="{ item }">
            <router-link :to="'/block/' + item.transaction.blockNumber">{{ item.transaction.blockNumber }}</router-link>
        </template>
        <template v-slot:item.src="{ item }">
            <v-chip x-small class="mr-2" v-if="item.src === address">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.src" :fullHash="!dense" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.dst="{ item }">
            <v-chip x-small class="mr-2" v-if="item.dst === address">self</v-chip>
            <Hash-Link :type="'address'" :hash="item.dst" :fullHash="!dense" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.token="{ item }">
            <Hash-Link :type="'address'" :hash="item.token" :withName="true" :withTokenName="true" :tokenId="item.tokenId" />
        </template>
        <template v-slot:item.amount="{ item }">
            {{ item.amount | fromWei(decimals[item.token], symbols[item.token], unformatted) }}
        </template>
    </v-data-table>
</template>
<script>
const moment = require('moment');
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'TokenTransfers',
    props: ['transfers', 'headers', 'dense', 'loading', 'sortBy', 'count', 'address'],
    components: {
        HashLink
    },
    filters: {
        FromWei
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
        moment: moment,
        formatContractPattern: formatContractPattern,
        onPagination(pagination) {
            this.$emit('pagination', pagination);
        },
        loadContractData() {
            for (let i = 0; i < this.transfers.length; i++) {
                const contract = this.transfers[i].contract;

                if (!contract)
                    continue;

                contract.tokenDecimals ?
                    this.$set(this.decimals, this.transfers[i].token, contract.tokenDecimals) :
                    this.$set(this.decimals, this.transfers[i].token, 0);

                contract.tokenSymbol ?
                    this.$set(this.symbols, this.transfers[i].token, contract.tokenSymbol) :
                    this.$set(this.symbols, this.transfers[i].token, '');

                if (contract.patterns.indexOf('erc20') > -1)
                    this.$set(this.type, this.transfers[i].token, 'erc20');

                if (contract.patterns.indexOf('erc721') > -1)
                    this.$set(this.type, this.transfers[i].token, 'erc721');
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
