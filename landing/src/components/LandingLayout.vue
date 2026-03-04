<template>
    <div>
        <LandingNavbar />
        <v-main>
            <slot />
        </v-main>
        <LandingFooter />
    </div>
</template>

<script setup>
import LandingNavbar from './LandingNavbar.vue';
import LandingFooter from './LandingFooter.vue';
</script>
