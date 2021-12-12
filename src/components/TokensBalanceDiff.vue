<template>
    <div v-show="formattedBalances.length">
        <Hash-Link :type="'address'" :hash="contract.address" :withName="true" /><br>
        <v-data-table
            :hide-default-footer="formattedBalances.length <= 10"
            :headers="tableHeaders"
            :items="formattedBalances">
            <template v-slot:item.address="{ item }">
                <Hash-Link :type="'address'" :hash="item.address" />
            </template>
            <template v-slot:item.before="{ item }">
               {{ formatAmount(item.before) }}
            </template>
            <template v-slot:item.now="{ item }">
               {{ formatAmount(item.now) }}
            </template>
            <template v-slot:item.change="{ item }">
               <span v-if="item.change >= 0" class="success--text">+{{ formatAmount(item.change) }}</span>
               <span v-else class="danger--text">-{{ formatAmount(item.change) }}</span>
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
    props: ['contract', 'addresses', 'block'],
    components: {
        HashLink
    },
    data: () => ({
        tableHeaders: [],
        balances: {}
    }),
    mounted: function() {
        this.tableHeaders.push(
            { text: 'Address', value: 'address' },
            { text: `Previous Block (#${parseInt(this.block) - 1})`, value: 'before' },
            { text: `Tx Block (#${parseInt(this.block)})`, value: 'now' },
            { text: 'Change', value: 'change' }
        );
        for (let i = 0; i < this.validTokens.length; i++) {
            if (!this.balances[this.validTokens[i]])
                this.$set(this.balances, this.validTokens[i], {});

            this.server.callContractReadMethod(
                this.contract,
                'balanceOf(address)',
                { from: null },
                { 0: this.validTokens[i] },
                this.currentWorkspace.rpcServer
            ).then(res => this.$set(this.balances[this.validTokens[i]], 'now', res[0] ));

            this.server.callContractReadMethod(
                this.contract,
                'balanceOf(address)',
                { from: null, blockTag: parseInt(this.block) - 1 },
                { 0: this.validTokens[i] },
                this.currentWorkspace.rpcServer
            ).then(res => this.$set(this.balances[this.validTokens[i]], 'before', res[0] ));
        }
    },
    methods: {
        formatAmount: function(amount) {
            return parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(amount))).toLocaleString();
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ]),
        validTokens: function() {
            const BLACKLIST = ['0x0000000000000000000000000000000000000000'];
            return this.addresses.filter(token => BLACKLIST.indexOf(token) == -1);
        },
        formattedBalances: function() {
            const res = [];
            Object.keys(this.balances).forEach((address) => {
                if (this.balances[address] && this.balances[address].now && this.balances[address].before && this.balances[address].now.sub(this.balances[address].before) != 0 )
                    res.push({
                        address: address,
                        before: this.balances[address].before,
                        now: this.balances[address].now,
                       change: this.balances[address].now.sub(this.balances[address].before)
                    });
            });
            return res;
        }
    }
}
</script>
