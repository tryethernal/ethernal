<template>
    <v-container fluid>
        <Transactions-List :address="address" :currentAddress="address"></Transactions-List>
    </v-container>
</template>

<script>
import TransactionsList from './TransactionsList.vue';

export default {
    name: 'AddressTransactionsList',
    props: ['address'],
    components: {
        TransactionsList
    }
}
</script>
