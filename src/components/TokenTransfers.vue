<template>
    <v-card outlined>
        <v-card-text>
            <v-data-table
                :hide-default-footer="transfers.length <= 10"
                :headers="tableHeaders"
                :items="transfers">
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
                    <v-chip x-small class="success mr-2">
                        {{ formatContractPattern(type[item.token]) }}
                    </v-chip>
                </template>
                <template v-slot:item.timestamp="{ item }">
                    <div class="my-2 text-left">
                        {{ moment(item.transaction.timestamp) | moment('MM/DD h:mm:ss A') }}<br>
                        <small>{{ moment(item.transaction.timestamp).fromNow() }}</small>
                    </div>
                </template>
                <template v-slot:item.src="{ item }">
                    <Hash-Link :type="'address'" :hash="item.src" :fullHash="!dense" :withName="true" :withTokenName="true" />
                </template>
                <template v-slot:item.dst="{ item }">
                    <Hash-Link :type="'address'" :hash="item.dst" :fullHash="!dense" :withName="true" :withTokenName="true" />
                </template>
                <template v-slot:item.token="{ item }">
                    <Hash-Link :type="'address'" :hash="item.token" :withName="true" :withTokenName="true" :tokenId="item.tokenId" />
                </template>
                <template v-slot:item.amount="{ item }">
                    {{ item.amount | fromWei(decimals[item.token], symbols[item.token], unformatted) }}
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script>
const moment = require('moment');
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';
import { formatContractPattern } from '@/lib/utils';

export default {
    name: 'TokenTransfers',
    props: ['transfers', 'dense'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        unformatted: false,
        tableHeaders: [],
        decimals: {},
        symbols: {},
        type: {}
    }),
    mounted() {
        this.loadContractData();
        this.setHeaders();
    },
    methods: {
        moment: moment,
        formatContractPattern: formatContractPattern,
        setHeaders() {
            const headers = [];
            const transaction = this.transfers.length && this.transfers[0].transaction;

            if (transaction)
                headers.push({ text: 'Transaction', value: 'transactionHash' });
            else
                headers.push({ text: 'Type', value: 'type' });

            if (transaction)
                headers.push({ text: 'On', value: 'timestamp' });

            headers.push(
                { text: 'From', value: 'src' },
                { text: 'To', value: 'dst' }
            )

            if (!transaction) {
                headers.push(
                    { text: 'Token', value: 'token' },
                    { text: 'Amount', value: 'amount' }
                );
            }

            this.tableHeaders = headers;
        },
        loadContractData() {
            for (let i = 0; i < this.transfers.length; i++) {
                const contract = this.transfers[i].contract;

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
            this.setHeaders();
        }
    }
}
</script>
