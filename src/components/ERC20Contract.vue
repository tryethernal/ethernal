<template>
    <v-container fluid>
        <v-tabs v-model="tab">
            <v-tab id="transactionsTab" href="#transactions">Transactions</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="transactions">
                <Address-Transactions-List :address="address" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>

import { mapGetters } from 'vuex';

import AddressTransactionsList from './AddressTransactionsList';

export default {
    name: 'ERC20Contract',
    props: ['address'],
    components: {
        AddressTransactionsList,
    },
    data: () => ({
    }),
    methods: {},
    computed: {
        ...mapGetters([
            'currentWorkspace',
            'isPublicExplorer',
            'isUserAdmin'
        ])
    }
}
</script>
<style scoped>
</style>
