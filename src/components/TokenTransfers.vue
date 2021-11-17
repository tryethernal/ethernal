<template>
    <v-data-table
        :hide-default-footer="transfers.length <= 10"
        :headers="tableHeaders"
        :items="transfers">
        <template v-slot:item.src="{ item }">
            <Hash-Link :type="'address'" :hash="item.src" :fullHash="true" :withName="true" />
        </template>
        <template v-slot:item.dst="{ item }">
            <Hash-Link :type="'address'" :hash="item.dst" :fullHash="true" :withName="true" />
        </template>
        <template v-slot:item.token="{ item }">
            <Hash-Link :type="'address'" :hash="item.token" :withName="true" />
        </template>
        <template v-slot:item.amount="{ item }">
            {{ formatAmount(item.amount) }}
        </template>
    </v-data-table>
</template>
<script>
const ethers = require('ethers');
import HashLink from './HashLink';

export default {
    name: 'TokenTransfers',
    props: ['transfers'],
    components: {
        HashLink
    },
    data: () => ({
        tableHeaders: [
            { text: 'From', value: 'src' },
            { text: 'To', value: 'dst' },
            { text: 'Token', value: 'token' },
            { text: 'Amount', value: 'amount' }
        ]
    }),
    mounted: function() {
        console.log(this.transfers)
    },
    methods: {
        formatAmount: function(amount) {
            return ethers.utils.formatUnits(ethers.BigNumber.from(amount)).toLocaleString();
        }
    }
}
</script>
