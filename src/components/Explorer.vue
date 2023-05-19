<template>
    <v-container fluid>
        <template v-if="explorer">
            <h2>{{ explorerName }}</h2>
            <v-row>
                <v-col cols="6">
                    <h4>Settings</h4>
                    <v-card outlined class="mb-4">
                        <v-card-text>
                            <v-alert v-show="settingsUpdated" dense text type="success">Settings updated</v-alert>
                            <v-alert v-show="settingsUpdateError" dense text type="error">{{ settingsUpdateError }}</v-alert>
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
                                            label="Name"></v-text-field>
                                        <v-text-field
                                            class="mb-2"
                                            dense
                                            outlined
                                            v-model="explorer.slug"
                                            :suffix="`.${mainDomain}`"
                                            hint="Your explorer will always be reachable at this address"
                                            persistent-hint
                                            label="Ethernal Domain"></v-text-field>
                                        <v-text-field
                                            class="mb-2"
                                            dense
                                            outlined
                                            :disabled="!capabilities.customDomain"
                                            :hint="capabilities.customDomain ? '' : 'Upgrade your plan to add a custom domain name'"
                                            persistent-hint
                                            v-model="explorer.domain"
                                            label="Custom Domain"></v-text-field>
                                        <v-text-field
                                            class="mb-2"
                                            dense
                                            outlined
                                            :disabled="!capabilities.nativeToken"
                                            :hint="capabilities.nativeToken ? '' : 'Upgrade your plan to customize your native token symbol'"
                                            v-model="explorer.token"
                                            persistent-hint
                                            label="Native Token"></v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            type="number"
                                            :disabled="!capabilities.totalSupply"
                                            :hint="capabilities.totalSupply ? `In ether: ${formatTotalSupply()}` : 'Upgrade your plan to display a total supply'"
                                            persistent-hint
                                            hide-details="auto"
                                            v-model="explorer.totalSupply"
                                            label="Total Supply (in wei)"></v-text-field>
                                        <v-checkbox
                                            v-if="currentWorkspace"
                                            :disabled="!capabilities.statusPage"
                                            v-model="currentWorkspace.statusPageEnabled"
                                            :hint="capabilities.statusPage ? '' : 'Upgrade your plan to enable the status page'"
                                            persistent-hint
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
                                Plan: <b>Explorer {{ explorer.plan }} - <span class="success--text">Active</span></b>
                            </div>
                            <div>
                                Monthly Transaction Quota: <b>12 / {{ capabilities.txLimit.toLocaleString() }}</b> (Resetting on 06-06-2023)
                            </div>
                            <div>
                                <v-btn color="primary" @click="upgrade()">Upgrade</v-btn>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
            <v-row>
                <v-col v-if="explorer.themes">
                    <h4>Branding</h4>
                    <v-card outlined class="mb-4">
                        <v-form @submit.prevent="updateBranding()" v-model="valid">
                            <v-card-text>
                                <v-alert v-show="brandingUpdated" dense text type="success">Branding updated</v-alert>
                                <v-alert v-show="brandingUpdateError" dense text type="error">{{ brandingUpdateError }}</v-alert>
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
                                            label="Logo URL">
                                            <template v-slot:prepend v-if="themes.logo">
                                                <v-img :src="themes.logo" max-width="150" class="mb-4"></v-img>
                                            </template>
                                        </v-text-field>
                                        <v-text-field
                                            dense
                                            outlined
                                            v-model="themes.favicon"
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
                                            label="Banner Text"></v-text-field>
                                        <h4 class="mb-2">Links</h4>

                                        <New-Explorer-Link v-for="(link, idx) in themes.links" :name="link.name" :url="link.url" :icon="link.icon" :index="idx" :uid="link.uid" :key="link.uid" @updated="onUpdatedExplorerLink" @removed="onRemovedExplorerLink" />

                                        <a @click.stop="addExplorerLink()">Add</a>
                                    </v-col>
                                </v-row>
                                <v-card-actions>
                                    <v-spacer></v-spacer>
                                    <v-btn :loading="loading" color="primary" :disabled="!valid" type="submit">Update</v-btn>
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
import { formatNumber } from '../lib/utils';

export default {
    name: 'Explorer',
    props: ['id'],
    components: {
        NewExplorerLink
    },
    data: () => ({
        settingsUpdated: false,
        brandingUpdated: false,
        settingsUpdateError: null,
        brandingUpdateError: null,
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
        capabilities: null,
        themes: {
            links: []
        }
    }),
    methods: {
        upgrade() {
            this.server.createStripeCheckoutSession('explorer-50', `/explorers/${this.id}?status=upgraded`, `/explorers/${this.id}`)
                .then(({ data }) => {
                    document.location.href = data.url;
                })
                .catch((error) => {
                    alert('An error occured while setting up the payment processor. Please retry.')
                    console.log(error);
                })
                .finally(() => this.subscriptionButtonLoading = false);
        },
        formatTotalSupply() {
            if (!this.explorer && !this.explorer.totalSupply) return '';
            return formatNumber(this.explorer.totalSupply)
        },
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
        loadExplorer(id) {
            this.loading = true;
            this.server.getWorkspaces()
                .then(({ data }) => this.workspaces = data)
                .catch(console.log);

            this.server.getExplorer(id)
                .then(({ data }) => {
                    this.explorer = data;
                    this.explorerName = data.name;
                    this.themes = data.themes;
                    this.themes.light = { ...this.$vuetify.theme.themes.light, ...data.themes.light };
                    this.explorerLinks = data.themes.links || [];
                    this.currentWorkspace = data.workspace;
                    this.capabilities = data.stripeSubscription.stripePlan.capabilities;
                    console.log(this.themes.font)
                    if (this.themes.font)
                        this.fonts.push(this.themes.font);
                })
                .catch(console.log)
                .finally(() => this.loading = false);
        },
        updateExplorerSettings() {
            this.loading = true;
            this.settingsUpdated = false;
            this.settingsUpdateError = false;
            const settings = {
                workspace: this.currentWorkspace.name,
                name: this.explorer.name,
                slug: this.explorer.slug,
                token: this.explorer.token,
                totalSupply: this.explorer.totalSupply,
                statusPageEnabled: this.currentWorkspace.statusPageEnabled,
            };

            this.server.updateExplorerSettings(this.id, settings)
                .then(() => {
                    this.settingsUpdated = true;
                    this.loadExplorer(this.id);
                })
                .catch(error => {
                    if (error.response)
                        this.settingsUpdateError = error.response.data;
                })
                .finally(() => this.loading = false);
        },
        updateBranding() {
            this.loading = true;
            this.brandingUpdated = false;
            this.brandingUpdateError = null;
            this.server.updateExplorerBranding(this.id, this.themes)
                .then(() => {
                    this.brandingUpdated = true;
                    this.loadExplorer(this.id);
                })
                .catch(error => {
                    if (error.response)
                        this.brandingUpdateError = error.response.data;
                })
                .finally(() => {
                    this.loading = false
                });
        }
    },
    watch: {
        id: {
            immediate: true,
            handler(id) { this.loadExplorer(id); }
        },
        queryFont(query) {
            if (!query || query == this.themes.font) return;

            this.fontSearchLoading = true;
            this.server.searchFont(this.queryFont)
                .then(({ data }) => this.fonts = data)
                .catch(console.log)
                .finally(() => this.fontSearchLoading = false);
        }
    },
}
</script>
