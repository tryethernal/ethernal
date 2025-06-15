<template>
    <Router-View></Router-View>
</template>

<script>
import { provide } from 'vue';

export default {
    name: 'Embedded',
    setup() {
        provide('isEmbedded', true);
    }
};
</script>
