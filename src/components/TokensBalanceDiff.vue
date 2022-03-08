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
               {{ item.previousBalance }}
            </template>
            <template v-slot:item.now="{ item }">
               {{ item.currentBalance }}
            </template>
            <template v-slot:item.change="{ item }">
               <span v-if="changeDirection(item.diff) > 0" class="success--text">+{{ item.diff }}</span>
               <span v-if="changeDirection(item.diff) === 0">0</span>
               <span v-if="changeDirection(item.diff) < 0" class="error--text">{{ item.diff }}</span>
            </template>
        </v-data-table>
    </div>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';
import HashLink from './HashLink';

export default {
    name: 'TokensBalanceDiff',
    props: ['token', 'balanceChanges', 'blockNumber'],
    components: {
        HashLink
    },
    data: () => ({
        tableHeaders: [],
        newBalances: {}
    }),
    mounted: function() {
        this.tableHeaders.push(
            { text: 'Address', value: 'address' },
            { text: `Previous Block (#${this.previousBlockNumber})`, value: 'before' },
            { text: `Tx Block (#${parseInt(this.blockNumber)})`, value: 'now' },
            { text: 'Change', value: 'change' }
        );
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
