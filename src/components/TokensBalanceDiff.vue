<template>
    <v-card outlined class="my-2">
        <v-card-text>
            <v-data-table
                :hide-default-footer="balanceChanges.length <= 10"
                :headers="tableHeaders"
                :items="balanceChanges">
                <template v-slot:top>
                    <v-toolbar dense flat>
                        <v-toolbar-title>
                            <small><Hash-Link :type="'address'" :hash="token" :withTokenName="true" :withName="true" :loadContract="true" /></small>
                        </v-toolbar-title>
                        <v-spacer></v-spacer>
                        <v-switch v-model="unformatted" label="Unformatted Amounts"></v-switch>
                    </v-toolbar>
                </template>
                <template v-slot:item.address="{ item }">
                    <Hash-Link :type="'address'" :hash="item.address" />
                </template>
                <template v-slot:item.before="{ item }">
                    {{ item.previousBalance | fromWei(decimals[item.address], symbols[item.address], unformatted) }}
                </template>
                <template v-slot:item.now="{ item }">
                    {{ item.currentBalance | fromWei(decimals[item.address], symbols[item.address], unformatted) }}
                </template>
                <template v-slot:item.change="{ item }">
                    <span v-if="changeDirection(item.diff) > 0" class="success--text">
                        +{{ item.diff | fromWei(decimals[item.address], symbols[item.address], unformatted) }}
                    </span>
                    <span v-if="changeDirection(item.diff) === 0">0</span>
                    <span v-if="changeDirection(item.diff) < 0" class="error--text">
                        {{ item.diff | fromWei(decimals[item.address], symbols[item.address], unformatted) }}
                    </span>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'TokensBalanceDiff',
    props: ['token', 'balanceChanges', 'blockNumber'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        unformatted: false,
        tableHeaders: [],
        newBalances: {},
        decimals: {},
        symbols: {}
    }),
    mounted() {
        this.tableHeaders.push(
            { text: 'Address', value: 'address' },
            { text: `Previous Block (#${this.previousBlockNumber})`, value: 'before' },
            { text: `Tx Block (#${parseInt(this.blockNumber)})`, value: 'now' },
            { text: 'Change', value: 'change' }
        );
        this.loadContractData();
    },
    methods: {
        loadContractData() {
            for (let i = 0; i < this.balanceChanges.length; i++) {
                this.$set(this.decimals, this.balanceChanges[i].address, 18);
                this.$set(this.symbols, this.balanceChanges[i].address, '');

                this.server.getContract(this.token)
                    .then(({ data }) => {
                        const contract = data;
                        if (!contract) return;

                        this.$set(this.decimals, this.balanceChanges[i].address, contract.tokenDecimals);
                        this.$set(this.symbols, this.balanceChanges[i].address, contract.tokenSymbol);
                    });
            }
        },
        changeDirection(diff) {
            if (!diff) return 0;

            const bigDiff = ethers.BigNumber.from(diff);
            if (bigDiff.gt('0'))
                return 1;
            else if (bigDiff.eq('0'))
                return 0;
            else
                return -1;
        }
    },
    watch: {
        balanceChanges() {
            this.loadContractData();
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer'
        ]),
        previousBlockNumber: function() {
            return Math.max(0, parseInt(this.blockNumber) - 1);
        }
    }
}
</script>
