<template>
    <div>
        <v-alert class="mb-4" type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
        <v-row justify="center">
            <template v-if="loading">
                <v-col  cols="3">
                    <v-card><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
                <v-col  cols="3">
                    <v-card><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
                <v-col  cols="3">
                    <v-card><v-skeleton-loader type="article, actions"></v-skeleton-loader></v-card>
                </v-col>
            </template>
            <v-col v-else lg="3" md="6" sm="12" v-for="(plan, idx) in plans" :key="idx">
                <Explorer-Plan-Card
                    :current="currentPlanSlug == plan.slug"
                    :pendingCancelation="pendingCancelation && plan.slug == currentPlanSlug && plan.price > 0"
                    :bestValue="!currentPlanSlug && bestValueSlug == plan.slug && !selectedPlanSlug"
                    :trial="userStore.canTrial"
                    :plan="plan"
                    :loading="selectedPlanSlug && selectedPlanSlug == plan.slug"
                    :disabled="selectedPlanSlug && selectedPlanSlug != plan.slug"
                    @updatePlan="onPlanSelected"
                ></Explorer-Plan-Card>
            </v-col>
        </v-row>
    </div>
</template>
<script setup>
import { ref, onMounted, inject } from 'vue';
import { useEnvStore } from '../stores/env';
import { useUserStore } from '../stores/user';
import ExplorerPlanCard from './ExplorerPlanCard.vue';

const props = defineProps({
    bestValueSlug: {
        type: String,
        default: 'explorer-150'
    },
    explorerId: Number,
    currentPlanSlug: String,
    isTrialing: Boolean,
    pendingCancelation: Boolean,
    stripeSuccessUrl: String,
    stripeCancelUrl: String
});
const emit = defineEmits(['planCreated', 'planUpdated', 'planCanceled']);

const envStore = useEnvStore();
const userStore = useUserStore();

const loading = ref(false);
const plans = ref(null);
const selectedPlanSlug = ref(null);
const errorMessage = ref(null);

const $server = inject('$server');

onMounted(() => {
    loading.value = true;
    // $server is assumed to be available globally (as in Options API)
    // If not, inject it or import as needed
    // eslint-disable-next-line no-undef
    $server.getExplorerPlans()
        .then(({ data }) => plans.value = data.sort((a, b) => {
            if (a.price === null && b.price === null) return 0;
            if (a.price === null) return 1;
            if (b.price === null) return -1;
            return a.price - b.price;
        }))
        .catch(console.log)
        .finally(() => loading.value = false);
});

function onPlanSelected(slug) {
    selectedPlanSlug.value = slug || props.currentPlanSlug;
    errorMessage.value = null;
    if (slug && !props.currentPlanSlug)
        createPlan(slug);
    else if (slug && props.currentPlanSlug)
        updatePlan(slug);
    else if (!slug && props.currentPlanSlug)
        cancelPlan();
}

function findPlan(slug) {
    console.log(plans.value)
    return plans.value.find(plan => plan.slug === slug);
}

function createPlan(slug) {
    const plan = findPlan(slug);
    if (userStore.cryptoPaymentEnabled) {
        // eslint-disable-next-line no-undef
        $server.startCryptoSubscription(slug, props.explorerId)
            .then(() => {
                emit('planCreated', slug);
            })
            .catch(error => {
                console.log(error);
                errorMessage.value = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
            })
            .finally(() => selectedPlanSlug.value = null);
    }
    else if (plan.price == 0) {
        $server.createExplorerSubscription(props.explorerId, slug)
            .then(() => window.location.assign(`//${envStore.mainDomain}/explorers/${props.explorerId}`))
            .catch(error => {
                console.log(error);
                errorMessage.value = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                selectedPlanSlug.value = null;
            });
    }
    else if (userStore.canTrial) {
        // eslint-disable-next-line no-undef
        $server.startTrial(props.explorerId, slug)
            .then(() => window.location.assign(`//${envStore.mainDomain}/explorers/${props.explorerId}`))
            .catch(error => {
                console.log(error);
                errorMessage.value = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                selectedPlanSlug.value = null;
            });
    }
    else {
        createStripeCheckoutSession();
    }
}

