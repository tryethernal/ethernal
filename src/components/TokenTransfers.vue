<template>
    <v-data-table
        :hide-default-footer="transfers.length <= 10"
        :headers="tableHeaders"
        :items="transfers">
        <template v-slot:item.src="{ item }">
            <Hash-Link :type="'address'" :hash="item.src" :fullHash="true" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.dst="{ item }">
            <Hash-Link :type="'address'" :hash="item.dst" :fullHash="true" :withName="true" />
        </template>
        <template v-slot:item.token="{ item }">
            <Hash-Link :type="'address'" :hash="item.token" :withName="true" :withTokenName="true" />
        </template>
        <template v-slot:item.amount="{ item }">
            <span v-if="decimals[item.token]">
                {{ item.amount | fromWei('ether', symbols[item.token], decimals[item.token]) }}
            </span>
            <span v-else>
                {{ item.amount }}
            </span>
        </template>
    </v-data-table>
</template>
<script>
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'TokenTransfers',
    props: ['transfers'],
    components: {
        HashLink
    },
    filters: {
        FromWei
    },
    data: () => ({
        tableHeaders: [
            { text: 'From', value: 'src' },
            { text: 'To', value: 'dst' },
            { text: 'Token', value: 'token' },
            { text: 'Amount', value: 'amount' }
        ],
        decimals: {},
        symbols: {}
    }),
    mounted() {
        for (let i = 0; i < this.transfers.length; i++) {
            this.$set(this.symbols, this.transfers[i].token, '');
            this.server.getContract(this.transfers[i].token)
                .then(({ data }) => {
                    const contract = data;
                    if (!contract) return;

                    if (contract.tokenDecimals)
                        this.$set(this.decimals, this.transfers[i].token, data.tokenDecimals);
                    if (contract.tokenSymbol)
                        this.$set(this.symbols, this.transfers[i].token, data.tokenSymbol);
                });
        }
    }
}
</script>
