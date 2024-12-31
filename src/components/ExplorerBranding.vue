<template>
    <v-card border flat :disabled="disabled">
        <v-form @submit.prevent="update()" v-model="valid">
            <v-card-text>
                <v-alert v-if="disabled" text type="warning">Upgrade your plan to activate branding customization.</v-alert>
                <v-alert v-if="successMessage" density="compact" text type="success">{{ successMessage }}</v-alert>
                <v-alert v-if="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>
                <v-row class="mt-3">
                    <v-col cols="6">
                        <div v-for="(key, idx) in Object.keys(themes.light)" :key="idx">
                            <v-text-field
                                @focus="selectedColorPicker = key"
                                @blur="selectedColorPicker = null"
                                hide-details="auto"
                                :class="{
                                    'mb-2': selectedColorPicker == key,
                                    'mt-2 mb-5': idx > 0 && selectedColorPicker != key,
                                    'mb-5': idx == 0 && selectedColorPicker != key
                                }"
                                variant="outlined"
                                density="compact"
                                v-model="themes.light[key]"
                                :label="key.charAt(0).toUpperCase() + key.slice(1) + ' Color'">
                                <template v-slot:prepend>
                                    <v-icon style="opacity: 1;" @click="selectedColorPicker = selectedColorPicker == key ? null : key" :color="themes.light[key]">mdi-square</v-icon>
                                </template>
                            </v-text-field>
                            <v-color-picker
                                class="mb-4"
                                v-show="selectedColorPicker == key"
                                v-model="themes.light[key]"></v-color-picker>
                        </div>
                    </v-col>
                    <v-col cols="6">
                        <v-text-field
                            density="compact"
                            class="mb-5"
                            variant="outlined"
                            hide-details="auto"
                            v-model="themes.logo"
                            label="Logo URL">
                            <template v-slot:prepend v-if="themes.logo">
                                <v-img :src="themes.logo" max-width="150" class="mb-4"></v-img>
                            </template>
                        </v-text-field>
                        <v-text-field
                            density="compact"
                            class="mb-5"
                            variant="outlined"
                            hide-details="auto"
                            v-model="themes.favicon"
                            label="Favicon URL">
                            <template v-slot:prepend v-if="themes.favicon">
                                <v-img :src="themes.favicon" class="mb-4"></v-img>
                            </template>
                        </v-text-field>
                        <v-autocomplete variant="outlined" density="compact" append-icon=""
                            label="Font"
                            class="mb-5"
                            hint="Font needs to be available on Google Fonts (default is Roboto)"
                            v-model="themes.font"
                            :items="fonts"
                            :loading="fontSearchLoading"
                            :search.sync="queryFont"
                            hide-no-data
                            persistent-hint
                            no-filter></v-autocomplete>
                        <v-text-field
                            density="compact"
                            class="mb-5"
                            variant="outlined"
                            hide-details="auto"
                            v-model="themes.banner"
                            label="Banner Text"></v-text-field>
                        <h4 class="mb-2">Links</h4>

                        <New-Explorer-Link v-for="(link, idx) in themes.links" :name="link.name" :url="link.url" :icon="link.icon" :index="idx" :uid="link.uid" :key="link.uid" @updated="onUpdatedExplorerLink" @removed="onRemovedExplorerLink" />

                        <a @click.stop="addExplorerLink()">Add</a>
                    </v-col>
                </v-row>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn :loading="loading" color="primary" variant="flat" :disabled="!valid" type="submit">Update</v-btn>
                </v-card-actions>
            </v-card-text>
        </v-form>
    </v-card>
</template>

<script>
import { useTheme } from 'vuetify';

import NewExplorerLink from './NewExplorerLink.vue';

const whitelistedColors = ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning', 'background'];

export default {
    name: 'ExplorerBranding',
    props: ['explorer', 'disabled'],
    components: {
        NewExplorerLink,
    },
    data: () => ({
        successMessage: null,
        errorMessage: null,
        explorerLinks: [],
        queryFont: null,
        fonts: [],
        fontSearchLoading: false,
        selectedColorPicker: null,
        valid: false,
        loading: false,
        themes: {
            links: [],
            light: {}
        }
    }),
    setup() {
        const theme = useTheme();
        return { defaultColors: theme.global.current.value.colors };
    },
    mounted() {
        const filteredColors = {};
        for (const color of whitelistedColors)
            filteredColors[color] = (this.explorer.themes.light && this.explorer.themes.light[color]) || this.defaultColors[color];

        this.themes.light = filteredColors;

        if (this.themes.font)
            this.fonts.push(this.themes.font);
        if (this.explorer.themes.links)
            this.themes.links = this.explorer.themes.links;
    },
    methods: {
        onUpdatedExplorerLink(data) {
            this.themes.links[data.index] = data.link;
        },
        onRemovedExplorerLink(uid) {
            const index = this.themes.links.map(l => l.uid).indexOf(uid);
            if (index >= 0)
                this.themes.links.splice(index, 1);
        },
        addExplorerLink() {
            this.themes.links.push({ url: null, name: null, icon: null, uid: Math.floor(Math.random() * 10000) });
        },
        update() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;
            this.$server.updateExplorerBranding(this.explorer.id, this.themes)
                .then(() => {
                    this.successMessage = 'Branding updated successfully.';
                })
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while updating branding. Please retry.';
                })
                .finally(() => {
                    this.loading = false;
                });
        },
    },
    watch: {
        queryFont(query) {
            if (!query || query == this.themes.font) return;

            this.fontSearchLoading = true;
            this.$server.searchFont(this.queryFont)
                .then(({ data }) => this.fonts = data)
                .catch(console.log)
                .finally(() => this.fontSearchLoading = false);
        }
    }
}
</script>
