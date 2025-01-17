import { defineStore } from 'pinia';

export const useEnvStore = defineStore('env', {
    state: () => ({
        version: import.meta.env.VITE_VERSION,
        environment: import.meta.env.NODE_ENV,
        soketiHost: import.meta.env.VITE_SOKETI_HOST,
        soketiPort: import.meta.env.VITE_SOKETI_PORT && parseInt(import.meta.env.VITE_SOKETI_PORT),
        soketiForceTLS: !!import.meta.env.VITE_SOKETI_FORCE_TLS,
        pusherKey: import.meta.env.VITE_PUSHER_KEY,
        postHogApiKey: import.meta.env.VITE_POSTHOG_API_KEY,
        postHogApiHost: import.meta.env.VITE_POSTHOG_API_HOST,
        hasAnalyticsEnabled: !!import.meta.env.VITE_ENABLE_ANALYTICS,
        hasDemoEnabled: !!import.meta.env.VITE_ENABLE_DEMO,
        mainDomain: import.meta.env.VITE_MAIN_DOMAIN,
        isBillingEnabled: !!import.meta.env.VITE_ENABLE_BILLING,
        isMarketingEnabled: !!import.meta.env.VITE_ENABLE_MARKETING,
        apiRoot: import.meta.env.VITE_API_ROOT,
        isAdmin: location.host === `app.${import.meta.env.VITE_MAIN_DOMAIN}`,
        maxV2DexPairsForTrial: 20,
        nativeTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        chains: {
            ethereum: {
                slug: 'ethereum',
                name: 'Ethereum',
                token: 'Ether',
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
});
