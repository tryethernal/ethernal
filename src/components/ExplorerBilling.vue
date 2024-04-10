<template>
    <v-card outlined class="flex-grow-1">
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
                    <b>{{ explorer.stripeSubscription.transactionQuota.toLocaleString() }} / {{ transactionQuota > 0 ? transactionQuota.toLocaleString() : '&#8734;' }}</b> (Resetting {{ moment(explorer.stripeSubscription.cycleEndsAt) | moment('MMM. Do') }})<template v-if="activeSubscription"> | <a href="#" @click="openExplorerQuotaManagementModal()">Manage Quota</a></template>
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

<script>
import { mapGetters } from 'vuex';
const moment = require('moment');
import UpdateExplorerPlanModal from './UpdateExplorerPlanModal.vue';
import ExplorerQuotaManagementModal from './ExplorerQuotaManagementModal.vue';

export default {
    name: 'ExplorerBilling',
    props: ['explorer', 'sso'],
    components: {
        UpdateExplorerPlanModal,
        ExplorerQuotaManagementModal
    },
    data: () => ({
        stripePortalLoading: false
    }),
    methods: {
        moment,
        openStripePortal() {
            this.stripePortalLoading = true;
            this.server.createStripePortalSession(`http://app.${this.mainDomain}/explorers/${this.explorer.id}`)
                .then(({ data }) => document.location.href = data.url)
                .catch(() => this.stripePortalLoading = false );
        },
        openUpdateExplorerPlanModal() {
            this.$refs.updateExplorerPlanModal.open({
                explorerId: this.explorer.id,
                currentPlanSlug: this.explorer.stripeSubscription && this.explorer.stripeSubscription.stripePlan.slug,
                pendingCancelation: this.pendingCancelation,
                isTrialing: this.trial || this.trialWithCard
            }).then(refresh => {
                if (refresh)
                    this.$emit('updated');
            });
        },
        openExplorerQuotaManagementModal() {
            this.$refs.explorerQuotaManagementModal.open({
                explorerId: this.explorer.id,
                subscription: this.explorer.stripeSubscription
            }).then(() => this.$emit('updated'));
        }
    },
    computed: {
        ...mapGetters([
            'mainDomain'
        ]),
        transactionQuota() {
            if (!this.explorer || !this.explorer.stripeSubscription)
                return 0;

            return this.explorer.stripeSubscription.stripeQuotaExtension ?
                this.explorer.stripeSubscription.stripePlan.capabilities.txLimit + this.explorer.stripeSubscription.stripeQuotaExtension.quota :
                this.explorer.stripeSubscription.stripePlan.capabilities.txLimit;
        },
        trial() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'trial' },
        trialWithCard() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'trial_with_card' },
        activeSubscription() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'active' },
        pendingCancelation() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'pending_cancelation' },
        formattedExplorerStatus() {
            if (this.activeSubscription)
                return 'Active';
            else if (this.pendingCancelation)
                return 'Pending Cancelation';
            else if (this.trial || this.trialWithCard)
                return 'Trial'
            else
                return 'N/A';
        }
    }
}
</script>
