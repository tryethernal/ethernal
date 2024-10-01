import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

import { useExplorerStore } from './explorer';
import { useUserStore } from './user';
import { useEnvStore } from './env';

export const useCurrentWorkspaceStore = defineStore('currentWorkspace', {
    state: () => ({
        id: null,
        userId: null,
        name: null,
        public: null,
        rpcServer: null,
        accounts: [],
        currentBlock: {
            number: 0
        },
        browserSyncStatus: null,
        defaultAccount: null,
        gasLimit: null,
        gasPrice: null,
        networkId: null,
        tracing: null,
        chainSlug: null,
        storageEnabled: null
    }),

    actions: {
        updateBrowserSyncStatus(status) {
            this.browserSyncStatus = status;
        },

        updateCurrentBlock(block) {
            this.currentBlock = block;
        },

        updateAccounts(accounts) {
            if (accounts.length > 0)
                this.accounts = accounts;
        },

        updateCurrentWorkspace(workspace) {
            this.$patch(workspace);
            this.chainSlug = workspace.chain;

            if (workspace.explorer)
                useExplorerStore().updateExplorer(workspace.explorer);

            const userStore = useUserStore();
            if (this.userId === userStore.id)
                userStore.isAdmin = true;
            else
                userStore.isAdmin = false;

            Sentry.setContext('Current Workspace', {
                id: this.id,
                name: this.name,
                explorer: workspace.explorer ? { id: workspace.explorer.id, name: workspace.explorer.name } : null
            });
        }
    },

    getters: {
        chain(state) {
            return this.explorer || useEnvStore().chains[state.chainSlug || 'ethereum'];
        }
    }
});
