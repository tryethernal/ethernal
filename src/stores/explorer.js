import { defineStore } from 'pinia';

export const useExplorerStore = defineStore('explorer', {
    state: () => ({
        id: null,
        name: null,
        rpcServer: null,
        token: 'ETH',
        l1Explorer: null,
        domain: null,
        domains: [],
        themes: {},
        admin: {},
        workspace: {},
        faucet: {},
        v2Dex: {}
    }),

    actions: {
        updateExplorer(explorer) {
            if (explorer)
                this.$patch(explorer);
            else
                this.$reset();
        }
    }
});
