<template>
    <v-dialog v-model="dialog" max-width="1200">
        <v-card outlined v-if="explorer">
            <v-card-title>
                <template>Finalize your explorer setup</template>
                <v-spacer></v-spacer>
                <v-btn icon @click="close()" ><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <b>Name:</b> {{ explorer.name }}<br>
                <b>RPC:</b> {{ explorer.rpcServer }}
                <br><br>
                You're almost done with the setup, choose a plan to subscribe to and your explorer will be ready!
                <ul style="list-style: none;" v-if="!user.cryptoPaymentEnabled || user.canTrial" class="my-4">
                    <li v-if="!user.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</li>
                    <li v-if="user.canTrial">Each plan includes a 7 day free trial - No credit card needed.</li>
                </ul>
                <v-row justify="center">
                    <v-col cols="3" v-for="(plan, idx) in plans" :key="idx">
                        <Explorer-Plan-Card
                            :trial="user.canTrial"
                            :plan="plan"
                            :loading="selectedPlanSlug && selectedPlanSlug == plan.slug"
                            :disabled="selectedPlanSlug && selectedPlanSlug != plan.slug"
                            @updatePlan="onPlanSelected"></Explorer-Plan-Card>
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
    name: 'MigrateExplorerModal',
    components: {
        ExplorerPlanCard
    },
    data: () => ({
        explorer: null,
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        errorMessage: null,
        plans: null,
        selectedPlan: null,
        selectedPlanSlug: null,
        explorerToken: null
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.valid = false;
            this.errorMessage = null;
            this.loading = false;
            this.domain = null;
            this.explorer = options.explorer;
            this.explorerToken = options.explorerToken;
            if (this.isBillingEnabled)
                this.server.getExplorerPlans()
                    .then(({ data }) => this.plans = data.sort((a, b) => a.price - b.price))
                    .catch(console.log);

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        onPlanSelected(slug) {
            this.selectedPlanSlug = slug;
            this.errorMessage = null;
            this.loading = true;
            this.user.cryptoPaymentEnabled ? this.useCryptoPayment() : this.useStripePayment();
        },
        useCryptoPayment() {
            this.server.startCryptoSubscription(this.selectedPlanSlug, this.explorer.id)
                .then(() => window.location.assign(`/explorers/${this.explorer.id}?status=success`))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.loading = false;
                    this.selectedPlanSlug = null;
                });
        },
        useStripePayment() {
            const successUrl = `http://app.${this.mainDomain}/transactions?justMigrated=${this.explorer.id}`;
            const cancelUrl = `http://app.${this.mainDomain}/transactions?explorerToken=${this.explorerToken}`;
            this.server.createStripeExplorerCheckoutSession(this.explorer.id, this.selectedPlanSlug, successUrl, cancelUrl)
                .then(({ data }) => window.location.assign(data.url))
                .catch(error => {
                    console.log(error);
                    this.errorMessage = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                    this.selectedPlanSlug = null;
                });
        },
        close(refresh) {
            this.resolve(refresh);
            this.reset();
        },
        reset() {
            this.resolve = null;
            this.reject = null;
            this.dialog = false;
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'isBillingEnabled',
            'mainDomain'
        ])
    }
}
</script>
