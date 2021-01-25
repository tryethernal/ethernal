<template>
    <v-app>
        <v-navigation-drawer app permanent v-if="userLoggedIn">
            <v-list-item>
                <v-list-item-content>
                    <v-list-item-title class="title">Ethernal</v-list-item-title>
                    <v-list-item-subtitle>Beta - v{{ version }}</v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-list dense nav>
                <v-list-item link :to="'/accounts'">
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

                <v-list-item link :to="'/settings'">
                    <v-list-item-icon>
                        <v-icon>mdi-cog</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title>Settings</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>

            <template v-slot:append>
                <v-list>
                    <v-list-item link @click="logOut()">
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

        <Create-Workspace-Modal ref="createWorkspaceModal" />

        <v-app-bar app dense fixed flat v-if="userLoggedIn" color="grey lighten-3">
            <component :is="appBarComponent"></component>
        </v-app-bar>

        <v-main>
            <component :is="routerComponent"></component>
        </v-main>
    </v-app>
</template>

<script>
import Vue from 'vue';
import { auth } from './plugins/firebase';
import RpcConnector from './components/RpcConnector';
import CreateWorkspaceModal from './components/CreateWorkspaceModal';

export default {
    name: 'App',
    components: {
        RpcConnector,
        CreateWorkspaceModal
    },
    data: () => ({
        version: process.env.VUE_APP_VERSION,
        userLoggedIn: null,
        routerComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        }),
        appBarComponent: Vue.component({
            template: '<v-container fluid>Loading...</v-container>'
        })
    }),
    created: function() {
        const unsubscribe = this.$store.subscribe((mutation, state) => {
            if (mutation.type == 'SET_USER' && state.user !== null) {
                this.userLoggedIn = true;
                this.db.currentUser().get().then(currentUserQuery => {
                    var currentUser = currentUserQuery.data();
                    if (!currentUser) {
                        this.db.createUser(auth().currentUser.uid).then(this.createWorkspace);
                    }
                    else if (currentUser.currentWorkspace) {
                        this.loadWorkspace(currentUser.currentWorkspace);
                    }
                    else {
                        this.db.workspaces().get().then(workspacesQuery => {
                            if (workspacesQuery.docs.length) {
                                this.loadWorkspace(workspacesQuery.docs[0].id);
                            }
                            else {
                                this.createWorkspace();
                            }
                        });
                    }
                });
            }
            if (mutation.type == 'SET_NETWORK_ID' && state.networkId !== null) {
                this.routerComponent = 'router-view';
                unsubscribe();
            }
            if (mutation.type == 'SET_USER' && state.user == null) {
                this.routerComponent = 'router-view';
            }
        })
    },
    methods: {
        logOut: function() {
            this.userLoggedIn = false;
            auth().signOut();
        },
        createWorkspace: function() {
            this.$refs.createWorkspaceModal.open({ workspaces: [] })
                .then((res) => {
                    if (res) {
                        this.loadWorkspace(res.name);
                    }
                })
        },
        loadWorkspace: function(workspace) {
            this.$store.dispatch('updateCurrentWorkspace', workspace);
            this.db.settings().get().then(settingsQuery => {
                if (!settingsQuery.data()) {
                    this.db.workspaces().limit(1).get().then(workspacesQuery => {
                        if (!workspacesQuery.empty) {
                            this.loadWorkspace(workspacesQuery.docs[0].id);
                            this.db.currentUser().update({ currentWorkspace: workspacesQuery.docs[0].id });
                        }
                        else {
                            this.createWorkspace();
                        }
                    });
                }
                else {
                    this.$store.dispatch('updateSettings', settingsQuery.data());
                    this.appBarComponent = 'rpc-connector';
                    if (this.$store.getters.networkId !== null)
                        this.routerComponent = 'router-view';
                }
            });
        }
    }
};
</script>
