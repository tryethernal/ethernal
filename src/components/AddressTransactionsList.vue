<template>
    <Transactions-List :address="address" :currentAddress="address"></Transactions-List>
</template>

/**
 * @fileoverview Address transactions list wrapper component.
 * Wrapper for TransactionsList that filters transactions by address.
 * @component AddressTransactionsList
 *
 * @prop {string} address - The Ethereum address to show transactions for
 */
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
