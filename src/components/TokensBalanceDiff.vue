<template>
    <div>
        <Hash-Link :type="'address'" :hash="token" :withName="true" /><br>
        <v-data-table
            :hide-default-footer="balanceChanges.length <= 10"
            :headers="tableHeaders"
            :items="balanceChanges">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.before="{ item }">
                <span v-if="decimals[item.address]">
                    {{ item.previousBalance | fromWei('ether', '', decimals[item.address]) }}
                </span>
                <span v-else>
                    {{ item.previousBalance }}
                </span>
            </template>
            <template v-slot:item.now="{ item }">
                <span v-if="decimals[item.address]">
                    {{ item.currentBalance | fromWei('ether', '', decimals[item.address]) }}
                </span>
                <span v-else>
                    {{ item.currentBalance }}
                </span>
            </template>
            <template v-slot:item.change="{ item }">
                <span v-if="changeDirection(item.diff) > 0" class="success--text">
                    <span v-if="decimals[item.address]">
                        +{{ item.diff | fromWei('ether', '', decimals[item.address]) }}
                    </span>
                    <span v-else>
                        +{{ item.diff }}
                    </span>
                </span>
                <span v-if="changeDirection(item.diff) === 0">0</span>
                <span v-if="changeDirection(item.diff) < 0" class="error--text">
                    <span v-if="decimals[item.address]">
                        {{ item.diff | fromWei('ether', '', decimals[item.address]) }}
                    </span>
                    <span v-else>
                        {{ item.diff }}
                    </span>
                </span>
            </template>
        </v-data-table>
    </div>
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
        tableHeaders: [],
        newBalances: {},
        decimals: {}
    }),
    mounted: function() {
        this.tableHeaders.push(
            { text: 'Address', value: 'address' },
            { text: `Previous Block (#${this.previousBlockNumber})`, value: 'before' },
            { text: `Tx Block (#${parseInt(this.blockNumber)})`, value: 'now' },
            { text: 'Change', value: 'change' }
        );
        for (let i = 0; i < this.balanceChanges.length; i++) {
            this.db
                .collection('contracts')
                .doc(this.token)
                .get()
                .then(doc => {
                    const data = doc.data();

                    if (!data) return;

                    if (data.token && data.token.decimals)
                        this.$set(this.decimals, this.balanceChanges[i].address, data.token.decimals);
                });
        }
    },
    methods: {
        changeDirection: function(diff) {
            if (!diff) return 0;

            const bigDiff = ethers.BigNumber.from(diff);
            if (bigDiff.gt('0'))
                return 1;
            else if (bigDiff.eq('0'))
                return 0;
            else
                return -1;
        },
        formatAmount: function(amount) {
            return parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(amount))).toLocaleString();
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
