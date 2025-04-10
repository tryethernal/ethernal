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
        v2Dex: null,
        gasAnalyticsEnabled: null,
        isDemo: false,
        totalSupply: null
    }),

    actions: {
        updateExplorer(explorer) {
            if (!explorer)
                this.$reset();

            this.$patch(explorer);
        }
    },

    getters: {
        mainDomain() {
            return this.domains.length ? this.domains[0] : this.domain;
        }
    }
});

