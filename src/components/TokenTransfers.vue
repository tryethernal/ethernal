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
            <Hash-Link :type="'address'" :hash="item.token" :withName="true" />
        </template>
        <template v-slot:item.amount="{ item }">
            {{ item.amount }}
        </template>
    </v-data-table>
</template>
<script>
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
   })
}
</script>
