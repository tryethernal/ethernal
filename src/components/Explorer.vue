<template>
    <v-container fluid>
        <v-card>
            <v-card-text>
                <v-tabs v-model="tab">
                    <v-tab id="generalTab" value="general">General</v-tab>
                    <v-tab id="faucetTab" value="faucet">Faucet</v-tab>
                    <v-tab id="dexTab" value="dex">Dex</v-tab>
                </v-tabs>

                <v-tabs-window v-model="tab">
                    <v-tabs-window-item value="general">
                        <Explorer-General :id="id" :sso="sso" />
                    </v-tabs-window-item>

                    <v-tabs-window-item value="faucet">
                        <Explorer-Faucet-Settings :explorerId="id" :sso="sso" />
                    </v-tabs-window-item>

                    <v-tabs-window-item value="dex">
                        <Explorer-Dex-Settings :explorerId="id" :sso="sso" />
                    </v-tabs-window-item>
                </v-tabs-window>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ExplorerGeneral from './ExplorerGeneral.vue';
import ExplorerFaucetSettings from './ExplorerFaucetSettings.vue';
import ExplorerDexSettings from './ExplorerDexSettings.vue';

// Define props
const props = defineProps({
    id: {
        type: [String, Number],
        required: true
    },
    sso: {
        type: Boolean,
        default: false
    }
});

const route = useRoute();
const router = useRouter();

// Computed property for tab management
const tab = computed({
    get: () => route.query.tab,
    set: (newTab) => {
        router.replace({ 
            query: { ...route.query, tab: newTab }
        }).catch(() => {});
    }
});
</script>
