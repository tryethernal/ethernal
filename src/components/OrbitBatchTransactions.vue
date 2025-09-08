<template>
    <v-card>
        <v-card-text>
            <Transactions-List :batchNumber="batchNumber" />
        </v-card-text>
    </v-card>
</template>

<script setup>
import TransactionsList from './TransactionsList.vue';

const props = defineProps({
    batchNumber: {
        type: Number,
        required: true
    }
});
</script>
