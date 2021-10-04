<template>
    <div>
        <v-row v-if="isPremium && justUpgraded" class="justify-center">
            <v-col cols="6">
                <v-alert dense text type="success">You've been successfully upgraded to the Premium plan. Thank you!</v-alert>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="6">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Free Plan
                        <v-spacer></v-spacer>
                        <v-chip class="ml-2" color="primary" small v-if="!isPremium">Current Plan</v-chip>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.free.includes" :key="`free-${idx}`">
                            <v-list-item-icon class="mx-0 mr-1"><v-icon color="success">mdi-check</v-icon></v-list-item-icon>
                            {{ feature.message || feature }}
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                        <v-list-item v-for="(feature, idx) in plans.free.excludes" :key="`premium-${idx}`">
                            <v-list-item-icon class="mx-0 mr-1"><v-icon color="error">mdi-close</v-icon></v-list-item-icon>
                            {{ feature.message || feature }}
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                    </v-list>
                </v-card>
            </v-col>
            <v-col cols="6">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Premium Plan - $20/month
                        <v-spacer></v-spacer>
                        <v-chip class="ml-2" color="primary" small v-if="isPremium">Current Plan</v-chip>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.premium.includes" :key="idx">
                            <v-list-item-icon class="mx-0 mr-1"><v-icon color="success">mdi-check</v-icon></v-list-item-icon>
                            {{ feature.message || feature }}
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                    </v-list>
                    <v-card-actions class="justify-center">
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-if="isPremium" @click="openStripePortal()">Manage Subscription</v-btn>
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-else @click="subscribeToPlan('premium')">Subscribe</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
export default {
    name: 'Billing',
    data: () => ({
        subscriptionButtonLoading: false,
        plans: {
            free: {
                includes: [
                    'Unlimited accounts / Blocks / Transactions sync',
                    'Hardhat / Ganache integration',
                    'Contract UI for read/write functions',
                    'Contract storage reading',
                    { message: '10 decoded contracts', help: 'You will able to sync artifacts (abi, name, ...) for up to 10 different contracts.' },
                    '1 workspace',
                    'Community support'
                ],
                excludes: [
                    'Transaction tracing',
                    'API access'
                ]
            },
            premium: {
                includes: [
                    'Unlimited accounts / Blocks / Transactions sync',
                    'Hardhat / Ganache integration',
                    'Contract UI for read/write functions',
                    'Contract storage reading',
                    { message: 'Unlimited decoded contracts', help: 'You will able to sync artifacts for all your contracts.' },
                    'Unlimited workspaces',
                    'Advanced support',
                    'Transaction tracing',
                    'API access'
                ],
                excludes: []
            }
        }
    }),
    methods: {
        openStripePortal: function() {
            this.subscriptionButtonLoading = true;
            this.server.createStripePortalSession().then(({ data }) => {
                document.location.href = data.url;
            })
            .catch(() => this.subscriptionButtonLoading = false );
        },
        subscribeToPlan: function(plan) {
            this.subscriptionButtonLoading = true;
            this.server.createStripeCheckoutSession(plan)
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
        ...mapGetters([
            'user'
        ]),
        isPremium: function() {
            return this.user.plan == 'premium';
        },
        justUpgraded: function() {
            return this.$route.query.status == 'upgraded';
        }
    }
}
</script>
