<template>
    <v-card>
        <v-card-text>
            <Transactions-List 
                @listUpdated="$emit('list-updated')" 
                :blockNumber="blockNumber" 
                :withCount="true" 
            />
        </v-card-text>
    </v-card>
</template>

/**
 * @fileoverview Block transaction list component.
 * Wrapper for TransactionsList that displays transactions for a specific block.
 * @component BlockTransactionList
 *
 * @prop {string|number} blockNumber - The block number to show transactions for
 * @emits list-updated - Emitted when the transaction list is updated
 */
<script setup>
import TransactionsList from './TransactionsList.vue';

// Props
const props = defineProps({
    blockNumber: {
        type: [String, Number],
        required: true
    }
});

// Emits
const emit = defineEmits(['list-updated']);
</script>
