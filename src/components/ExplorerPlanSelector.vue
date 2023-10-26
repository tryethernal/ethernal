<template>
    <v-row justify="center">
        <template v-if="loading">
            <v-col  cols="3">
                <v-card outlined><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
            </v-col>
            <v-col  cols="3">
                <v-card outlined><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
            </v-col>
            <v-col  cols="3">
                <v-card outlined><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
            </v-col>
        </template>
        <v-col v-else cols="3" v-for="(plan, idx) in plans" :key="idx">
            <Explorer-Plan-Card
                :bestValue="bestValueSlug == plan.slug && !selectedPlanSlug"
                :trial="user.canTrial"
                :plan="plan"
                :loading="selectedPlanSlug && selectedPlanSlug == plan.slug"
                :disabled="selectedPlanSlug && selectedPlanSlug != plan.slug"
                @updatePlan="onPlanSelected"></Explorer-Plan-Card>
        </v-col>
    </v-row>
</template>
<script>
import { mapGetters } from 'vuex';
import ExplorerPlanCard from './ExplorerPlanCard.vue';

export default {
    name: 'ExplorerPlanSelector',
    props: {
        bestValueSlug: {
            default: 'explorer-150'
        },
        explorerId: Number,
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
        errorMessage: null
    }),
    mounted() {
        this.loading = true;
        this.server.getExplorerPlans()
            .then(({ data }) => this.plans = data.sort((a, b) => a.price - b.price))
            .catch(console.log)
            .finally(() => this.loading = false);
    },
    methods: {
        onPlanSelected(slug) {
            this.selectedPlanSlug = slug;
            this.errorMessage = null;
            this.user.cryptoPaymentEnabled ? this.useCryptoPayment() : this.useStripePayment();
        },
        useCryptoPayment() {
            this.server.startCryptoSubscription(this.selectedPlanSlug, this.explorerId)
                .then(() => window.location.assign(`/explorers/${this.explorerId}?status=success`))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.loading = false;
                    this.selectedPlanSlug = null;
                });
        },
        useStripePayment() {
            const successUrl = this.stripeSuccessUrl || `http://app.${this.mainDomain}/explorers/${this.explorerId}?justCreated=true`;
            const cancelUrl = this.stripeCancelUrl || `http://app.${this.mainDomain}/explorers/${this.explorerId}`;
            this.server.createStripeExplorerCheckoutSession(this.explorerId, this.selectedPlanSlug, successUrl, cancelUrl)
                .then(({ data }) => window.location.assign(data.url))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.selectedPlanSlug = null;
                });
        },
    },
    computed: {
        ...mapGetters([
            'user',
            'mainDomain'
        ])
    }
}
</script>
<style lang="scss">
.current-plan-card {
    border: 1px solid var(--v-primary-base) !important;
}
</style>
