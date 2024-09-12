import { defineStore } from 'pinia';

export const useEnvStore = defineStore('env', {
    state: () => ({
        version: import.meta.VITE_VERSION,
        environment: import.meta.NODE_ENV,
        sentryDSN: `${window.location.protocol}//${import.meta.VITE_SENTRY_DSN_SECRET}@${window.location.host}/${import.meta.VITE_SENTRY_DSN_PROJECT_ID}`,
        soketiHost: import.meta.VITE_SOKETI_HOST,
        soketiPort: import.meta.VITE_SOKETI_PORT && parseInt(import.meta.VITE_SOKETI_PORT),
        soketiForceTLS: !!import.meta.VITE_SOKETI_FORCE_TLS,
        pusherKey: import.meta.VITE_PUSHER_KEY,
        postHogApiKey: import.meta.VITE_POSTHOG_API_KEY,
        postHogApiHost: import.meta.VITE_POSTHOG_API_HOST,
        hasAnalyticsEnabled: !!import.meta.VITE_ENABLE_ANALYTICS,
        hasDemoEnabled: !!import.meta.VITE_ENABLE_DEMO,
        mainDomain: import.meta.VITE_MAIN_DOMAIN,
        isBillingEnabled: !!import.meta.VITE_ENABLE_BILLING,
        isMarketingEnabled: !!import.meta.VITE_ENABLE_MARKETING,
        apiRoot: import.meta.VITE_API_ROOT,
    }),
});
