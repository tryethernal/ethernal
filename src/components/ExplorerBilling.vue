<template>
    <v-card outlined class="flex-grow-1">
        <Update-Explorer-Plan-Modal ref="updateExplorerPlanModal" />
        <v-card-text v-if="explorer.stripeSubscription">
            <div>Plan: <b>{{ explorer.stripeSubscription.stripePlan.name }}</b></div>
            <div>Status: <b :class="{'success--text': activeSubscription, 'warning--text': pendingCancelation }">{{ formattedExplorerStatus }}</b></div>
            <div>
                Monthly Transaction Quota:
                <template v-if="explorer.stripeSubscription.cycleEndsAt">
                    <b>{{ explorer.stripeSubscription.transactionQuota.toLocaleString() }} / {{ explorer.stripeSubscription.stripePlan.capabilities.txLimit.toLocaleString() }}</b> (Resetting {{ moment(explorer.stripeSubscription.cycleEndsAt) | moment('MMM. Do') }})
                </template>
                <template v-else><b>Unlimited</b></template>
            </div>
            <v-btn class="mt-2" color="primary" @click="openUpdateExplorerPlanModal()">Update Plan</v-btn>
        </v-card-text>
        <v-card-text v-else>
            <v-btn color="primary" @click="openUpdateExplorerPlanModal()">Start Subscription</v-btn>
        </v-card-text>
    </v-card>
</template>

<script>
const moment = require('moment');
import UpdateExplorerPlanModal from './UpdateExplorerPlanModal';

export default {
    name: 'ExplorerBilling',
    props: ['explorer'],
    components: {
        UpdateExplorerPlanModal
    },
    methods: {
        moment,
        openUpdateExplorerPlanModal() {
            this.$refs.updateExplorerPlanModal.open({
                explorerId: this.explorer.id,
                currentPlanSlug: this.explorer.stripeSubscription && this.explorer.stripeSubscription.stripePlan.slug,
                pendingCancelation: this.pendingCancelation
            }).then(refresh => {
                if (refresh)
                    this.$emit('updated');
            });
        },
    },
    computed: {
        activeSubscription() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'active' },
        pendingCancelation() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'pending_cancelation' },
        formattedExplorerStatus() {
            if (this.activeSubscription)
                return 'Active';
            else if (this.pendingCancelation)
                return 'Pending Cancelation';
            else
                return 'N/A';
        }
    }
}
</script>
