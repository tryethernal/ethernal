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

        <component :is="isPrivateExplorer ? PrivateExplorerFooter : PublicExplorerFooter" v-if="canDisplaySides" />
    </v-app>
</template>

<script setup>
import { ref, shallowRef, computed, defineComponent, onMounted, onBeforeUnmount, inject } from 'vue';
import { useTheme } from 'vuetify';
import WebFont from 'webfontloader';
import detectEthereumProvider from '@metamask/detect-provider';
import { useCurrentWorkspaceStore } from './stores/currentWorkspace';
import { useEnvStore } from './stores/env';
import { useExplorerStore } from './stores/explorer';
import { useUserStore } from './stores/user';
import OnboardingModal from './components/OnboardingModal';
import BrowserSyncExplainerModal from './components/BrowserSyncExplainerModal';
import MigrateExplorerModal from './components/MigrateExplorerModal';
import DemoExplorerMigrationModal from './components/DemoExplorerMigrationModal';
import MainNavBar from './components/MainNavBar';
import RpcConnector from './components/RpcConnector.vue';
import PrivateExplorerFooter from './components/PrivateExplorerFooter.vue';
import PublicExplorerFooter from './components/PublicExplorerFooter.vue';

// Pinia stores
const currentWorkspaceStore = useCurrentWorkspaceStore();
const envStore = useEnvStore();
const explorerStore = useExplorerStore();
const userStore = useUserStore();

const theme = useTheme();

// Data refs
const routerComponent = shallowRef(defineComponent({ template: '<v-container fluid></v-container>' }));
const appBarComponent = shallowRef(defineComponent({ template: '<v-container fluid></v-container>' }));
const prAuthToken = ref(null);
const styles = ref({});
const logo = ref(null);
const links = ref([]);
const banner = ref(null);
const isOverlayActive = ref(false);
const isWalletConnecting = ref(false);
const ethereum = ref(null);
const drawer = ref(false);

// Modal refs
const migrateExplorerModal = ref();
const demoExplorerMigrationModal = ref();
const onboardingModal = ref();
const browserSyncExplainerModal = ref();

const $server = inject('$server');
const $pusher = inject('$pusher');

// Computed properties
const isAuthPage = computed(() => window.location.pathname.indexOf('/auth') > -1);
const canDisplaySides = computed(() => {
    return (
        userStore && typeof userStore.loggedIn !== 'undefined' &&
        explorerStore && (typeof explorerStore.id !== 'undefined') &&
        (userStore.loggedIn || explorerStore.id) &&
        !isAuthPage.value &&
        !isOverlayActive.value
    );
});
const explorerToken = computed(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('explorerToken');
});
const justMigrated = computed(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('justMigrated');
});
const isPrivateExplorer = computed(() => {
    return (
        explorerStore && typeof explorerStore.id !== 'undefined' &&
        userStore && typeof userStore.loggedIn !== 'undefined' &&
        !explorerStore.id && userStore.loggedIn
    );
});

// Methods
function handleClickEvent(event) {
    if (event.target.matches('a[data-vue-action="openMigrationModal"]')) {
        const jwtToken = event.target.getAttribute('data-jwt');
        demoExplorerMigrationModal.value.open(jwtToken);
    }
}

function setupPrivateExplorer() {
    $server.getCurrentUser()
        .then(({ data }) => {
            const redirectPath = authStateChanged(data);
            if (redirectPath)
                return window.location.assign(redirectPath);
            else if (justMigrated.value) {
                isOverlayActive.value = false;
                migrateExplorerModal.value.open({ explorerId: parseInt(new URLSearchParams(window.location.search).get('justMigrated')), justMigrated: true });
            }
            else if (explorerToken.value)
                migrateExplorer();
            else
                data.currentWorkspace ?
                    initWorkspace({ ...data.currentWorkspace, firebaseUserId: data.firebaseUserId }) :
                    launchOnboarding();
        })
        .catch((error) => {
            const redirectPath = authStateChanged(null);
            if (redirectPath)
                return window.location.assign(redirectPath);
            isOverlayActive.value = false;
            routerComponent.value = 'router-view';
            console.log('error', error);
        });
}

function migrateExplorer() {
    $server.getExplorerFromToken(explorerToken.value)
        .then(({ data }) => {
            isOverlayActive.value = false;
            migrateExplorerModal.value.open({
                explorerId: data.id,
                explorerToken: explorerToken.value
            });
        })
        .catch(error => {
            alert(error.response && error.response.data || 'Error while setting up explorer. Please try generating another demo.');
            document.location.href = '/transactions';
        });
}

