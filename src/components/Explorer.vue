<template>
    <v-container fluid>
        <template v-if="explorer">
            <h2>{{ explorerName }}</h2>
            <v-row>
                <v-col cols="6">
                    <h4>Settings</h4>
                    <v-card outlined class="mb-4">
                        <v-card-text>
                            <v-form @submit.prevent="updateExplorerSettings()" v-model="valid">
                                <v-row>
                                    <v-col>
                                        <v-select
                                            outlined
                                            dense
                                            label="Associated Workspace"
                                            v-model="currentWorkspace"
                                            item-text="name"
                                            :items="workspaces"
                                            return-object>
                                            <template v-slot:item="{ item }">
                                                {{ item.name }}<small class="ml-2">({{ item.rpcServer }} | {{  item.networkId }})</small>
                                            </template>
                                            <template v-slot:selection="{ item }">
                                                {{ item.name }}<small class="ml-2">({{ item.rpcServer }} | {{  item.networkId }})</small>
                                            </template>
                                        </v-select>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="explorer.name"
                                            id="name"
                                            label="Name"></v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="explorer.slug"
                                            :suffix="`.${mainDomain}`"
                                            id="domain"
                                            label="Domain"></v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="explorer.token"
                                            id="token"
                                            label="Native Token"></v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            hide-details="auto"
                                            v-model="explorer.totalSupply"
                                            id="totalSupply"
                                            label="Total Supply (in wei)"></v-text-field>
                                        <v-checkbox
                                            v-if="currentWorkspace"
                                            v-model="currentWorkspace.statusPageEnabled"
                                            label="Public Status Page Enabled"></v-checkbox>
                                    </v-col>
                                </v-row>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="loading" color="primary" :disabled="!valid" type="submit">Update</v-btn>
                                </v-card-actions>
                            </v-form>
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="6">
                    <h4>Billing</h4>
                    <v-card outlined>
                        <v-card-text>
                            <div>
                                Plan: <b>Explorer 150 - <span class="success--text">Active</span></b>
                            </div>
                            <div>
                                Monthly Transaction Quota: <b>12 / 10,000</b> (Resetting on 06-06-2023)
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
            <v-row>
                <v-col v-if="explorer.themes">
                    <h4>Branding</h4>
                    <v-card outlined class="mb-4">
                        <v-form @submit.prevent="updateColors()" v-model="valid">
                            <v-card-text>
                                <v-row>
                                    <v-col cols="6">
                                        <div v-for="(key, idx) in Object.keys(themes.light)" :key="idx">
                                            <v-text-field
                                                @focus="selectedColorPicker = key"
                                                @blur="selectedColorPicker = null"
                                                outlined
                                                dense
                                                v-model="themes.light[key]"
                                                :label="key.charAt(0).toUpperCase() + key.slice(1) + ' Color'">
                                                <template v-slot:prepend>
                                                    <v-icon @click="selectedColorPicker = selectedColorPicker ? null : key" :color="themes.light[key]">mdi-square</v-icon>
                                                </template>
                                            </v-text-field>
                                            <v-color-picker
                                                v-show="selectedColorPicker == key"
                                                v-model="themes.light[key]"
                                                dot-size="25"
                                                hide-inputs></v-color-picker>
                                        </div>
                                    </v-col>
                                    <v-col cols="6">
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="themes.logo"
                                            id="logoUrl"
                                            label="Logo URL">
                                            <template v-slot:prepend v-if="themes.logo">
                                                <v-img :src="themes.logo" max-width="150" class="mb-4"></v-img>
                                            </template>
                                        </v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="themes.favicon"
                                            id="faviconUrl"
                                            label="Favicon URL">
                                            <template v-slot:prepend v-if="themes.favicon">
                                                <v-img :src="themes.favicon" class="mb-4"></v-img>
                                            </template>
                                        </v-text-field>
                                        <v-autocomplete outlined dense append-icon=""
                                            label="Font"
                                            :hint="'Font needs to be available on Google Fonts (default is Roboto)'"
                                            v-model="themes.font"
                                            :items="fonts"
                                            :loading="fontSearchLoading"
                                            :search-input.sync="queryFont"
                                            hide-no-data
                                            persistent-hint
                                            no-filter></v-autocomplete>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="themes.banner"
                                            id="banner"
                                            label="Banner Text"></v-text-field>
                                        <h4 class="mb-2">Links</h4>

                                        <New-Explorer-Link v-for="(link, idx) in explorerLinks" :name="link.name" :url="link.url" :icon="link.icon" :index="idx" :uid="link.uid" :key="link.uid" @updated="onUpdatedExplorerLink" @removed="onRemovedExplorerLink" />

                                        <a @click.stop="addExplorerLink()">Add</a>
                                    </v-col>
                                </v-row>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn id="updateExplorer" :loading="loading" color="primary" :disabled="!valid" type="submit">Update</v-btn>
                                </v-card-actions>
                            </v-card-text>
                        </v-form>
                    </v-card>
                </v-col>
            </v-row>
        </template>
        <template v-else>
            <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
        </template>
    </v-container>
</template>

<script>
import NewExplorerLink from './NewExplorerLink.vue';

export default {
    name: 'Explorer',
    props: ['id'],
    components: {
        NewExplorerLink
    },
    data: () => ({
        mainDomain: process.env.VUE_APP_MAIN_DOMAIN,
        explorerName: null,
        currentWorkspace: null,
        workspaces: [],
        explorerLinks: [],
        queryFont: null,
        fonts: [],
        fontSearchLoading: false,
        selectedColorPicker: null,
        valid: false,
        loading: true,
        explorer: null,
        themes: {
            links: []
        }
    }),
    methods: {
        onUpdatedExplorerLink(data) {
            this.explorerLinks[data.index] = data.link;
        },
        onRemovedExplorerLink(data) {
            const newArray = [];
            for (let i = 0; i < this.explorerLinks.length; i++)
                if (data.uid != this.explorerLinks[i].uid)
                    newArray.push(this.explorerLinks[i]);
            this.explorerLinks = newArray;
        },
        addExplorerLink() {
            this.explorerLinks.push({ url: null, name: null, icon: null, uid: Math.floor(Math.random() * 10000) });
        },
        loadExplorer(id) {
            this.loading = true;
            this.server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log);

            this.server.getExplorer(id)
                .then(({ data }) => {
                    this.explorer = data;
                    this.explorerName = data.name;
                    this.themes.light = data.themes.light || { ...this.$vuetify.theme.themes.light };
                    this.explorerLinks = data.themes.links || [];
                    this.currentWorkspace = data.workspace;
                    if (this.themes.logo)
                        this.isLogoUrlValid = true;
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        updateExplorerSettings() {
            this.loading = true;
            const settings = {
                workspace: this.currentWorkspace.name,
                name: this.explorer.name,
                slug: this.explorer.slug,
                token: this.explorer.token,
                totalSupply: this.explorer.totalSupply,
                statusPageEnabled: this.explorer.statusPageEnabled,
            };

            this.server.updateExplorerSettings(this.id, settings)
                .then(() => this.loadExplorer(this.id))
                .catch(console.log)
                .finally(() => this.loading = false);
        }
    },
    watch: {
        id: {
            immediate: true,
            handler(id) { this.loadExplorer(id); }
        },
        queryFont(query) {
            if (!query) return this.fonts = [];

            this.fontSearchLoading = true;
            this.server.searchFont(this.queryFont)
                .then(({ data }) => this.fonts = data)
                .catch(console.log)
                .finally(() => this.fontSearchLoading = false);
        }
    }
}
</script>
