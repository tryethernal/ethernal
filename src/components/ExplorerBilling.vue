<template>
    <v-card class="flex-grow-1">
        <Update-Explorer-Plan-Modal ref="updateExplorerPlanModal" />
        <Explorer-Quota-Management-Modal ref="explorerQuotaManagementModal" />
        <v-card-text v-if="explorer.stripeSubscription">
            <div>Plan: <b>{{ explorer.stripeSubscription.stripePlan.name }}</b></div>
            <div>
                Status: <b :class="{'success--text': activeSubscription, 'warning--text': pendingCancelation }">{{ formattedExplorerStatus }}</b>
                <template v-if="trial">
                    | Add a payment method to keep the explorer up after your trial period.
                </template>
            </div>
            <div>
                Monthly Transaction Quota:
                <template v-if="explorer.stripeSubscription.cycleEndsAt">
                    <b>{{ explorer.stripeSubscription.transactionQuota.toLocaleString() }} / {{ transactionQuota > 0 ? transactionQuota.toLocaleString() : '&#8734;' }}</b> <template v-if="explorer.stripeSubscription.cycleEndsAt > 0">(Resetting {{ $dt.format(explorer.stripeSubscription.cycleEndsAt, 'MMM. d') }})</template><template v-if="activeSubscription && hasTxLimit"> | <a href="#" @click="openExplorerQuotaManagementModal()">Manage Quota</a></template>
                </template>
                <template v-else><b>Unlimited</b></template>
            </div>
            <v-btn v-if="!sso" class="mt-2" color="primary" @click="openUpdateExplorerPlanModal()">Update Plan</v-btn>
            <v-btn class="mt-2 ml-2" v-if="trial && !sso" :loading="stripePortalLoading" color="primary" @click="openStripePortal()">Add Payment Method</v-btn>
        </v-card-text>
        <v-card-text v-else>
            <v-btn color="primary" @click="openUpdateExplorerPlanModal()">Start Subscription</v-btn>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import UpdateExplorerPlanModal from './UpdateExplorerPlanModal.vue';
import ExplorerQuotaManagementModal from './ExplorerQuotaManagementModal.vue';

const props = defineProps({
  explorer: { type: Object, required: true },
  sso: { type: Boolean, default: false }
});
const emit = defineEmits(['updated']);

const updateExplorerPlanModal = ref(null);
const explorerQuotaManagementModal = ref(null);
const stripePortalLoading = ref(false);

const $server = inject('$server');

const transactionQuota = computed(() => {
  if (!props.explorer || !props.explorer.stripeSubscription)
    return 0;
  return props.explorer.stripeSubscription.stripeQuotaExtension
    ? props.explorer.stripeSubscription.stripePlan.capabilities.txLimit + props.explorer.stripeSubscription.stripeQuotaExtension.quota
    : props.explorer.stripeSubscription.stripePlan.capabilities.txLimit;
});

const trial = computed(() => props.explorer.stripeSubscription && props.explorer.stripeSubscription.status === 'trial');
const trialWithCard = computed(() => props.explorer.stripeSubscription && props.explorer.stripeSubscription.status === 'trial_with_card');
const activeSubscription = computed(() => props.explorer.stripeSubscription && props.explorer.stripeSubscription.status === 'active');
const pendingCancelation = computed(() => props.explorer.stripeSubscription && props.explorer.stripeSubscription.status === 'pending_cancelation');
const hasTxLimit = computed(() => {
  return props.explorer.stripeSubscription.stripePlan.capabilities.txLimit && props.explorer.stripeSubscription.stripePlan.capabilities.txLimit > 0;
});

const formattedExplorerStatus = computed(() => {
  if (activeSubscription.value) return 'Active';
  else if (pendingCancelation.value) return 'Pending Cancelation';
  else if (trial.value || trialWithCard.value) return 'Trial';
  else return 'N/A';
});

function openStripePortal() {
  stripePortalLoading.value = true;
  $server.createStripePortalSession(`http://${document.location.host}/explorers/${props.explorer.id}`)
    .then(({ data }) => document.location.href = data.url)
    .catch(() => stripePortalLoading.value = false);
}

function openUpdateExplorerPlanModal() {
  updateExplorerPlanModal.value.open({
    explorerId: props.explorer.id,
    currentPlanSlug: props.explorer.stripeSubscription && props.explorer.stripeSubscription.stripePlan.slug,
    pendingCancelation: pendingCancelation.value,
    isTrialing: trial.value || trialWithCard.value
  }).then(refresh => {
    if (refresh)
      emit('updated');
  });
}

function openExplorerQuotaManagementModal() {
  explorerQuotaManagementModal.value.open({
    explorerId: props.explorer.id,
    subscription: props.explorer.stripeSubscription
  }).then(() => emit('updated'));
}
</script>
