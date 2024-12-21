<template>
    <div>
        <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
        <v-row justify="center">
            <template v-if="loading">
                <v-col  cols="3">
                    <v-card border flat><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
                <v-col  cols="3">
                    <v-card border flat><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
                <v-col  cols="3">
                    <v-card border flat><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
            </template>
            <v-col v-else cols="3" v-for="(plan, idx) in plans" :key="idx">
                <Explorer-Plan-Card
                    :current="currentPlanSlug == plan.slug"
                    :pendingCancelation="pendingCancelation && plan.slug == currentPlanSlug"
                    :bestValue="!currentPlanSlug && bestValueSlug == plan.slug && !selectedPlanSlug"
                    :trial="userStore.canTrial"
                    :plan="plan"
                    :loading="selectedPlanSlug && selectedPlanSlug == plan.slug"
                    :disabled="selectedPlanSlug && selectedPlanSlug != plan.slug"
                    @updatePlan="onPlanSelected"></Explorer-Plan-Card>
            </v-col>
        </v-row>
    </div>
</template>
<script>
import { mapStores } from 'pinia';
import { useEnvStore } from '../stores/env';
import { useUserStore } from '../stores/user';

import ExplorerPlanCard from './ExplorerPlanCard.vue';

export default {
    name: 'ExplorerPlanSelector',
    props: {
        bestValueSlug: {
            default: 'explorer-150'
        },
        explorerId: Number,
        currentPlanSlug: String,
        isTrialing: Boolean,
        pendingCancelation: Boolean,
        stripeSuccessUrl: String,
        stripeCancelUrl: String
    },
    components: {
        ExplorerPlanCard
    },
    data: () => ({
        loading: false,
        plans: null,
        selectedPlanSlug: null,
        errorMessage: null,
        updatingSlug: null
    }),
    mounted() {
        this.loading = true;
        this.$server.getExplorerPlans()
            .then(({ data }) => this.plans = data.sort((a, b) => a.price - b.price && b.price > 0))
            .catch(console.log)
            .finally(() => this.loading = false);
    },
    methods: {
        onPlanSelected(slug) {
            this.selectedPlanSlug = slug || this.currentPlanSlug;
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
                this.$server.startCryptoSubscription(slug, this.explorerId)
                    .then(() => {
                        this.$emit('planCreated', slug);
                    })
                    .catch(error => {
                        console.log(error);
                        this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    })
                    .finally(() => this.selectedPlanSlug = null);
            }
            else if (this.user.canTrial) {
                this.$server.startTrial(this.explorerId, slug)
                    .then(() => window.location.assign(`//app.${this.envStore.mainDomain}/explorers/${this.explorerId}`))
                    .catch(error => {
                        console.log(error);
                        this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                        this.selectedPlanSlug = null;
                    });
            }
            else {
                const successUrl = this.stripeSuccessUrl || `http://app.${this.envStore.mainDomain}/explorers/${this.explorerId}?justCreated=true`;
                const cancelUrl = this.stripeCancelUrl || `http://app.${this.envStore.mainDomain}/explorers/${this.explorerId}`;
                this.$server.createStripeExplorerCheckoutSession(this.explorerId, this.selectedPlanSlug, successUrl, cancelUrl)
                    .then(({ data }) => window.location.assign(data.url))
                    .catch(error => {
                        console.log(error);
                        this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                        this.selectedPlanSlug = null;
                    });
            }
        },
        updatePlan(slug) {
            if (this.isTrialing) {
                const confirmationMessage = `If you update your plan, you will be charged the amount of the new one at the end of the trial period.

Are you sure you want to change plan?`;
                if (!confirm(confirmationMessage))
                    return this.selectedPlanSlug = null;
            }
            else if (this.isLessExpensiveThanCurrent(slug)) {
                const confirmationMessage = `This plan is cheaper than the current one. Your account will be credited with the prorated remainder for this month. These credits will automatically be applied to future invoices.

Are you sure you want to change plan?`;
                if (!confirm(confirmationMessage))
                    return this.selectedPlanSlug = null;
            }
            else {
                const confirmationMessage = `You will now be charged for the difference between your current plan and this one.

Are you sure you want to change plan?`;
                if (!confirm(confirmationMessage))
                    return this.selectedPlanSlug = null;
            }

            this.$server.updateExplorerSubscription(this.explorerId, slug)
                .then(() => this.$emit('planUpdated', slug))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while updating the plan. Please retry.';
                })
                .finally(() => this.selectedPlanSlug = null);
        },
        cancelPlan() {
            const confirmationMessage = this.isTrialing ?
                `This will cancel your trial & you won't be charged. Your explorer will be active until the end of the trial period.

Are you sure you want to cancel?` :

                `If you cancel now, your explorer will be available until the end of the current billing period (06-08-2023).
                After that:
                - Blocks will stop syncing automatically
                - The explorer won't be accessible publicly anymore
                - You will still have access to your data privately in your workspace.
                If you want to resume the explorer, you'll just need to resubscribe to a plan.

Are you sure you want to cancel?`;

            if (!confirm(confirmationMessage)) return this.selectedPlanSlug = null;

            this.$server.cancelExplorerSubscription(this.explorerId)
                .then(() => {
                    this.$emit('planCanceled');
                })
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while canceling the plan. Please retry.';
                })
                .finally(() => this.selectedPlanSlug = null);
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
        ...mapStores(useEnvStore, useUserStore)
    }
}
</script>
<style lang="scss">
.current-plan-card {
    border: 1px solid var(--v-primary-base) !important;
}
</style>
