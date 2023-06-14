<template>
    <v-dialog v-model="dialog" max-width="1200">
        <v-card>
            <v-card-title>Select A Plan</v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="3" v-for="(plan, idx) in plans" :key="idx">
                        <v-card outlined :class="{ 'current-plan-card': plan.slug == currentPlanSlug }">
                            <v-card-title>
                                {{ plan.name }}
                                <v-spacer></v-spacer>
                                <v-chip class="ml-2" color="primary" small v-if="plan.slug == currentPlanSlug">Current</v-chip>
                            </v-card-title>
                            <v-card-subtitle class="pb-0">$1,000 / month</v-card-subtitle>
                            <v-card-text>
                                <v-list dense disabled>
                                    <v-list-item>
                                        <v-list-item-content class="py-0">
                                            <v-list-item-title style="font-weight: normal;">
                                                {{ plan.capabilities.txLimit.toLocaleString() }} txs / month
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">
                                                Data Retention: {{ plan.capabilities.dataRetention > 0 ? `${plan.capabilities.dataRetention} days` : 'Unlimited' }}
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-icon>
                                            <v-icon :color="pickIconColor(plan.capabilities.customDomain)">{{ pickIcon(plan.capabilities.customDomain) }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">Custom Domain</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-icon>
                                            <v-icon :color="pickIconColor(plan.capabilities.nativeToken)">{{ pickIcon(plan.capabilities.nativeToken) }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">
                                                Native Token
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-icon>
                                            <v-icon :color="pickIconColor(plan.capabilities.totalSupply)">{{ pickIcon(plan.capabilities.totalSupply) }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">
                                                Total Supply
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-icon>
                                            <v-icon :color="pickIconColor(plan.capabilities.statusPage)">{{ pickIcon(plan.capabilities.statusPage) }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">
                                                Status Page
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item>
                                        <v-list-item-icon>
                                            <v-icon :color="pickIconColor(plan.capabilities.branding)">{{ pickIcon(plan.capabilities.branding) }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title style="font-weight: normal;">
                                                Branding
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                </v-list>
                            </v-card-text>
                            <v-card-actions class="justify-center">
                                <v-btn v-if="plan.slug == currentPlanSlug" @click="cancelPlan()" class="error">Cancel Plan</v-btn>
                                <v-btn v-else @click="choosePlan(plan.slug)" class="primary">Choose Plan</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
export default {
    name: 'UpdateExplorerPlanModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        plans: null,
        loading: false,
        explorerId: null,
        currentPlanSlug: null
    }),
    methods: {
        choosePlan(slug) {
            if (this.currentPlanSlug)
                this.server.updateExplorerSubscription(this.explorerId, slug);
            else {
                const successPath = `/explorers/${this.explorerId}?status=success`;
                const cancelPath = `/explorers/${this.explorerId}?status=cancel`;
                this.server.createStripeCheckoutSession(slug, successPath, cancelPath, { explorerId: this.explorerId })
                    .then(({ data }) => document.location.href = data.url);
            }
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
            if (confirm(confirmationMessage))
                this.server.cancelExplorerSubscription(this.explorerId);
        },
        open(options) {
            this.dialog = true;
            this.explorerId = options.explorerId;
            this.currentPlanSlug = options.currentPlanSlug;
            this.server.getExplorerPlans()
                .then(({ data }) => this.plans = data);
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve(false);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.plans = null;
        },
        pickIcon(flag) {
            return flag ? 'mdi-check' : 'mdi-close';
        },
        pickIconColor(flag) {
            return flag ? 'success' : 'error';
        },
    }
}
</script>
<style lang="scss">
.current-plan-card {
    border: 1px solid var(--v-primary-base) !important;
}
</style>
