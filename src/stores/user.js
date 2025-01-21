import * as Sentry from '@sentry/vue';
import { getCurrentInstance } from 'vue';
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
            const env = useEnvStore();

            if (user) {
                this.$patch(user);

                Sentry.setUser({ id: this.id, email: this.email });

                if (user.apiToken)
                    localStorage.setItem('apiToken', user.apiToken);

                if (env.hasAnalyticsEnabled) {
                    if (window.feedbackfin && window.feedbackfin.config)
                        window.feedbackfin.config.user = { email: this.email };
                    if (window.smartsupp) {
                        window.smartsupp('name', this.email);
                        window.smartsupp('email', this.email);
                    }
                }
            }
            else {
                this.$reset();
                Sentry.setUser(null);
                localStorage.clear();
                if (env.hasAnalyticsEnabled) {
                    if (window.feedbackfin && window.feedbackfin.config)
                        window.feedbackfin.config.user = null;

                    this.globalProperties.$posthog.reset();
                    if (window.smartsupp) {
                        window.smartsupp('name', null);
                        window.smartsupp('email', null);
                    }
                }
            }
        }
    },

    getters: {
        loggedIn: () => localStorage.getItem('apiToken') !== null
    }
});
