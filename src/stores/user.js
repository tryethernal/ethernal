import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

import { useEnvStore } from './env';

export const useUserStore = defineStore('user', {
    state: () => ({
        id: null,
        plan: 'free',
        onboarded: false,
        loggedIn: false,
        isAdmin: false,
        firebaseUserId: null
    }),

    actions: {
        // TODO: Do not forget to update the code using updateUserPlan

        updateUser(user) {
            if (user) {
                this.$patch(user);

                Sentry.setUser({ id: this.id, email: this.email });
                this.loggedIn = true;
            }
            else {
                this.$reset();

                const env = useEnvStore();

                if (env.hasAnalyticsEnabled) {
                    window.feedbackfin.config.user = { email: this.email };
                    this._vm.$posthog.identify(this.id, { email: this.email });
                    if (window.smartsupp) {
                        window.smartsupp('name', this.email);
                        window.smartsupp('email', this.email);
                    }
                }
            }
        }
    }
});
