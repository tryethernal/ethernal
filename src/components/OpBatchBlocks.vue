<template>
    <v-card>
        <v-card-text>
            <BlockList :opBatchIndex="batchIndex" />
        </v-card-text>
    </v-card>
</template>

<script setup>
import BlockList from './BlockList.vue';

const props = defineProps({
    batchIndex: {
        type: Number,
        required: true
    }
});
</script>
