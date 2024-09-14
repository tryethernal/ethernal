import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

export const useCurrentWorkspaceStore = defineStore('currentWorkspace', {
    state: () => ({
        id: null,
        accounts: [],
        currentBlock: null,
        browserSyncStatus: null
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
            for (const [key, value] of Object.entries(workspace))
                this[key] = value;

            Sentry.setContext('Current Workspace', {
                id: this.id,
                name: this.name,
                explorer: workspace.explorer ? { id: workspace.explorer.id, name: workspace.explorer.name } : null
            });

            // TODO: Check if there is an explorer and set it in the correct store
        }
    }
});