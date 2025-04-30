<template>
    <v-app :style="styles">
        <v-overlay persistent class="d-flex justify-center align-center" :model-value="isOverlayActive" scrim="primary" :opacity="0.2">
            <v-progress-circular
                indeterminate
                size="64"
                color="primary"
            ></v-progress-circular>
        </v-overlay>

        <v-overlay persistent class="d-flex justify-center align-center" :model-value="isWalletConnecting" scrim="primary" :opacity="0.2">
        </v-overlay>

        <v-system-bar height="40" v-html="banner" v-if="banner" class="d-flex justify-start font-weight-bold" color="primary"></v-system-bar>

        <component :is="appBarComponent" :styles="styles" @toggleMenu="toggleMenu" v-if="canDisplaySides"></component>

        <MainNavBar
            v-if="canDisplaySides"
            :styles="styles"
            :logo="logo"
            :ethereum="ethereum"
            :links="links"
            :prAuthToken="prAuthToken"
            :mobile="$vuetify.display.mobile"
            v-model:drawer="drawer"
        />

        <Migrate-Explorer-Modal ref="migrateExplorerModal" v-if="explorerToken || justMigrated" />
        <Demo-Explorer-Migration-Modal ref="demoExplorerMigrationModal" />
        <Onboarding-Modal ref="onboardingModal" />
        <Browser-Sync-Explainer-Modal ref="browserSyncExplainerModal" v-if="currentWorkspaceStore.browserSyncEnabled" />

        <v-main>
            <component :is="routerComponent"></component>
        </v-main>

        <component :is="host.includes(`app.${envStore.mainDomain}`) ? 'PrivateExplorerFooter' : 'PublicExplorerFooter'" v-if="canDisplaySides" />
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
import DemoExplorerMigrationModal from './components/DemoExplorerMigrationModal';
import MainNavBar from './components/MainNavBar';
import PrivateExplorerFooter from './components/PrivateExplorerFooter';
import PublicExplorerFooter from './components/PublicExplorerFooter';

export default {
    name: 'App',
    components: {
        RpcConnector,
        OnboardingModal,
        BrowserSyncExplainerModal,
        MigrateExplorerModal,
        DemoExplorerMigrationModal,
        MainNavBar,
        PrivateExplorerFooter,
        PublicExplorerFooter
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
        isWalletConnecting: false,
        ethereum: null,
        drawer: false
    }),
    setup() {
        const theme = useTheme();
        return { theme };
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickEvent);
    },
    mounted() {
        document.addEventListener('click', this.handleClickEvent);

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
        handleClickEvent(event) {
            if (event.target.matches('a[data-vue-action="openMigrationModal"]')) {
                const jwtToken = event.target.getAttribute('data-jwt');
                this.$refs.demoExplorerMigrationModal.open(jwtToken);
            }
        },
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
                                this.$vuetify.theme.themes.light.colors.background = lightTheme[key];
                                break;
                            default:
                                this.$vuetify.theme.themes.light.colors[key] = lightTheme[key];
                        }
                    });
                    this.theme.global.name.value = 'light';

                    // Only copy the primary color to dark theme, but make it lighter for better contrast in dark mode
                    const primaryColor = this.$vuetify.theme.themes.light.colors.primary;
                    // Convert to a slightly lighter shade for dark theme
                    const lighterPrimaryColor = this.lightenColor(primaryColor, 15); // Lighten by 15%
                    this.$vuetify.theme.themes.dark.colors.primary = lighterPrimaryColor;
                }

                if (font)
                    WebFont.load({
                        fontactive: () => {
                            this.styles['fontFamily'] = font;
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
                packages: explorer.workspace.packages,
                tracing: explorer.workspace.tracing
            });
        },
        initWorkspace(workspace) {
            this.currentWorkspaceStore.updateCurrentWorkspace(workspace);
            this.userStore.updateUser({ onboarded: true, firebaseUserId: workspace.firebaseUserId });
            this.$pusher.init();
            this.isOverlayActive = false;
            this.appBarComponent = 'rpc-connector';
            this.routerComponent = 'router-view';
        },
        lightenColor(hex, percent) {
            // Remove the '#' if present
            hex = hex.replace('#', '');
            
            // Convert hex to RGB first
            let r = parseInt(hex.substr(0, 2), 16) / 255;
            let g = parseInt(hex.substr(2, 2), 16) / 255;
            let b = parseInt(hex.substr(4, 2), 16) / 255;
            
            // Find greatest and smallest channel values
            let cmin = Math.min(r, g, b);
            let cmax = Math.max(r, g, b);
            let delta = cmax - cmin;
            
            let h = 0;
            let s = 0;
            let l = 0;
            
            // Calculate hue
            if (delta === 0) h = 0;
            else if (cmax === r) h = ((g - b) / delta) % 6;
            else if (cmax === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
            
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            
            // Calculate lightness
            l = (cmax + cmin) / 2;
            
            // Calculate saturation
            s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
            
            // Adjust lightness by percent
            l = Math.min(1, l * (1 + percent / 100));
            
            // Convert back to RGB
            let c = (1 - Math.abs(2 * l - 1)) * s;
            let x = c * (1 - Math.abs((h / 60) % 2 - 1));
            let m = l - c / 2;
            
            let r1, g1, b1;
            if (0 <= h && h < 60) {
                [r1, g1, b1] = [c, x, 0];
            } else if (60 <= h && h < 120) {
                [r1, g1, b1] = [x, c, 0];
            } else if (120 <= h && h < 180) {
                [r1, g1, b1] = [0, c, x];
            } else if (180 <= h && h < 240) {
                [r1, g1, b1] = [0, x, c];
            } else if (240 <= h && h < 300) {
                [r1, g1, b1] = [x, 0, c];
            } else {
                [r1, g1, b1] = [c, 0, x];
            }
            
            // Convert to hex
            const toHex = (n) => {
                const hex = Math.round((n + m) * 255).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            
            return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
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
        host() {
            return document.location.host;
        },
        hasNetworkInfo() {
            return !!(this.explorerStore.name && this.explorerStore.domain && this.explorerStore.token && this.explorerStore.rpcServer);
        },
        formattedExpectedChainId() {
            return `0x${parseInt(this.currentWorkspaceStore.networkId).toString(16)}`;
        },
        isAuthPage() { return this.$route.path.indexOf('/auth') > -1 },
        canDisplaySides() { return (this.userStore.loggedIn || this.explorerStore.id) && !this.isAuthPage && !this.isOverlayActive },
        explorerToken() { return this.$route.query.explorerToken },
        justMigrated() { return !!this.$route.query.justMigrated },
        isPublicExplorer() { return this.explorerStore.id }
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
.v-container {
    max-width: 1400px;
}
.custom-logo {
    padding-top: 10px;
    max-width: 250px;
    max-height: 50px;
    text-align: center;
    vertical-align: middle;
    border: none;
}
.v-app-bar {
    display: flex;
    justify-content: center;
    background-color: white !important;
}
.v-app-bar.top-bar {
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.v-app-bar .v-container {
    flex: none;
    width: 100%;
    padding: 0 16px;
}
</style>
