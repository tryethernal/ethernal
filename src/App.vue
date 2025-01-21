<template>
    <v-app :style="styles">
        <v-overlay persistent class="d-flex justify-center align-center" :model-value="isOverlayActive" scrim="primary" :opacity="0.2">
            <v-progress-circular
                indeterminate
                size="64"
                color="primary"
            ></v-progress-circular>
        </v-overlay>
        <v-system-bar height="40" v-html="banner" v-if="banner" class="d-flex justify-start font-weight-bold" color="primary"></v-system-bar>

        <v-navigation-drawer v-model="drawer" :style="styles" v-if="canDisplaySides">
            <div class="custom-logo-wrapper" v-if="logo">
                <img :src="logo" alt="logo" class="custom-logo" />
            </div>
            <v-list-item v-else>
                <template v-slot:title>
                    <span class="logo text-accent">{{ explorerStore.name || 'Ethernal' }}</span>
                </template>
                <template v-slot:subtitle>
                    v{{ envStore.version }}
                </template>
            </v-list-item>
            <v-list-item v-if="currentWorkspaceStore.browserSyncEnabled">
                <v-alert text :icon="false" type="warning">
                    <v-progress-circular bg-color="warning" color="white" size="16" width="2" indeterminate></v-progress-circular>
                    <a href="#" class="text-white pl-2" @click.prevent="openBrowserSyncExplainerModal()">Browser Sync</a>
                </v-alert>
            </v-list-item>

            <v-list density="compact" nav class="side--text">
                <v-list-item prepend-icon="mdi-chart-box" title="Overview" link :to="'/overview'"></v-list-item>
                <v-list-item prepend-icon="mdi-account-multiple" title="Accounts" link :to="'/accounts'" v-if="envStore.isAdmin"></v-list-item>
                <v-list-item prepend-icon="mdi-view-dashboard" title="Blocks" link :to="'/blocks'"></v-list-item>
                <v-list-item prepend-icon="mdi-arrow-left-right" title="Transactions" link :to="'/transactions'"></v-list-item>
                <v-list-item prepend-icon="mdi-file" title="Contracts" link :to="'/contracts'"></v-list-item>
                <v-list-item prepend-icon="mdi-alpha-c-circle" title="ERC-20 Tokens" link :to="'/tokens'"></v-list-item>
                <v-list-item prepend-icon="mdi-palette-advanced" title="ERC-721 Tokens" link :to="'/nfts'"></v-list-item>
                <v-list-item prepend-icon="mdi-chart-box" title="Analytics" link :to="'/analytics'" v-if="currentWorkspaceStore.public"></v-list-item>
                <v-list-item prepend-icon="mdi-faucet" title="Faucet" link :to="'/faucet'" v-if="explorerStore.faucet"></v-list-item>
                <v-list-item prepend-icon="mdi-swap-horizontal" title="Dex" link :to="'/dex'" v-if="explorerStore.v2Dex"></v-list-item>
                <v-list-item prepend-icon="mdi-heart-circle" title="Status" link :to="'/status'" v-if="(isUserAdmin && currentWorkspaceStore.public) || currentWorkspaceStore.statusPageEnabled"></v-list-item>
                <template v-if="envStore.isAdmin">
                    <v-divider class="my-4"></v-divider>
                    <v-list-item prepend-icon="mdi-earth" title="Public Explorers" link :to="'/explorers'"></v-list-item>
                    <v-list-item prepend-icon="mdi-cog" title="Settings" link :to="'/settings?tab=workspace'"></v-list-item>
                </template>
            </v-list>

            <template v-slot:append>
                <v-list density="compact" nav>
                    <v-list-item prepend-icon="arcticons:metamask" title="Add To Metamask" link v-if="ethereum && hasNetworkInfo" @click="addNetworkToMetamask()"></v-list-item>

                    <v-list-item v-for="(link, idx) in links" :prepend-icon="link.icon || 'mdi-open-in-new'" :title="link.name" target="_blank" :href="link.url" :key="idx"></v-list-item>
                    <v-list-item prepend-icon="mdi-text-box-multiple" title="Documentation" target="_blank" :href="`https://doc.tryethernal.com`" v-if="envStore.isAdmin"></v-list-item>
                    <v-list-item prepend-icon="mdi-forum" title="Discord" target="_blank" :href="`https://discord.gg/jEAprf45jj`" v-if="envStore.isAdmin"></v-list-item>
                    <v-list-item prepend-icon="mdi-feature-search" title="Feature Requests" v-show="prAuthToken" target="_blank" :href="`https://ethernal.productroad.com/company/auth/?token=${prAuthToken}`"></v-list-item>

                    <v-list-item class="text-error-darken-3" title="Log Out" link @click="logOut()" v-if="userStore.loggedIn">
                        <template v-slot:prepend>
                            <v-icon color="error-darken-3" icon="mdi-logout"></v-icon>
                        </template>
                    </v-list-item>

                    <div class="text-caption text-center font-italic">
                        Powered By <a href="https://tryethernal.com" target="_blank">Ethernal</a>
                    </div>
                </v-list>
            </template>
        </v-navigation-drawer>

        <Migrate-Explorer-Modal ref="migrateExplorerModal" v-if="explorerToken || justMigrated" />
        <Onboarding-Modal ref="onboardingModal" />
        <Browser-Sync-Explainer-Modal ref="browserSyncExplainerModal" v-if="currentWorkspaceStore.browserSyncEnabled" />

        <v-app-bar height="48" :style="styles" dense flat v-if="canDisplaySides">
            <component @toggleMenu="toggleMenu" :is="appBarComponent"></component>
        </v-app-bar>

        <v-main>
            <component :is="routerComponent"></component>
        </v-main>
    </v-app>
