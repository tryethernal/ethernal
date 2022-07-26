<template>
    <v-container fluid>
        <h4>Balances</h4>
        <v-card outlined class="mb-4">
            <v-card-text v-if="!loading">
                Add an address on the <router-link :to="'/accounts'">accounts</router-link> page to track its balance.
                <pre v-show="Object.keys(balances).length">{{ formatBalances(balances) }}</pre>
            </v-card-text>
            <v-skeleton-loader v-else class="col-5" type="list-item-three-line"></v-skeleton-loader>
        </v-card>
    </v-container>
</template>
<script>
const ethers = require('ethers');
import { mapGetters } from 'vuex';
const ERC20_ABI = require('../abis/erc20');

export default {
    name: 'Token',
    props: ['contract'],
    data: () => ({
        accounts: [],
        callOptions: {
            from: null
        },
        loading: false,
        balances: []
    }),
    mounted: function() {
        this.fetchBalances();
    },
    methods: {
        fetchBalance: function(account) {
            this.loading = true;
            return this.server.callContractReadMethod(
                { ...this.contract, abi: ERC20_ABI },
                'balanceOf(address)',
                this.callOptions,
                { 0: account },
                this.currentWorkspace.rpcServer
            )
            .then(res => {
                this.balances.push({ address: account, amount: res[0] });
            })
            .catch(console.log)
            .finally(() => this.loading = false);
        },
        formatBalances: function(balances) {
            let formatted = {};
            balances.forEach((balance) => {
                formatted[balance.address] = ethers.BigNumber.from(balance.amount).toString()
            });
            return formatted;
        },
        fetchBalances: function() {
            this.loading = true;
            this.server.getAccounts({ page: -1 })
            .then(({ data: { items }}) => {
                this.accounts = items.map(i => i.address);
                const promises = [];
                for (let i = 0; i < this.accounts.length; i++)
                    promises.push(this.fetchBalance(this.accounts[i]));

                Promise.all(promises).finally(() => this.loading = false);
            })
            .catch(() => this.loading = false);
        }
    },
    watch: {
        contract: function() {
            this.fetchBalances();
        }
    },
    computed: {
        ...mapGetters([
            'currentWorkspace'
        ])
    }
}
</script>
