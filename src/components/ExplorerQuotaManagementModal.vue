<template>
    <v-dialog v-model="dialog" max-width="1200" :persistent="true">
        <v-card border flat>
            <v-card-title class="d-flex justify-space-between align-center">
                <h4>Transaction Quota Management</h4>
                <v-btn color="grey" variant="text" icon="mdi-close" @click="close()"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-alert text type="error" v-if="errorMessage">{{ errorMessage }}</v-alert>
                <v-alert text type="success" v-if="successMessage">{{ successMessage }}</v-alert>
                <p>
                    Your plan includes {{ baseQuota.toLocaleString() }} transactions per month. If you need more, you can extend your quota here.
                    If set, your quota extension will automatically be renewed every month, but you can adjust or remove it anytime.
                    Increases will be charged for right away, and decreases will result in a prorated credit applied to your future invoices.
                </p>
                <b>Current Quota:</b> {{ baseQuota.toLocaleString() }} base + {{ currentExtraQuota.toLocaleString() }} extra = {{ currentQuota.toLocaleString() }} txs
                <v-divider class="mt-2 mb-4"></v-divider>
                <v-skeleton-loader v-if="stripePlanLoading" type="list-item-three-line"></v-skeleton-loader>
                <v-form v-else @submit.prevent="updateQuotaExtension()" v-model="valid">
                    <v-text-field
                        :rules="[v => parseInt(v) == 0 || parseInt(v) >= 10000 || 'Cannot be less than 10,000.']"
                        density="compact"
                        variant="outlined"
                        v-model="rawExtraQuota"
                        type="number"
                        suffix="extra transactions per month"
                        label="Extra Transaction Quota"></v-text-field>
                    <v-table>
                        <template v-slot:default>
                            <thead>
                                <tr>
                                    <th class="text-left">Up to</th>
                                    <th class="text-left">Cost per tx</th>
                                    <th class="text-left">Number of txs</th>
                                    <th class="text-left">Total Monthly Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(range, idx) in ranges" :key="idx">
                                    <td>{{ range.upTo.toLocaleString() }} {{ typeof range.upTo == 'number' ? 'txs' : '' }}</td>
                                    <td>${{ range.cost }}</td>
                                    <td>{{ quantityForRange(idx).toLocaleString() }}</td>
                                    <td>${{ costForRange(idx).toLocaleString() }}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td></td>
                                    <td></td>
                                    <td class="font-weight-bold">{{ totalQuantity.toLocaleString() }}</td>
                                    <td class="font-weight-bold">${{ totalCost.toLocaleString() }}</td>
                                </tr>
                            </tfoot>
                        </template>
                    </v-table>
                    <div align="right">
                        <v-btn color="primary" type="submit" :loading="loading || stripePlanLoading" :disabled="!valid">Update Quota</v-btn>
                    </div>
                </v-form>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
const moment = require('moment');

export default {
    name: 'ExplorerQuotaManagementModal',
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        rawExtraQuota: null,
        subscription: {},
        explorerId: null,
        valid: false,
        loading: false,
        stripePlanLoading: false,
        stripePlan: null,
        errorMessage: null,
        successMessage: null
    }),
    methods: {
        moment,
        open(options) {
            this.dialog = true;
            this.stripePlanLoading = true;
            this.subscription = options.subscription;
            this.explorerId = options.explorerId;
            if (this.subscription.stripeQuotaExtension)
                this.rawExtraQuota = this.subscription.stripeQuotaExtension.quota;

            this.$server.getQuotaExtensionPlan()
                .then(({ data }) => this.stripePlan = data)
                .finally(() => this.stripePlanLoading = false);

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        close() {
            this.resolve();
            this.dialog = false;
        },
        quantityForRange(idx) {
            const lowerBound = idx > 0 ? this.ranges[idx - 1].upTo : 0;
            const upperBound = this.ranges[idx].upTo;
            const quotaToUse = this.valid ? this.newQuota : this.currentQuota;

            if (idx == 0)
                return Math.min(quotaToUse, this.ranges[idx].upTo)
            else if (idx > 0 && idx < this.ranges.length - 1)
                return Math.max(Math.min(quotaToUse - lowerBound, upperBound - lowerBound), 0);
            else
                return Math.max(quotaToUse - this.ranges[idx - 1].upTo, 0);
        },
        costForRange(idx) {
            return parseFloat(this.quantityForRange(idx)) * parseFloat(this.ranges[idx].cost);
        },
        updateQuotaExtension() {
            this.loading = true;
            this.successMessage = null;
            this.errorMessage = null;

            if (parseInt(this.extraQuota) == 0)
                this.$server.cancelQuotaExtension(this.explorerId)
                    .then(({ data: { stripeSubscription }}) => {
                        this.successMessage = 'Transaction quota updated.';
                        this.subscription = stripeSubscription;
                    })
                    .catch(error => {
                        this.errorMessage = error.response && error.response.data;
                    })
                    .finally(() => {
                        this.loading = false;
                    });
            else
                this.$server.updateQuotaExtension(this.explorerId, this.stripePlan.slug, this.extraQuota)
                    .then(({ data: { stripeSubscription }}) => {
                        this.successMessage = 'Transaction quota updated.';
                        this.subscription = stripeSubscription;
                    })
                    .catch(error => {
                        this.errorMessage = error.response && error.response.data;
                    })
                    .finally(() => {
                        this.loading = false;
                    });
        }
     },
    computed: {
        ranges() {
            return this.stripePlan ? this.stripePlan.capabilities.ranges : [];
        },
        totalQuantity() {
            return this.ranges.reduce((acc, _curr, idx) => acc + this.quantityForRange(idx), 0);
        },
        totalCost() {
            return this.ranges.reduce((acc, _curr, idx) => acc + this.costForRange(idx), 0);
        },
        baseQuota() {
            return parseInt(this.subscription.stripePlan && this.subscription.stripePlan.capabilities.txLimit || 0);
        },
        extraQuota() {
            return this.rawExtraQuota && parseInt(this.rawExtraQuota) || 0;
        },
        newQuota() {
            return this.baseQuota + this.extraQuota;
        },
        currentExtraQuota() {
            return this.subscription.stripeQuotaExtension ? this.subscription.stripeQuotaExtension.quota : 0;
        },
        currentQuota() {
            return this.baseQuota + this.currentExtraQuota;
        }
    }
}
</script>
