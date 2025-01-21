import { defineStore } from 'pinia';

export const useExplorerStore = defineStore('explorer', {
    state: () => ({
        id: null,
        slug: null,
        name: null,
        rpcServer: null,
        token: 'ETH',
        l1Explorer: null,
        domain: null,
        domains: [],
        themes: {},
        admin: {},
        workspace: {},
        faucet: null,
        v2Dex: null
    }),

    actions: {
        updateExplorer(explorer) {
            if (!explorer)
                this.$reset();

            this.$patch(explorer);
        }
    }
});