</template>

<script>
import { defineComponent, shallowRef } from 'vue';
import { useTheme } from 'vuetify';
import { mapStores } from 'pinia';
import WebFont from 'webfontloader';
import detectEthereumProvider from '@metamask/detect-provider';
import { useCurrentWorkspaceStore } from './stores/currentWorkspace';
import { useEnvStore } from './stores/env';
import { useExplorerStore } from './stores/explorer';
import { useUserStore } from './stores/user';
import { useCustomisationStore } from './stores/customisation';
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
        MigrateExplorerModal
    },
    data: () => ({
        routerComponent: shallowRef(defineComponent({
            template: '<v-container fluid></v-container>'
        })),
        appBarComponent: shallowRef(defineComponent({
            template: '<v-container fluid></v-container>'
        })),
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
    setup() {
        const theme = useTheme();
        return { theme };
    },
    mounted() {
        detectEthereumProvider().then(provider => {
            if (!provider || provider !== window.ethereum) return;
            this.ethereum = provider;
        });
        this.isOverlayActive = true;
        if (localStorage.getItem('ssoApiToken'))
            localStorage.removeItem('ssoApiToken');

        this.$server.searchExplorer(window.location.host)
            .then(({ data }) => {
                if (data.explorer)
                    this.setupPublicExplorer(data.explorer);
                else
                    this.setupPrivateExplorer();
            })
            .catch(error => {
                console.log(error)
                document.location.href = `//app.${this.envStore.mainDomain}`;
            });
    },
    methods: {
        setupPrivateExplorer() {
            this.$server.getCurrentUser()
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
                            this.initWorkspace({ ...data.currentWorkspace, firebaseUserId: data.firebaseUserId }) :
                            this.launchOnboarding();
                })
                .catch((error) => {
                    this.isOverlayActive = false;
                    this.routerComponent = 'router-view';
                    console.log('error', error);
                    this.authStateChanged(null);
                })
        },
        migrateExplorer() {
            this.$server.getExplorerFromToken(this.explorerToken)
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
            this.userStore.updateUser(null);
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

            if (currentPath != '/auth' && !user && this.envStore.isAdmin) {
                console.log('redirecting to auth');
                return this.$router.push('/auth');
            }
            if (currentPath == '/auth' && user) {
                const queryParams = { ...this.$route.query };
                delete queryParams.next;
                return this.$router.push({ path: this.$route.query.next || '/overview', query: queryParams});
            }
        },
        setupPublicExplorer(explorer) {
            this.explorerStore.updateExplorer(explorer);
            if (explorer.themes) {
                const lightTheme = explorer.themes.light || {};
                const font = explorer.themes.font;

                if (explorer.themes.logo)
                    this.logo = explorer.themes.logo;

                this.updateTabInfo(explorer.themes.favicon, explorer.name);

                if (explorer.themes.links)
                    this.links = explorer.themes.links;

                if (explorer.themes.banner)
                    this.banner = explorer.themes.banner;

                const customThemeKeys = Object.keys(lightTheme);
                if (customThemeKeys.length) {
                    customThemeKeys.forEach((key) => {
                        switch (key) {
                            case 'background':
                                this.styles[key] = lightTheme[key];
                                break;
                            default:
                                this.$vuetify.theme.themes.light.colors[key] = lightTheme[key];
                        }
                    });
                    this.theme.global.name.value = 'light';
                }

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
                firebaseUserId: explorer.admin.firebaseUserId,
                public: explorer.workspace.public,
                name: explorer.workspace.name,
                networkId: explorer.chainId,
                rpcServer: explorer.rpcServer,
                storageEnabled: explorer.workspace.storageEnabled,
                erc721LoadingEnabled: explorer.workspace.erc721LoadingEnabled,
                statusPageEnabled: explorer.workspace.statusPageEnabled,
                id: explorer.workspace.id,
                defaultAccount: explorer.workspace.defaultAccount,
                gasPrice: explorer.workspace.gasPrice,
                gasLimit: explorer.workspace.gasLimit,
                functions: explorer.workspace.functions,
                packages: explorer.workspace.packages
            });
        },
        initWorkspace(workspace) {
            this.currentWorkspaceStore.updateCurrentWorkspace(workspace);
            this.userStore.updateUser({ onboarded: true, firebaseUserId: workspace.firebaseUserId });
            this.$pusher.init();
            this.isOverlayActive = false;
            this.appBarComponent = 'rpc-connector';
            this.routerComponent = 'router-view';
        }
    },
    computed: {
        ...mapStores(
            useCurrentWorkspaceStore,
            useEnvStore,
            useExplorerStore,
            useUserStore,
            useCustomisationStore
        ),
        hasNetworkInfo() {
            return !!(this.explorerStore.name && this.explorerStore.domain && this.explorerStore.token && this.explorerStore.rpcServer);
        },
        formattedExpectedChainId() {
            return `0x${parseInt(this.currentWorkspace.networkId).toString(16)}`;
        },
        isAuthPage() { return this.$route.path.indexOf('/auth') > -1 },
        canDisplaySides() { return (this.userStore.loggedIn || this.explorerStore.id) && !this.isAuthPage && !this.isOverlayActive },
        explorerToken() { return this.$route.query.explorerToken },
        justMigrated() { return !!this.$route.query.justMigrated }
    }
};
</script>
<style>
a:not(.v-list-item) {
    color: rgb(var(--v-theme-primary));
}
.v-system-bar a {
    color: rgb(var(--v-theme-base)) !important;
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
