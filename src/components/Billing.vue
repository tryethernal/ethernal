<template>
    <div>
        <v-alert v-if="isPremium && justUpgraded" dense text type="success">You've been successfully upgraded to the Premium plan. Thank you!</v-alert>
        <v-alert v-if="isPremium && startedTrial && formattedTrialEndsAt" dense text type="success">Your trial is now active until <b>{{ formattedTrialEndsAt }}</b>!</v-alert>
        <v-alert v-show="errorMessage" dense text type="error">{{ errorMessage }}</v-alert>
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
                            <a v-if="feature.href" :href="feature.href" target="_blank">{{ feature.message || feature }}</a>
                            <span v-else>{{ feature.message || feature }}</span>
                            <v-tooltip top>
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small v-if="feature.help">mdi-help-circle-outline</v-icon>
                                </template>
                                {{ feature.help }}
                            </v-tooltip>
                        </v-list-item>
                        <v-list-item v-for="(feature, idx) in plans.free.excludes" :key="`premium-${idx}`">
                            <v-list-item-icon class="mx-0 mr-1"><v-icon color="error">mdi-close</v-icon></v-list-item-icon>
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
                </v-card>
            </v-col>
            <v-col cols="6">
                <v-card style="height: 100%" outlined class="mb-4">
                    <v-card-title>
                        Premium Plan - $20/month
                        <v-spacer></v-spacer>
                        <small v-if="isTrialActive">Trial until {{ formattedTrialEndsAt }}</small>
                        <v-chip class="ml-2" color="primary" small v-if="isPremium">Current Plan</v-chip>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-list dense>
                        <v-list-item v-for="(feature, idx) in plans.premium.includes" :key="idx">
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
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-if="isPremium" @click="openStripePortal()">Manage Subscription</v-btn>
                        <v-btn :loading="subscriptionButtonLoading" color="primary" v-else @click="subscribeToPlan('premium')">
                            <span v-if="!hasTrialed">Start {{ trialLength }} days free trial</span>
                            <span v-else>Subscribe</span>
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-card outlined>
                    <v-card-text>
                        We also offer payments in crypto, and custom on-premise deployment support. If you are interested in that or have any other
                        questions, you can reach out to <a href="mailto:contact@tryethernal.com">contact@tryethernal.com</a> or ping @antoinedc on <a href="https://discord.gg/jEAprf45jj" target="_blank">Discord</a>.
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>
<script>
import { mapGetters } from 'vuex';
import moment from 'moment';
import { auth } from '@/plugins/firebase';

export default {
    name: 'Billing',
    data: () => ({
        errorMessage: null,
        subscriptionButtonLoading: false,
        trialStartButtonLoading: false,
        startedTrial: null,
        source: null,
        plans: {
            free: {
                includes: [
                    'Unlimited accounts / Blocks / Transactions sync',
                    'Hardhat / Ganache integration',
                    'Contract UI for read/write functions',
                    'Contract storage reading',
                    { message: '10 synced contracts', help: 'You will able to sync artifacts (abi, name, ...) for up to 10 different contracts.' },
                    '1 workspace',
                    'Community support',
                    { message: 'Transaction tracing', href: 'https://www.tryethernal.com/transaction-tracing' }
                ],
                excludes: [
                    { message: 'API access', href: 'https://doc.tryethernal.com/integrations/api' }
                ]
            },
            premium: {
                includes: [
                    'Unlimited accounts / Blocks / Transactions sync',
                    'Hardhat / Ganache integration',
                    'Contract UI for read/write functions',
                    'Contract storage reading',
                    { message: 'Unlimited synced contracts', help: 'You will able to sync artifacts for all your contracts.' },
                    'Unlimited workspaces',
                    'Advanced support',
                    { message: 'Transaction tracing', href: 'https://www.tryethernal.com/transaction-tracing' },
                    { message: 'API access', href: 'https://doc.tryethernal.com/integrations/api' }
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
            'user',
            'isTrialActive',
            'hasTrialed'
        ]),
        trialLength: function() {
            const creationTime = auth().currentUser.metadata.creationTime;

            return moment(creationTime).isBefore(moment('2021-10-18')) ? 30 : 14;
        },
        isPremium: function() {
            return this.user.plan == 'premium';
        },
        justUpgraded: function() {
            return this.$route.query.status == 'upgraded';
        },
        formattedTrialEndsAt: function() {
            return this.user.trialEndsAt && moment(this.user.trialEndsAt).format('MMM. Do');
        }
    }
}
</script>
