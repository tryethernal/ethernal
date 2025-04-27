<template>
    <Transactions-List :address="address" :currentAddress="address"></Transactions-List>
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
