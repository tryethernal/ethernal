<template>
    <v-app>
        <v-navigation-drawer app permanent v-if="canDisplaySides">
            <v-list-item>
                <v-list-item-content>
                    <v-list-item-title class="logo">{{ publicExplorer.name || 'Ethernal' }}</v-list-item-title>
                    <v-list-item-subtitle>{{ version }}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-list dense nav>
                <v-list-item link :to="'/accounts'" v-if="!isPublicExplorer">
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
                        <v-list-item-title>Tokens</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>

                <v-list-item link :to="'/settings?tab=workspace'" v-if="currentWorkspace.isAdmin">
                    <v-list-item-icon>
                        <v-icon>mdi-cog</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Settings</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>

            <template v-slot:append>
                <v-list dense nav>
                    <v-list-item target="_blank" :href="`https://doc.tryethernal.com`" v-if="!isPublicExplorer">
                        <v-list-item-icon>
                            <v-icon>mdi-text-box-multiple-outline</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title>Documentation</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item target="_blank" :href="`https://discord.gg/jEAprf45jj`" v-if="!isPublicExplorer">
                        <v-list-item-icon>
                            <v-icon>mdi-discord</v-icon>
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
                    <v-list-item link @click="logOut()" v-if="isUserLoggedIn">
                        <v-list-item-icon>
                            <v-icon class="red--text text--darken-3">mdi-logout</v-icon>
                        </v-list-item-icon>
                        <v-list-item-content>
                            <v-list-item-title class="red--text text--darken-3">Log Out</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                </v-list>
            </template>
        </v-navigation-drawer>

        <Onboarding-Modal ref="onboardingModal" />

        <v-app-bar app dense fixed flat v-if="canDisplaySides" color="grey lighten-3">
            <component :is="appBarComponent"></component>
        </v-app-bar>

        <v-main>
            <component :is="routerComponent"></component>
        </v-main>
    </v-app>
</template>

<script>
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { auth } from './plugins/firebase';
import RpcConnector from './components/RpcConnector';
import OnboardingModal from './components/OnboardingModal';

export default {
    name: 'App',
    components: {
        RpcConnector,
        OnboardingModal
    },
    data: () => ({
        version: process.env.VUE_APP_VERSION,
        userLoggedIn: null,
        routerComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        }),
        appBarComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        }),
        prAuthToken: null
    }),
    created: function() {
        if (this.isPublicExplorer)
            return this.initPublicExplorer();
    },
    methods: {
        logOut: function() {
            this.$store.dispatch('updateUser', null);
            auth().signOut();
        },
        launchOnboarding: function() {
            this.$refs.onboardingModal.open();
        },
        initPublicExplorer: function() {
            this.db.getPublicExplorerParams(this.publicExplorer.slug)
                .then((doc) => {
                    if (!doc.data())
                        return document.location.href = process.env.VUE_APP_ROOT_URL;

                    const data = doc.data();

                    this.$store.dispatch('setPublicExplorerData', {
                        name: data.name,
                        token: data.token,
                        chainId: data.chainId
                    }).then(() => {
                        if (data.themes) {
                            const lightTheme = data.themes.light || {};
                            const darkTheme = data.themes.dark || {};

                            Object.keys(lightTheme).forEach((key) => {
                                this.$vuetify.theme.themes.light[key] = lightTheme[key];
                            })
                            Object.keys(darkTheme).forEach((key) => {
                                this.$vuetify.theme.themes.dark[key] = darkTheme[key];
                            })
                        }

                        this.initWorkspace({
                            userId: data.userId,
                            name: data.workspace,
                            networkId: data.chainId,
                            rpcServer: data.rpcServer
                        });
                    });
                });
        },
        initWorkspace: function(data) {
            if (!data.userId || !data.name) return;
            const isAdmin = !!auth().currentUser && auth().currentUser.uid == data.userId;
            this.$store.dispatch('updateOnboardedStatus', true);
            this.$store.dispatch('updateCurrentWorkspace', { isAdmin: isAdmin, ...data })
                .then(() => {
                    this.appBarComponent = 'rpc-connector';
                    this.routerComponent = 'router-view';
                    if (!this.publicExplorer)
                        this.server.getProductRoadToken().then((res) => this.prAuthToken = res.data.token);
                });
        },
        initPrivateExplorer: function() {
            this.db.currentUser().get().then(userQuery => {
                const user = userQuery.data();
                if (!user && !this.isPublicExplorer) {
                    this.server.createUser(auth().currentUser.uid).then(this.launchOnboarding);
                }
                else {
                    if (this.isPublicExplorer) return;

                    this.$store.dispatch('updateUserPlan', { uid: auth().currentUser.uid, plan: user.plan, email: auth().currentUser.email });

                    if (user.currentWorkspace) {
                        user.currentWorkspace.get().then((workspaceQuery) => this.initWorkspace({ ...workspaceQuery.data(), name: workspaceQuery.id, userId: this.user.uid }));
                    }
                    else {
                        this.db.workspaces().get().then(wsQuery => {
                            const workspaces = []
                            wsQuery.forEach((ws) => workspaces.push({ ...ws.data(), name: ws.id }));

                            if (workspaces.length) {
                                this.server.setCurrentWorkspace(workspaces[0].name)
                                    .then(() => this.initWorkspace({ ...workspaces[0], userId: this.user.uid }));
                            }
                            else {
                                this.launchOnboarding();
                            }
                        });
                    }
                }
            });
        }
    },
    watch: {
        '$store.getters.user': function(user, previousUser) {
            if (!previousUser.uid && !!user.uid) {
                this.initPrivateExplorer();
            }
            if (!user.uid && !this.isPublicExplorer)
                this.routerComponent = 'router-view';
        }
    },
    computed: {
        ...mapGetters([
            'isPublicExplorer',
            'publicExplorer',
            'currentWorkspace',
            'user',
            'isUserLoggedIn'
        ]),
        isAuthPage: function() { return this.$route.path.indexOf('/auth') > -1 },
        canDisplaySides: function() { return (this.isUserLoggedIn || this.isPublicExplorer) && !this.isAuthPage }
    }
};
</script>
