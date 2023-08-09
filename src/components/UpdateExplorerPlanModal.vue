<template>
    <v-dialog v-model="dialog" max-width="1200">
        <v-card>
            <v-card-title>
                Select A Plan
                <v-spacer></v-spacer>
                <v-btn icon @click="close()" ><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-row justify="center">
                    <v-col cols="3" v-for="(plan, idx) in plans" :key="idx">
                        <Explorer-Plan-Card
                            :plan="plan"
                            :current="plan.slug == currentPlanSlug"
                            :loading="updatingSlug && plan.slug == updatingSlug"
                            :disabled="updatingSlug && plan.slug != updatingSlug || pendingCancelation && plan.slug != currentPlanSlug"
                            :pendingCancelation="pendingCancelation && plan.slug == currentPlanSlug"
                            @updatePlan="onUpdatePlan"></Explorer-Plan-Card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import ExplorerPlanCard from './ExplorerPlanCard.vue';

export default {
    name: 'UpdateExplorerPlanModal',
    components: {
        ExplorerPlanCard
    },
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        plans: null,
        updatingSlug: null,
        explorerId: null,
        currentPlanSlug: null,
        errorMessage: null,
        pendingCancelation: null,
        planUpdated: false
    }),
    methods: {
        onUpdatePlan(slug) {
            this.updatingSlug = slug || this.currentPlanSlug;
            this.errorMessage = null;
            if (slug && !this.currentPlanSlug)
                this.createPlan(slug);
            else if (slug && this.currentPlanSlug)
                this.updatePlan(slug);
            else if (!slug && this.currentPlanSlug)
                this.cancelPlan();
        },
        createPlan(slug) {
            if (this.user.cryptoPaymentEnabled) {
                this.server.startCryptoSubscription(slug, this.explorerId)
                    .then(() => {
                        this.currentPlanSlug = slug;
                        this.planUpdated = true;
                    })
                    .catch(error => {
                        console.log(error);
                        this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    })
                    .finally(() => this.updatingSlug = null);
            }
            else {
                this.server.createStripeExplorerCheckoutSession(this.explorerId, slug)
                    .then(({ data }) => window.location.assign(data.url))
                    .catch(error => {
                        console.log(error);
                        this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                        this.updatingSlug = null;
                    });
                }
        },
        updatePlan(slug) {
            if (this.isLessExpensiveThanCurrent(slug)) {
                const confirmationMessage = `This plan is cheaper than the current one. Your account will be credited with the prorated remainder for this month. These credits will automatically be applied to future invoices.
                Are you sure you want to change plan?`;
                if (!confirm(confirmationMessage))
                    return this.updatingSlug = null;
            }
            else {
                const confirmationMessage = `You will now be charged for the difference between your current plan and this one.
                Are you sure you want to change plan?`;
                if (!confirm(confirmationMessage))
                    return this.updatingSlug = null;
            }

            this.server.updateExplorerSubscription(this.explorerId, slug)
                .then(() => {
                    if (this.pendingCancelation && slug)
                        this.pendingCancelation = false;
                    this.currentPlanSlug = slug;
                    this.planUpdated = true;
                })
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while updating the plan. Please retry.';
                })
                .finally(() => this.updatingSlug = null);
        },
        cancelPlan() {
            const confirmationMessage = `
                If you cancel now, your explorer will be available until the end of the current billing period (06-08-2023).
                After that:
                - Blocks will stop syncing automatically
                - The explorer won't be accessible publicly anymore
                - You will still have access to your data privately in your workspace.
                If you want to resume the explorer, you'll just need to resubscribe to a plan.
                Are you sure you want to cancel?
            `;
            if (!confirm(confirmationMessage)) return this.updatingSlug = null;

            this.server.cancelExplorerSubscription(this.explorerId)
                .then(() => {
                    this.pendingCancelation = true;
                    this.planUpdated = true;
                })
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while canceling the plan. Please retry.';
                })
                .finally(() => this.updatingSlug = null);
        },
        open(options) {
            this.dialog = true;
            this.explorerId = options.explorerId;
            this.currentPlanSlug = options.currentPlanSlug;
            this.pendingCancelation = options.pendingCancelation;
            this.server.getExplorerPlans()
                .then(({ data }) => this.plans = data);
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve(this.planUpdated);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.plans = null;
            this.planUpdated = false;
        },
        isLessExpensiveThanCurrent(slug) {
            let currentPlan, newPlan;
            for (let i = 0; i < this.plans.length; i++) {
                if (this.plans[i].slug == slug)
                    newPlan = this.plans[i];
                if (this.plans[i].slug == this.currentPlanSlug)
                    currentPlan = this.plans[i];
            }
            if (newPlan.price < currentPlan.price)
                return true;
            return false;
        }
    },
    computed: {
        ...mapGetters([
            'user'
        ])
    }
}
</script>
