import * as Sentry from "@sentry/vue";
import { defineStore } from 'pinia';

import { useEnvStore } from './env';

export const useUserStore = defineStore('user', {
    state: () => ({
        id: null,
        plan: 'free',
        onboarded: false
    }),

    actions: {
        // TODO: Do not forget to update the code using updateUserPlan

        updateCurrentWorkspace(workspace) {
            Sentry.setContext('Current Workspace', {
                id: workspace.id,
                name: workspace.name,
                explorer: workspace.explorer ? { id: workspace.explorer.id, name: workspace.explorer.name } : null
            });
            // TODO: Check if there is an explorer and set it in the correct store
            this.currentWorkspace = workspace;
        },

        updateUser(user) {
            if (user) {
                this.id = user.id;
                this.uid = user.firebaseUserId;
                this.email = user.email;
                this.loggedIn = true;
                this.plan = user.plan;
                this.apiToken = user.apiToken;
                this.canTrial = user.canTrial;
                this.cryptoPaymentEnabled = user.cryptoPaymentEnabled;
                this.canUseDemoPlan = user.canUseDemoPlan;

                Sentry.setUser({ id: this.id, email: this.email });
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