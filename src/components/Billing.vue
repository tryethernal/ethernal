<template>
    <v-container fluid>
        <Create-Explorer-Modal ref="createExplorerModalRef" />
        <v-alert v-if="!isPremium && justUpgraded" density="compact" text type="success">You've been successfully upgraded to the Premium plan. It is currently being activated, and should be ready in about a minute. Thank you!</v-alert>
        <v-alert v-if="isPremium && justUpgraded" density="compact" text type="success">Your Premium plan is now ready!</v-alert>
        <v-alert v-show="errorMessage" density="compact" text type="error">{{ errorMessage }}</v-alert>
        <v-card class="my-4">
            <v-card-title>Public Explorer Plans</v-card-title>
            <v-card-text v-if="loading">
                <v-skeleton-loader type="list-item-three-line"></v-skeleton-loader>
            </v-card-text>
            <v-card-text v-else>
                You have <strong>{{ activeExplorers.length }}</strong> active public explorer{{ activeExplorers.length != 1 ? `s` : `` }}.
                <v-row>
                    <v-col cols="6">
                        <v-table v-if="activeExplorers.length > 0">
                            <template v-slot:default>
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th class="text-left">Plan</th>
                                        <th class="text-left">Cost</th>
                                        <th class="text-left">Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(explorer, idx) in activeExplorers" :key="idx">
                                        <td>{{ explorer.name }}</td>
                                        <td>{{ explorer.planName }}</td>
                                        <td v-if="explorer.planCost > 0">${{ explorer.planCost.toLocaleString() }}/mo</td>
                                        <td v-else>/</td>
                                        <td>{{ explorer.subscriptionStatus }}</td>
                                        <td><router-link :to="`/explorers/${explorer.id}`">Manage</router-link></td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td></td>
                                        <td></td>
                                        <td>
                                            Total: <span class="font-weight-bold">${{ activeExplorerCost.toLocaleString() }}/mo</span>
                                        </td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </template>
                        </v-table>
                        <v-btn v-else variant="flat" color="primary" class="mt-4" @click="openCreateExplorerModal()">
                            <v-icon size="small" class="mr-1">mdi-plus</v-icon>Create Explorer
                        </v-btn>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
        <v-card class="mb-4">
            <v-card-title>Private Explorer Plan</v-card-title>
            <v-row class="ml-1 mb-1">
                <v-col cols="4">
                    <v-card style="height: 100%" border flat>
                        <v-card-title class="d-flex justify-space-between align-center">
                            Free
                            <v-chip class="ml-2" color="primary" size="small" v-if="!isPremium">Current</v-chip>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-list density="compact">
                            <v-list-item v-for="(feature, idx) in plans.free" :key="`free-${idx}`">
                                <template v-slot:prepend>
                                    <v-icon v-if="feature" class="mx-0 mr-1" color="success">mdi-check</v-icon>
                                </template>
                                {{ feature }}
                            </v-list-item>
                        </v-list>
                    </v-card>
                </v-col>
                <v-col cols="4">
                    <v-card style="height: 100%" border flat>
                        <v-card-title class="d-flex justify-space-between align-center">
                            Premium - $20/month
                            <v-chip class="ml-2" color="primary" size="small" v-if="isPremium">Current Plan</v-chip>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-list density="compact">
                            <v-list-item v-for="(feature, idx) in plans.premium" :key="idx">
                                <template v-slot:prepend>
                                    <v-icon v-if="feature" class="mx-0 mr-1" color="success">mdi-check</v-icon>
                                </template>
                                {{ feature }}
                            </v-list-item>
                        </v-list>
                        <v-card-actions class="justify-center d-flex flex-column">
                            <v-btn :loading="subscriptionButtonLoading" variant="flat" color="primary" v-if="isPremium" @click="openStripePortal()">Manage Subscription</v-btn>
                            <v-btn :loading="subscriptionButtonLoading" variant="flat" color="primary" v-else @click="subscribeToPlan()">Subscribe</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </v-card>
        <v-row>
            <v-col>
                <v-card>
                    <v-card-text>
                        <strong>What's the difference between "Public Explorer" & "Private Explorer"?</strong>
                        <p>
                            Private explorers are only accessible after logging in.
                            You can't share a transaction page, for example.<br>
                            You'll also need to either use the CLI or the Hardhat plugin to synchronize blocks.<br>
                            Recommended if you are a solo developer, working on a local chain.
                        </p>
                        <p>
                            Public explorers are more flexible: you get a public URL for your explorer, blocks are synced automatically,
                            and you have more customization options (native token name, custom domains, branding, etc..).<br>
                            Recommended if you have your own app chain, or hosted chain that you are sharing with others.
                        </p>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>
<script>
import { mapStores } from 'pinia';

import { useUserStore } from '../stores/user';
import { useEnvStore } from '../stores/env';

import CreateExplorerModal from './CreateExplorerModal.vue';

export default {
    name: 'Billing',
    components: {
        CreateExplorerModal
    },
    data: () => ({
        errorMessage: null,
        subscriptionButtonLoading: false,
        source: null,
        plans: {
            free: [
                '10 contracts',
                '1 workspace',
                '7 days data retention'
            ],
            premium: [
                'Unlimited contracts',
                'Unlimited workspaces',
                'Unlimited data retention'
            ]
        },
        pusherUnsubscribe: null,
        activeExplorers: [],
        activeExplorerCost: 0,
        loading: false
    }),
    mounted() {
        if (this.justUpgraded && this.userStore.plan != 'premium') {
            this.subscriptionButtonLoading = true;
            this.pusherUnsubscribe = this.$pusher.onUserUpdated((user) => {
                if (user.plan == 'premium') {
                    useUserStore().updateUser({ plan: 'premium' });
                    this.subscriptionButtonLoading = false;
                }
            }, this);
        }

        this.loading = true;
        this.$server.getExplorerBilling()
            .then(({ data: { activeExplorers, totalCost }}) => {
                this.activeExplorers = activeExplorers;
                this.activeExplorerCost = totalCost;
            })
            .catch(console.log)
            .finally(() => this.loading = false);
    },
    destroyed() {
        if (this.pusherUnsubscribe)
            this.pusherUnsubscribe();
    },
    methods: {
        openCreateExplorerModal() {
            this.$refs.createExplorerModalRef.open();
        },
        openStripePortal() {
            this.subscriptionButtonLoading = true;
            this.$server.createStripePortalSession(`http://app.${this.envStore.mainDomain}/settings?tab=billing`)
                .then(({ data }) => {
                    document.location.href = data.url
                })
                .catch(() => this.subscriptionButtonLoading = false );
        },
        subscribeToPlan() {
            this.subscriptionButtonLoading = true;
            this.$server.createStripeUserCheckoutSession()
                .then(({ data }) => {
                    document.location.href = data.url;
                })
                .catch((error) => {
                    alert('An error occured while setting up the payment processor. Please retry.')
                    console.log(error);
                })
                .finally(() => this.subscriptionButtonLoading = false);
        }
    },
    computed: {
        ...mapStores(useUserStore, useEnvStore),
        isPremium() {
            return this.userStore.plan == 'premium';
        },
        justUpgraded() {
            return this.$route.query.status == 'upgraded';
        }
    }
}
</script>