function createStripeCheckoutSession() {
    const successUrl = props.stripeSuccessUrl || `http://${envStore.mainDomain}/explorers/${props.explorerId}?justCreated=true`;
    const cancelUrl = props.stripeCancelUrl || `http://${envStore.mainDomain}/explorers/${props.explorerId}`;
    // eslint-disable-next-line no-undef
    $server.createStripeExplorerCheckoutSession(props.explorerId, selectedPlanSlug.value, successUrl, cancelUrl)
        .then(({ data }) => window.location.assign(data.url))
        .catch(error => {
            console.log(error);
            errorMessage.value = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
            selectedPlanSlug.value = null;
        });
}

function updatePlan(slug) {
    const currentPlan = findPlan(props.currentPlanSlug);
    const newPlan = findPlan(slug);

    if (userStore.canTrial) {
        $server.startTrial(props.explorerId, slug)
            .then(() => window.location.assign(`//${envStore.mainDomain}/explorers/${props.explorerId}`))
            .catch(error => {
                console.log(error);
                errorMessage.value = error.response && error.response.data || 'Error while subscribing to the selected plan. Please retry.';
                selectedPlanSlug.value = null;
            });
    }
    else {
        if (props.isTrialing) {
            const confirmationMessage = newPlan.price == 0 ?
                `If you update to the free plan now, your free trial will be canceled.\n\nAre you sure you want to change plan?` :
                `If you update your plan, you will be charged the amount of the new one at the end of the trial period.\n\nAre you sure you want to change plan?`;
            if (!confirm(confirmationMessage))
                return selectedPlanSlug.value = null;
        }
        else if (isLessExpensiveThanCurrent(slug)) {
            const confirmationMessage = `This plan is cheaper than the current one. Your account will be credited with the prorated remainder for this month. These credits will automatically be applied to future invoices.\n\nAre you sure you want to change plan?`;
            if (!confirm(confirmationMessage))
                return selectedPlanSlug.value = null;
        }
        else {
            const confirmationMessage = `You will now be charged for the difference between your current plan and this one.\n\nAre you sure you want to change plan?`;
            if (!confirm(confirmationMessage))
                return selectedPlanSlug.value = null;
        }

        if (currentPlan.price == 0 && newPlan.price > 0) {
            createStripeCheckoutSession();
        }
        else {
            // eslint-disable-next-line no-undef
            $server.updateExplorerSubscription(props.explorerId, slug)
                .then(() => emit('planUpdated', slug))
                .catch(error => {
                    console.log(error);
                    errorMessage.value = error.response && error.response.data || 'Error while updating the plan. Please retry.';
                })
                .finally(() => selectedPlanSlug.value = null);
        }
    }
}

function cancelPlan() {
    const currentPlan = findPlan(props.currentPlanSlug);
    if (currentPlan.price == 0) {
        const confirmationMessage = 'Are you sure you want to cancel your explorer?';
        if (!confirm(confirmationMessage)) return selectedPlanSlug.value = null;
    }
    else {
        const confirmationMessage = props.isTrialing ?
            `This will cancel your trial & you won't be charged. Your explorer will be active until the end of the trial period.\n\nAre you sure you want to cancel?` :
            `If you cancel now, your explorer will be available until the end of the current billing period (06-08-2023).\n                After that:\n                - Blocks will stop syncing automatically\n                - The explorer won't be accessible publicly anymore\n                - You will still have access to your data privately in your workspace.\n                If you want to resume the explorer, you'll just need to resubscribe to a plan.\n\nAre you sure you want to cancel?`;

        if (!confirm(confirmationMessage)) return selectedPlanSlug.value = null;
    }

    // eslint-disable-next-line no-undef
    $server.cancelExplorerSubscription(props.explorerId)
        .then(() => {
            emit('planCanceled', currentPlan.price == 0);
        })
        .catch(error => {
            console.log(error);
            errorMessage.value = error.response && error.response.data || 'Error while canceling the plan. Please retry.';
        })
        .finally(() => selectedPlanSlug.value = null);
}

function isLessExpensiveThanCurrent(slug) {
    let currentPlan, newPlan;
    if (!plans.value) return false;
    for (let i = 0; i < plans.value.length; i++) {
        if (plans.value[i].slug == slug)
            newPlan = plans.value[i];
        if (plans.value[i].slug == props.currentPlanSlug)
            currentPlan = plans.value[i];
    }
    if (newPlan && currentPlan && newPlan.price < currentPlan.price)
        return true;
    return false;
}
</script>
<style lang="scss">
.current-plan-card {
    border: 1px solid var(--v-primary-base) !important;
}
</style>
