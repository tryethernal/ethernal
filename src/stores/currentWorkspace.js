import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

import { useExplorerStore } from './explorer';
import { useUserStore } from './user';
import { useEnvStore } from './env';
import { useCustomisationStore } from './customisation';

const usePrivateCurrentWorkspaceStore = defineStore('privateCurrentWorkspace', {
    state: () => ({
        rpcListenerWorker: null
    })
});

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
        browserSyncEnabled: null,
        defaultAccount: null,
        gasLimit: null,
        gasPrice: null,
        networkId: null,
        tracing: null,
        chainSlug: null,
        storageEnabled: null,
        wagmiConfig: null
    }),

    actions: {
        startBrowserSync() {
            const userStore = useUserStore();
            const envStore = useEnvStore();
            const privateCurrentWorkspaceStore = usePrivateCurrentWorkspaceStore();

            const rpcListenerWorker = new Worker(new URL('../workers/blockSyncer.worker.js', import.meta.url), { type: 'module' });
            rpcListenerWorker.onmessage = () => this.updateBrowserSyncStatus(false);
            rpcListenerWorker.postMessage({
                apiRoot: envStore.apiRoot,
                rpcServer: this.rpcServer,
                apiToken: userStore.apiToken,
                workspace: this.name
            });

            privateCurrentWorkspaceStore.rpcListenerWorker = rpcListenerWorker;
            this.browserSyncEnabled = true;
        },

        stopBrowserSync() {
            const privateCurrentWorkspaceStore = usePrivateCurrentWorkspaceStore();
            privateCurrentWorkspaceStore.rpcListenerWorker.terminate();
            privateCurrentWorkspaceStore.rpcListenerWorker = null;
            this.browserSyncEnabled = false;
        },

        updateBrowserSyncStatus(status) {
            this.browserSyncEnabled = status;
        },

        updateCurrentBlock(block) {
            this.currentBlock = block;
        },

        updateAccounts(accounts) {
            if (accounts.length > 0)
                this.accounts = accounts;
        },

        updateWagmiConfig(_wagmiConfig) {
            this.wagmiConfig = _wagmiConfig;
        },

        updateCurrentWorkspace(workspace) {
            this.$patch(workspace);
            this.chainSlug = workspace.chain;

            if (workspace.networkId)
                this.networkId = parseInt(workspace.networkId);

            if (workspace.explorer)
                useExplorerStore().updateExplorer(workspace.explorer);

            let functions = {};
            let packages = {};

            try {
                if (workspace.packages)
                    workspace.packages.forEach(p => {
                        packages = { ...packages, ...JSON.parse(p.function) };
                    });

                if (workspace.functions)
                    workspace.functions.forEach(f => {
                        functions = { ...functions, ...JSON.parse(f.function) };
                    });
            } catch (error) {
                console.error(error);
                functions = {};
                packages = {};
            }

            const customisations = { functions, packages};

            if (Object.keys(customisations.functions).length || Object.keys(customisations.packages).length) {
                const customisationStore = useCustomisationStore();
                customisationStore.updateCustomisations(customisations);
            }

            const userStore = useUserStore();
            if (this.userId && this.userId === userStore.id)
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
            const hasExplorer = useExplorerStore().id;
            return hasExplorer ? useExplorerStore() : useEnvStore().chains[state.chainSlug || 'ethereum'];
        },
    }
});
