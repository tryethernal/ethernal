/**
 * @fileoverview User Pinia store.
 * Manages authenticated user state including plan, onboarding, and API token.
 * Integrates with Sentry, Smartsupp, and feedback services.
 * @module stores/user
 */

import * as Sentry from '@sentry/vue';
import { defineStore } from 'pinia';

import { useEnvStore } from './env';

export const useUserStore = defineStore('user', {
    state: () => ({
        id: null,
        plan: 'free',
        onboarded: false,
        isAdmin: false,
        firebaseUserId: null,
        apiToken: null,
        canUseDemoPlan: null,
        cryptoPaymentEnabled: null,
        canTrial: null
    }),

    actions: {
        updateUser(user) {
            const envStore = useEnvStore();

            if (user) {
                this.$patch(user);

                Sentry.setUser({ id: user.id, email: user.email });

                if (user.apiToken)
                    localStorage.setItem('apiToken', user.apiToken);

                if (window.feedbackfin && window.feedbackfin.config && user.email)
                    window.feedbackfin.config.user = { email: user.email };

                if (window.smartsupp && user.email) {
                    window.smartsupp('name', user.email);
                    window.smartsupp('email', user.email);
                }

                if (envStore.hasAnalyticsEnabled && user.id && window.posthog && typeof window.posthog.identify === 'function') {
                    const props = {};
                    if (user.email) props.email = user.email;
                    if (user.plan) props.plan = user.plan;
                    window.posthog.identify(String(user.id), props);
                }
            }
            else {
                this.$reset();
                Sentry.setUser(null);
                localStorage.clear();

                if (window.feedbackfin && window.feedbackfin.config)
                    window.feedbackfin.config.user = null;

                if (window.smartsupp) {
                    window.smartsupp('name', null);
                    window.smartsupp('email', null);
                }

                if (envStore.hasAnalyticsEnabled && window.posthog && typeof window.posthog.reset === 'function')
                    window.posthog.reset();
            }
        }
    },

    getters: {
        loggedIn: () => localStorage.getItem('apiToken') !== null
    }
});