function toggleMenu() {
    drawer.value = !drawer.value;
}

function launchOnboarding() {
    isOverlayActive.value = false;
    onboardingModal.value.open();
}

function updateTabInfo(logoUrl, name) {
    if (logoUrl) {
        const favicon = document.getElementById('favicon');
        favicon.href = logoUrl;
    }
    document.title = name;
}

function authStateChanged(user) {
    const currentPath = window.location.pathname;
    userStore.updateUser(user);
    if (currentPath != '/auth' && !user && envStore.isOnMainDomain) {
        console.log('redirecting to auth', envStore.mainDomain);
        return '/auth';
    }
    if (currentPath == '/auth' && user) {
        const params = new URLSearchParams(window.location.search);
        params.delete('next');
        return window.location.origin + (params.get('next') || '/overview') + (params.toString() ? '?' + params.toString() : '');
    }
}

function setupPublicExplorer(explorer) {
    const currentPath = window.location.pathname;
    if (currentPath == '/auth')
        return window.location.assign('/overview');

        explorerStore.updateExplorer(explorer);
    if (explorer.themes) {
        const lightTheme = explorer.themes.light || {};
        const font = explorer.themes.font;
        if (explorer.themes.logo)
            logo.value = explorer.themes.logo;
        updateTabInfo(explorer.themes.favicon, explorer.name);
        if (explorer.themes.links)
            links.value = explorer.themes.links;
        if (explorer.themes.banner)
            banner.value = explorer.themes.banner;
        const customThemeKeys = Object.keys(lightTheme);
        if (customThemeKeys.length) {
            customThemeKeys.forEach((key) => {
                switch (key) {
                    case 'background':
                        theme.global.current.value.themes.light.colors.background = lightTheme[key];
                        break;
                    default:
                        theme.global.current.value.themes.light.colors[key] = lightTheme[key];
                }
            });
            theme.global.name.value = 'light';
            // Only copy the primary color to dark theme, but make it lighter for better contrast in dark mode
            const primaryColor = theme.global.current.value.themes.light.colors.primary;
            const lighterPrimaryColor = lightenColor(primaryColor, 15); // Lighten by 15%
            theme.global.current.value.themes.dark.colors.primary = lighterPrimaryColor;
        }
        if (font)
            WebFont.load({
                fontactive: () => {
                    styles.value['fontFamily'] = font;
                },
                google: {
                    families: [`${font}:100,300,400,500,700,900&display=swap`]
                }
            });
    }
    initWorkspace({
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
}

function initWorkspace(workspace) {
    currentWorkspaceStore.updateCurrentWorkspace(workspace);
    userStore.updateUser({ onboarded: true, firebaseUserId: workspace.firebaseUserId });
    $pusher.init();
    isOverlayActive.value = false;
    appBarComponent.value = RpcConnector;
    routerComponent.value = 'router-view';
}

function lightenColor(hex, percent) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16) / 255;
    let g = parseInt(hex.substr(2, 2), 16) / 255;
    let b = parseInt(hex.substr(4, 2), 16) / 255;
    let cmin = Math.min(r, g, b);
    let cmax = Math.max(r, g, b);
    let delta = cmax - cmin;
    let h = 0;
    let s = 0;
    let l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    l = Math.min(1, l * (1 + percent / 100));
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
    const toHex = (n) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

onMounted(() => {
    document.addEventListener('click', handleClickEvent);
    detectEthereumProvider().then(provider => {
        if (!provider || provider !== window.ethereum) return;
        ethereum.value = provider;
    });
    isOverlayActive.value = true;
    if (localStorage.getItem('ssoApiToken'))
        localStorage.removeItem('ssoApiToken');
    $server.searchExplorer(window.location.host)
        .then(({ data }) => {
            if (data.explorer) {
                envStore.setMainDomain(data.explorer.mainDomain);
                setupPublicExplorer(data.explorer);
            } else {
                envStore.setMainDomain(window.location.host);
                setupPrivateExplorer();
            }
        })
        .catch(error => {
            console.log('error', error);
            envStore.setMainDomain(error.response.data.mainDomain);
            if (error.response && error.response.status === 404) {
                document.location.href = `/`;
            } else {
                document.location.assign(`//${envStore.mainDomain}`);
            }
        });
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickEvent);
});
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
