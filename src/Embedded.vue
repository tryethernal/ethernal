<template>
    <v-app>
        <Router-View></Router-View>
    </v-app>
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
