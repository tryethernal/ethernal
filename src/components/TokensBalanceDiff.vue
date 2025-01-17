<template>
    <v-card class="my-2">
        <v-card-text>
            <v-data-table
                :hide-default-footer="balanceChanges.length <= 10"
                :headers="tableHeaders"
                :items="balanceChanges">
                <template v-slot:top>
                    <div style="height: 48px; font-size: 16px" class="d-flex justify-space-between">
                        <Hash-Link class="align-self-center" :type="'address'" :hash="token" :withTokenName="true" :withName="true" :loadContract="true" />
                        <v-switch hide-details="auto" class="align-self-center" v-model="unformatted" label="Unformatted Amounts"></v-switch>
                    </div>
                </template>
                <template v-slot:item.address="{ item }">
                    <Hash-Link :type="'address'" :hash="item.address" />
                </template>
                <template v-slot:item.before="{ item }">
                    {{ $fromWei(item.previousBalance, decimals[item.address], symbols[item.address], unformatted) }}
                </template>
                <template v-slot:item.now="{ item }">
                    {{ $fromWei(item.currentBalance, decimals[item.address], symbols[item.address], unformatted) }}
                </template>
                <template v-slot:item.change="{ item }">
                    <span v-if="changeDirection(item.diff) > 0" class="text-success">
                        +{{ $fromWei(item.diff, decimals[item.address], symbols[item.address], unformatted) }}
                    </span>
                    <span v-if="changeDirection(item.diff) === 0">0</span>
                    <span v-if="changeDirection(item.diff) < 0" class="text-error">
                        {{ $fromWei(item.diff, decimals[item.address], symbols[item.address], unformatted) }}
                    </span>
                </template>
            </v-data-table>
        </v-card-text>
    </v-card>
</template>
<script>
const ethers = require('ethers');
import HashLink from './HashLink.vue';

export default {
    name: 'TokensBalanceDiff',
    props: ['token', 'balanceChanges', 'blockNumber'],
    components: {
        HashLink
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
            { title: 'Address', key: 'address' },
            { title: `Previous Block (#${this.previousBlockNumber})`, key: 'before' },
            { title: `Tx Block (#${parseInt(this.blockNumber)})`, key: 'now' },
            { title: 'Change', key: 'change' }
        );
        this.loadContractData();
    },
    methods: {
        loadContractData() {
            for (let i = 0; i < this.balanceChanges.length; i++) {
                this.decimals[this.balanceChanges[i].address] = 18;
                this.symbols[this.balanceChanges[i].address] = '';

                this.$server.getContract(this.token)
                    .then(({ data }) => {
                        const contract = data;
                        if (!contract) return;

                        this.decimals[this.balanceChanges[i].address] = contract.tokenDecimals;
                        this.symbols[this.balanceChanges[i].address] = contract.tokenSymbol;
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
        previousBlockNumber: function() {
            return Math.max(0, parseInt(this.blockNumber) - 1);
        }
    }
}
</script>
