<template>
    <v-container fluid>
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
    </v-container>
</template>

<script>
import ExplorerGeneral from './ExplorerGeneral.vue';
import ExplorerFaucetSettings from './ExplorerFaucetSettings.vue';
import ExplorerDexSettings from './ExplorerDexSettings.vue';

export default {
    name: 'Explorer',
    props: ['id', 'sso'],
    components: {
        ExplorerGeneral,
        ExplorerFaucetSettings,
        ExplorerDexSettings
    },
    computed: {
        tab: {
            set(tab) {
                this.$router.replace({ query: { ...this.$route.query, tab } }).catch(()=>{});
            },
            get() {
                return this.$route.query.tab;
            }
        }
    }
}
</script>
