<template>
    <v-app :style="styles">
        <v-overlay :value="isOverlayActive" absolute :z-index="1000" color="primary" :opacity="0.2">
            <v-progress-circular
                indeterminate
                size="64"
                color="primary"
            ></v-progress-circular>
        </v-overlay>
        <v-system-bar height="40" v-html="banner" v-if="explorerStore && banner" class="primary color--text text-center font-weight-bold" color="primary" app></v-system-bar>
        <v-navigation-drawer v-model="drawer" :style="styles" app v-if="canDisplaySides">
            <div class="custom-logo-wrapper" v-if="logo">
                <img :src="logo" alt="logo" class="custom-logo" />
            </div>
            <v-list-item v-else>
                <v-list-item-content>
                    <v-list-item-title class="logo">
                        {{ explorerStore ? explorerStore.name : 'Ethernal' }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="color--text">v{{ envStore.version }}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>
            <v-list-item v-if="currentWorkspace.browserSyncEnabled">
                <v-alert text :icon="false" type="warning">
                    <v-progress-circular size="16" width="2" indeterminate color="warning"></v-progress-circular>
                    <a class="warning--text pl-2" @click.stop="openBrowserSyncExplainerModal()">
                        <span style="text-decoration: underline;">Browser Sync</span>
                    </a>
                </v-alert>
            </v-list-item>

            <v-list dense nav class="side--text">
                <v-list-item link :to="'/overview'">
                    <v-list-item-icon>
                        <v-icon>mdi-chart-box</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Overview</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/accounts'" v-if="!explorerStore || currentWorkspaceStore.accounts || isUserAdmin">
                    <v-list-item-icon>
                        <v-icon>mdi-account-multiple</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Accounts</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/blocks'">
                    <v-list-item-icon>
                        <v-icon>mdi-view-dashboard</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Blocks</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/transactions'">
                    <v-list-item-icon>
                        <v-icon>mdi-arrow-left-right</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Transactions</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/contracts'">
                    <v-list-item-icon>
                        <v-icon>mdi-file</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Contracts</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/tokens'">
                    <v-list-item-icon>
                        <v-icon>mdi-alpha-c-circle</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>ERC-20 Tokens</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/nfts'">
                    <v-list-item-icon>
                        <v-icon>mdi-palette-advanced</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>ERC-721 Tokens</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/analytics'" v-if="explorerStore">
                    <v-list-item-icon>
                        <v-icon>mdi-chart-box</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Analytics</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/faucet'" v-if="explorerStore && explorerStore.faucet">
                    <v-list-item-icon>
                        <v-icon>mdi-faucet</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Faucet</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/dex'" v-if="explorerStore && explorerStore.v2Dex">
                    <v-list-item-icon>
                        <v-icon>mdi-swap-horizontal</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Dex</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/status'" v-if="(isUserAdmin && currentWorkspace.public) || currentWorkspace.statusPageEnabled">
                    <v-list-item-icon>
                        <v-icon>mdi-heart-circle</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Status</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <template v-if="isUserAdmin">
                    <v-divider v-if="isUserAdmin" class="my-4"></v-divider>

                    <v-list-item link :to="'/explorers'">
                        <v-list-item-icon>
                            <v-icon>mdi-earth</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Public Explorers</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item link :to="'/settings?tab=workspace'">
                        <v-list-item-icon>
                            <v-icon>mdi-cog</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Settings</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                </template>
            </v-list>

            <template v-slot:append>
                <v-list dense nav>
                    <v-list-item link v-if="explorerStore && ethereum && hasNetworkInfo" @click="addNetworkToMetamask()">
                        <v-list-item-icon>
                            <Icon icon="arcticons:metamask" width="24" height="24" />
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Add To Metamask</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item v-for="(link, idx) in links" target="_blank" :href="link.url" :key="idx">
                        <v-list-item-icon>
                            <v-icon>{{ link.icon || 'mdi-open-in-new' }}</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>{{ link.name }}</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item target="_blank" :href="`https://doc.tryethernal.com`" v-if="!explorerStore">
                        <v-list-item-icon>
                            <v-icon>mdi-text-box-multiple</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Documentation</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item target="_blank" :href="`https://discord.gg/jEAprf45jj`" v-if="!explorerStore">
                        <v-list-item-icon>
                            <v-icon>mdi-forum</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Discord</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item v-show="prAuthToken" target="_blank" :href="`https://ethernal.productroad.com/company/auth/?token=${prAuthToken}`">
                        <v-list-item-icon>
                            <v-icon>mdi-feature-search</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Feature Requests</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item link @click="logOut()" v-if="userStore.loggedIn">
                        <v-list-item-icon>
                            <v-icon class="red--text text--darken-3">mdi-logout</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title class="red--text text--darken-3">Log Out</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <div class="caption text-center font-italic" v-if="explorerStore">
                        Powered By <a href="https://tryethernal.com" target="_blank">Ethernal</a>
                    </div>
                </v-list>
            </template>
        </v-navigation-drawer>

        <Migrate-Explorer-Modal ref="migrateExplorerModal" v-if="explorerToken || justMigrated" />
        <Onboarding-Modal ref="onboardingModal" />
        <Browser-Sync-Explainer-Modal ref="browserSyncExplainerModal" v-if="currentWorkspace.browserSyncEnabled" />

        <v-app-bar :style="styles" app dense fixed flat v-if="canDisplaySides">
            <component @toggleMenu="toggleMenu" :is="appBarComponent"></component>
        </v-app-bar>

        <v-main class="color--text" :style="styles">
            <component :is="routerComponent"></component>
        </v-main>
    </v-app>
</template>

<script>
const axios = require('axios');
import { Icon } from '@iconify/vue';
import WebFont from 'webfontloader';
import Vue from 'vue';
import detectEthereumProvider from '@metamask/detect-provider';
import { pusherPlugin } from './plugins/pusher';
import { useCurrentWorkspaceStore } from './stores/currentWorkspace';
import { useEnvStore } from './stores/env';
import { useExplorerStore } from './stores/explorer';
import { useUserStore } from './stores/user';
import RpcConnector from './components/RpcConnector';
import OnboardingModal from './components/OnboardingModal';
import BrowserSyncExplainerModal from './components/BrowserSyncExplainerModal';
import MigrateExplorerModal from './components/MigrateExplorerModal';

export default {
    name: 'App',
    components: {
        RpcConnector,
        OnboardingModal,
        BrowserSyncExplainerModal,
        MigrateExplorerModal,
        Icon
    },
    data: () => ({
        routerComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        }),
        appBarComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        }),
        prAuthToken: null,
        styles: {},
        logo: null,
        links: [],
        banner: null,
        isRemote: false,
        isOverlayActive: false,
        ethereum: null,
        drawer: null
    }),
    mounted() {
        detectEthereumProvider().then(provider => {
            if (!provider || provider !== window.ethereum) return;
            this.ethereum = provider;
        });
        this.isOverlayActive = true;
        if (localStorage.getItem('ssoApiToken'))
            localStorage.removeItem('ssoApiToken');

        axios.get(`${store.getters.apiRoot}/api/explorers/search?domain=${window.location.host}`)
            .then(({ data }) => {
                if (data.explorer) {
                    store.dispatch('setPublicExplorerData', data.explorer);
                    this.setupPublicExplorer();
                }
                else
                    this.setupPrivateExplorer();
            })
            .catch(() => document.location.href = `//app.${store.getters.mainDomain}`);
    },
    methods: {
        setupPrivateExplorer() {
            this.server.getCurrentUser()
                .then(({ data }) => {
                    this.authStateChanged(data);
                    if (this.justMigrated) {
                        this.isOverlayActive = false;
                        this.$refs.migrateExplorerModal.open({ explorerId: parseInt(this.$route.query.justMigrated), justMigrated: true });
                    }
                    else if (this.explorerToken)
                        this.migrateExplorer();
                    else
                        data.currentWorkspace ?
                            this.initWorkspace(data.currentWorkspace) :
                            this.launchOnboarding();
                })
                .catch(() => {
                    this.isOverlayActive = false;
                    this.routerComponent = 'router-view';
                    this.authStateChanged(null);
                })
        },
        migrateExplorer() {
            this.server.getExplorerFromToken(this.explorerToken)
                .then(({ data }) => {
                    this.isOverlayActive = false;
                    this.$refs.migrateExplorerModal.open({
                        explorerId: data.id,
                        explorerToken: this.explorerToken
                    });
                })
                .catch(error => {
                    alert(error.response && error.response.data || 'Error while setting up explorer. Please try generating another demo.');
                    document.location.href = '/transactions';
                });
        },
        toggleMenu() {
            this.drawer = !this.drawer;
        },
        addNetworkToMetamask() {
            if (!this.ethereum) return;

            let domain = this.explorerStore.domain;
            if (this.explorerStore.domains && this.explorerStore.domains.length)
                domain = this.explorerStore.domains[0].domain;

            this.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                    {
                        chainId: this.formattedExpectedChainId,
                        chainName: this.explorerStore.name,
                        rpcUrls: [this.explorerStore.rpcServer],
                        blockExplorerUrls: [`https://${domain}`],
                        nativeCurrency: {
                            name: this.explorerStore.token,
                            symbol: this.explorerStore.token,
                            decimals: 18
                        }
                    }
                ]
            }).catch(console.log);
        },
        openBrowserSyncExplainerModal() {
            this.$refs.browserSyncExplainerModal.open();
        },
        logOut() {
            this.$posthog.reset();
            localStorage.clear();
            document.location.reload();
        },
        launchOnboarding() {
            this.isOverlayActive = false;
            this.$refs.onboardingModal.open();
        },
        updateTabInfo(logo, name) {
            if (logo) {
                const favicon = document.getElementById('favicon');
                favicon.href = logo;
            }

            document.title = name;
        },
        authStateChanged(user) {
            const currentPath = this.$router.currentRoute.path;

            this.userStore.updateUser(user);

            if (currentPath != '/auth' && !user && !this.explorerStore) {
                return this.$router.push('/auth');
            }
            if (currentPath == '/auth' && user) {
                const queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/overview', query: queryParams});
            }
        },
        setupPublicExplorer() {
            const data = this.explorerStore;

            if (data.themes) {
                const lightTheme = data.themes.light || {};
                const darkTheme = data.themes.dark || {};
                const font = data.themes.font;
                this.$vuetify.theme.dark = data.themes.default == 'dark';

                if (data.themes.logo)
                    this.logo = data.themes.logo;

                this.updateTabInfo(data.themes.favicon, data.name);

                if (data.themes.links)
                    this.links = data.themes.links;

                if (data.themes.banner)
                    this.banner = data.themes.banner;

                Object.keys(lightTheme).forEach((key) => {
                    switch (key) {
                        case 'background':
                            this.$set(this.styles, 'background', lightTheme[key]);
                            break;
                        default:
                            this.$vuetify.theme.themes.light[key] = lightTheme[key];
                    }
                });

                Object.keys(darkTheme).forEach((key) => {
                    switch (key) {
                        case 'background':
                            this.$set(this.styles, 'background', darkTheme[key]);
                            break;
                        default:
                            this.$vuetify.theme.themes.dark[key] = darkTheme[key];
                    }
                });

                if (font)
                    WebFont.load({
                        fontactive: () => {
                            this.$set(this.styles, 'fontFamily', font);
                        },
                        google: {
                            families: [`${font}:100,300,400,500,700,900&display=swap`]
                        }
                    });
            }

            this.initWorkspace({
                firebaseUserId: data.admin.firebaseUserId,
                public: data.workspace.public,
                name: data.workspace.name,
                networkId: data.chainId,
                rpcServer: data.rpcServer,
                storageEnabled: data.workspace.storageEnabled,
                erc721LoadingEnabled: data.workspace.erc721LoadingEnabled,
                statusPageEnabled: data.workspace.statusPageEnabled,
                id: data.workspace.id,
                defaultAccount: data.workspace.defaultAccount,
                gasPrice: data.workspace.gasPrice,
                gasLimit: data.workspace.gasLimit
            });
        },
        initWorkspace(workspace) {
            Promise.all([
                this.$store.dispatch('updateCurrentWorkspace', workspace),
                this.$store.dispatch('updateOnboardedStatus', true)
            ]).then(() => {
                Vue.use(pusherPlugin, { store: store });
                this.isOverlayActive = false;
                this.appBarComponent = 'rpc-connector';
                this.routerComponent = 'router-view';

                if (!this.explorerStore && this.envStore.isMarketingEnabled()) {
                    this.server.getProductRoadToken().then(res => this.prAuthToken = res.data.token);
                    this.server.getMarketingFlags().then(({ data: { isRemote }}) => this.isRemote = !!isRemote);
                }
            });
        }
    },
    computed: {
        ...mapStores([
            useCurrentWorkspaceStore,
            useEnvStore,
            useExplorerStore,
            useUserStore
        ]),
        hasNetworkInfo() {
            return !!(this.explorerStore && this.explorerStore.name && this.explorerStore.domain && this.explorerStore.token && this.explorerStore.rpcServer);
        },
        formattedExpectedChainId() {
            return `0x${parseInt(this.currentWorkspace.networkId).toString(16)}`;
        },
        isAuthPage() { return this.$route.path.indexOf('/auth') > -1 },
        canDisplaySides() { return (this.userStore.loggedIn || this.explorerStore) && !this.isAuthPage },
        explorerToken() { return this.$route.query.explorerToken },
        justMigrated() { return !!this.$route.query.justMigrated }
    }
};
</script>
<style>
.v-system-bar a {
    color: var(--v-color-base) !important;
}
.v-toolbar__content {
    padding: 0;
}
.custom-logo-wrapper {
    text-align: center;
}
.custom-logo {
    padding-top: 10px;
    max-width: 250px;
    max-height: 50px;
    text-align: center;
    vertical-align: middle;
    border: none;
}
</style>
