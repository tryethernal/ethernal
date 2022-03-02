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
    props: ['contract', 'addresses', 'transaction'],
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
            { text: `Previous Block (#${parseInt(this.transaction.blockNumber) - 1})`, value: 'before' },
            { text: `Tx Block (#${parseInt(this.transaction.blockNumber)})`, value: 'now' },
            { text: 'Change', value: 'change' }
        );

        if (!this.transaction.balances && !this.isPublicExplorer)
            this.fetchTokenBalances();
    },
    methods: {
        formatAmount: function(amount) {
            return parseFloat(ethers.utils.formatUnits(ethers.BigNumber.from(amount))).toLocaleString();
        },
        fetchTokenBalances: function() {
            if (!this.validTokens.length)
                return this.server.storeTransactionBalanceChange(this.currentWorkspace.name, this.transaction.hash, {});

            for (let i = 0; i < this.validTokens.length; i++) {
                const newBalances = {};
                const promises = [];

                promises.push(
                    new Promise((resolve) => {
                        this.server.callContractReadMethod(
                            this.contract,
                            'balanceOf(address)',
                            { from: null },
                            { 0: this.validTokens[i] },
                            this.currentWorkspace.rpcServer
                        ).then(res => {
                            newBalances['now'] = res[0];
                        }).finally(resolve);
                    })
                );

                promises.push(
                    new Promise((resolve) => {
                        this.server.callContractReadMethod(
                            this.contract,
                            'balanceOf(address)',
                            { from: null, blockTag: Math.max(0, parseInt(this.transaction.blockNumber) - 1) },
                            { 0: this.validTokens[i] },
                            this.currentWorkspace.rpcServer
                        ).then(res => {
                            newBalances['before'] = res[0];
                        }).finally(resolve);
                    })
                );

                Promise.all(promises).then(() => {
                    this.server.storeTransactionBalanceChange(this.currentWorkspace.name, this.transaction.hash, { [this.validTokens[i]]: newBalances });
                });
            }
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer'
        ]),
        validTokens: function() {
            const BLACKLIST = ['0x0000000000000000000000000000000000000000'];
            return this.addresses.filter(token => BLACKLIST.indexOf(token) == -1);
        },
        formattedBalances: function() {
            const balances = this.transaction.balances;
            if (!balances) return [];

            const res = [];
            Object.keys(balances).forEach((address) => {
                if (!balances[address] || !balances[address].now) return;

                const before = ethers.BigNumber.from(balances[address].before || '0x0');
                const now = ethers.BigNumber.from(balances[address].now);
                res.push({
                    address: address,
                    before: before,
                    now: now,
                    change: now.sub(before)
                });
            });
            return res;
        }
    }
}
</script>
