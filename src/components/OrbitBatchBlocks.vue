<template>
    <v-card>
        <v-card-text>
            <Block-List :batchNumber="batchNumber" />
        </v-card-text>
    </v-card>
</template>

<script setup>
import BlockList from './BlockList.vue';

const props = defineProps({
    batchNumber: {
        type: Number,
        required: true
    }
});
</script>
