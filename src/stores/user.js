import * as Sentry from "@sentry/vue";
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
        // TODO: Do not forget to update the code using updateUserPlan

        updateUser(user) {
            const env = useEnvStore();

            if (user) {
                this.$patch(user);

                Sentry.setUser({ id: this.id, email: this.email });

                if (user.apiToken)
                    localStorage.setItem('apiToken', user.apiToken);

                if (env.hasAnalyticsEnabled) {
                    window.feedbackfin.config.user = { email: this.email };
                    this._vm.$posthog.identify(this.id, { email: this.email });
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
                    window.feedbackfin.config.user = null;
                    this._vm.$posthog.reset();
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
