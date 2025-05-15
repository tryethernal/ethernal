import { defineStore } from 'pinia';

import { useUserStore } from './user';

export const useEnvStore = defineStore('env', {
    state: () => ({
        version: import.meta.env.VITE_VERSION,
        environment: import.meta.env.NODE_ENV,
        isSelfHosted: !!import.meta.env.VITE_IS_SELF_HOSTED,
        soketiHost: import.meta.env.VITE_SOKETI_HOST || window.location.hostname,
        soketiPort: import.meta.env.VITE_SOKETI_PORT && parseInt(import.meta.env.VITE_SOKETI_PORT),
        soketiForceTLS: !!import.meta.env.VITE_SOKETI_FORCE_TLS,
        soketiKey: import.meta.env.VITE_SOKETI_KEY || 'app-key',
        postHogApiKey: import.meta.env.VITE_POSTHOG_API_KEY,
        postHogApiHost: import.meta.env.VITE_POSTHOG_API_HOST,
        hasAnalyticsEnabled: !!import.meta.env.VITE_POSTHOG_API_KEY && !!import.meta.env.VITE_POSTHOG_API_HOST,
        mainDomain: '',
        apiRoot: '',
        maxV2DexPairsForTrial: 20,
        nativeTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        chains: {
            ethereum: {
                slug: 'ethereum',
                name: 'Ethereum',
                token: 'ETH',
                scanner: 'Etherscan'
            },
            bsc: {
                slug: 'bsc',
                name: 'BSC',
                token: 'BNB',
                scanner: 'BSCscan'
            },
            matic: {
                slug: 'matic',
                name: 'Matic',
                token: 'Matic',
                scanner: 'Polygonscan'
            },
            avax: {
                slug: 'avax',
                name: 'Avalanche',
                token: 'Avax',
                scanner: 'Snowtrace'
            },
            arbitrum: {
                slug: 'arbitrum',
                name: 'Arbitrum',
                token: 'Ether',
                scanner: 'Arbiscan'
            }
        }
    }),

    actions: {
        setMainDomain(mainDomain) {
            this.mainDomain = mainDomain;
        }
    },

    getters: {
        isAdmin: () => {
            const userStore = useUserStore();
            return userStore.isAdmin;
        },

        isOnMainDomain: (state) => {
            return window.location.host === state.mainDomain;
        }
    }
});
