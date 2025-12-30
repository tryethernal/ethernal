/**
 * @fileoverview Explorer Pinia store.
 * Manages current explorer instance state including domain, themes, and features.
 * @module stores/explorer
 */

import { defineStore } from 'pinia';

export const useExplorerStore = defineStore('explorer', {
    state: () => ({
        id: null,
        slug: null,
        name: null,
        rpcServer: null,
        token: 'ETH',
        domain: null,
        domains: [],
        themes: {},
        admin: {},
        workspace: {},
        faucet: null,
        v2Dex: null,
        gasAnalyticsEnabled: null,
        isDemo: false,
        totalSupply: null,
        adsEnabled: null,
        displayTopAccounts: null
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

