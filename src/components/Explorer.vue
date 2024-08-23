<template>
    <v-container fluid>
        <v-tabs v-model="tab">
            <v-tab id="generalTab" href="#general">General</v-tab>
            <v-tab id="faucetTab" href="#faucet">Faucet</v-tab>
            <v-tab id="dexTab" href="#dex">Dex</v-tab>
        </v-tabs>

        <v-tabs-items :value="tab">
            <v-tab-item value="general">
                <Explorer-General :id="id" :sso="sso" />
            </v-tab-item>

            <v-tab-item value="faucet">
                <Explorer-Faucet-Settings :explorerId="id" :sso="sso" />
            </v-tab-item>

            <v-tab-item value="dex">
                <Explorer-Dex-Settings :explorerId="id" :sso="sso" />
            </v-tab-item>
        </v-tabs-items>
    </v-container>
</template>

<script>
import ExplorerGeneral from './ExplorerGeneral';
import ExplorerFaucetSettings from './ExplorerFaucetSettings';
import ExplorerDexSettings from './ExplorerDexSettings';

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
