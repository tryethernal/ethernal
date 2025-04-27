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
