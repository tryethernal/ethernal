<template>
    <v-sheet outlined color="error" rounded>
        <v-card class="elevation-0">
            <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
            <v-card-text class="font-weight-medium error--text">
                <template v-if="isBillingEnabled">
                    <v-row v-if="activeSubscription">
                        You can't delete an explorer that has an active subscription. Please cancel it first.
                    </v-row>
                    <v-row v-else>
                        Deleting the explorer is not revertible.
                        Your workspace & its data will still be here and accessible with your private explorer.
                        If you'd like to clear workspace data, go in the "Settings" tab, and use the "Reset Workspace" button.
                    </v-row>
                </template>
                <v-row class="mt-2 pb-1">
                    <v-spacer></v-spacer>
                    <v-btn :disabled="activeSubscription && isBillingEnabled" :loading="loading" depressed color="error" class="mt-2" @click="deleteExplorer()"><v-icon>mdi-delete</v-icon>Delete Explorer</v-btn>
                </v-row>
            </v-card-text>
        </v-card>
    </v-sheet>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
    name: 'ExplorerDangerZone',
    props: ['explorer'],
    data: () => ({
        errorMessage: null,
        loading: false,
    }),
    methods: {
        deleteExplorer() {
            this.loading = true;
            this.errorMessage = null;

            const confirmationMessage = this.pendingCancelation ?
                `Your subscription is still valid until the end of the billing cycle. If you delete the explorer now, you will lose the remaining time. Are you sure you want to delete explorer "${ this.explorer.name }"?` :
                `Are you sure you want to delete explorer "${ this.explorer.name }"?`;

            if (!confirm(confirmationMessage))
                return this.loading = false;

            this.server.deleteExplorer(this.explorer.id)
                .then(() => this.$router.push({ path: `/explorers`, query: { deletedExplorer: this.explorer.name }}))
                .catch(error => {
                    this.errorMessage = error.response && error.response.data || 'Error while deleting explorer. Please retry.';
                })
                .finally(() => this.loading = false);
        }
    },
    computed: {
        ...mapGetters([
            'isBillingEnabled'
        ]),
        activeSubscription() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'active' },
        pendingCancelation() { return this.explorer.stripeSubscription && this.explorer.stripeSubscription.status == 'pending_cancelation' },
    }
}
</script>
