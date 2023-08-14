<template>
    <div>
        <v-alert v-if="!isPremium && justUpgraded" dense text type="success">You've been successfully upgraded to the Premium plan. It is currently being activated, and should be ready in about a minute. Thank you!</v-alert>
        <v-alert v-if="isPremium && justUpgraded" dense text type="success">Your Premium plan is now ready!</v-alert>
        <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
        <v-row>
            <v-col cols="4">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Free Plan
                        <v-spacer></v-spacer>
                        <v-chip class="ml-2" color="primary" small v-if="!isPremium">Current Plan</v-chip>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.free" :key="`free-${idx}`">
                            <v-list-item-icon v-if="feature" class="mx-0 mr-1"><v-icon color="success">mdi-check</v-icon></v-list-item-icon>
                            {{ feature }}
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
            <v-col cols="4">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Premium Plan - $20/month
                        <v-spacer></v-spacer>
                        <v-chip class="ml-2" color="primary" small v-if="isPremium">Current Plan</v-chip>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.premium" :key="idx">
                            <v-list-item-icon v-if="feature" class="mx-0 mr-1"><v-icon color="success">mdi-check</v-icon></v-list-item-icon>
                            {{ feature }}
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                    </v-list>
                    <v-card-actions class="justify-center d-flex flex-column">
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-if="isPremium" @click="openStripePortal()">Manage Subscription</v-btn>
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-else @click="subscribeToPlan()">Subscribe</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
            <v-col cols="4">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Custom Plan
                        <v-spacer></v-spacer>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.custom" :key="`free-${idx}`">
                            <v-list-item-icon class="mx-0 mr-1"><v-icon color="success">mdi-check</v-icon></v-list-item-icon>
                            <a v-if="feature.href" :href="feature.href" target="_blank">{{ feature.message || feature }}</a>
                            <span v-else>{{ feature.message || feature }}</span>
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                    </v-list>
                    <v-card-actions class="justify-center d-flex flex-column">
                        <v-btn color="primary" :href="'mailto:contact@tryethernal.com?subject=Custom+Ethernal+Subscription'" :target="'blank'">Contact Us</v-btn>
                        <small>Or ping @antoinedc on <a href="https://discord.gg/jEAprf45jj" target="_blank">Discord</a></small>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-card outlined>
                    <v-card-text>
                        All plans include unlimited blocks/transactions/accounts synchronization, Ganache/Hardhat/Brownie integration, and all Ethernal features.
                    </v-card-text>
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
            ],
            custom: [
                'Custom team pricing (starting at 5 seats)',
                'Custom on-premise deployment',
                'Payment in crypto'
            ]
        },
        pusherUnsubscribe: null
    }),
    mounted() {
        if (this.justUpgraded && this.user.plan != 'premium') {
            this.subscriptionButtonLoading = true;
            this.pusherUnsubscribe = this.pusher.onUserUpdated((user) => {
                if (user.plan == 'premium') {
                    this.$store.dispatch('updateUserPlan', { plan: 'premium' });
                    this.subscriptionButtonLoading = false;
                }
            }, this);
        }
    },
    destroyed() {
        if (this.pusherUnsubscribe)
            this.pusherUnsubscribe();
    },
    methods: {
        openStripePortal() {
            this.subscriptionButtonLoading = true;
            this.server.createStripePortalSession(`http://app.${this.mainDomain}/settings?tab=billing`)
                .then(({ data }) => {
                    document.location.href = data.url
                })
                .catch(() => this.subscriptionButtonLoading = false );
        },
        subscribeToPlan() {
            this.subscriptionButtonLoading = true;
            this.server.createStripeUserCheckoutSession()
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
            'user',
            'mainDomain'
        ]),
        isPremium() {
            return this.user.plan == 'premium';
        },
        justUpgraded() {
            return this.$route.query.status == 'upgraded';
        }
    }
}
</script>
