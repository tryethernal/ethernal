<template>
    <v-card outlined :class="{ 'current-plan-card': current, 'best-value': bestValue }">
        <v-card-title>
            {{ plan.name }}
            <v-spacer></v-spacer>
            <v-chip class="ml-2" color="primary" small v-if="current">Current</v-chip>
            <v-chip class="ml-2" color="primary" small v-if="bestValue && !current">Best Value</v-chip>
        </v-card-title>
        <v-card-subtitle v-if="plan.price > 0" class="pb-0">${{ plan.price.toLocaleString() }} / month</v-card-subtitle>
        <v-card-subtitle v-else class="pb-0">Custom Pricing</v-card-subtitle>
        <v-card-text>
            <div class="mt-3 two-lines">
                {{ plan.capabilities.description }}
            </div>
            <v-list dense>
                <v-divider class="my-2"></v-divider>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon color="success">mdi-check</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content class="py-0">
                        <v-list-item-title style="font-weight: normal;">
                            <template v-if="plan.capabilities.txLimit > 0">
                                {{ plan.capabilities.txLimit.toLocaleString() }} txs / month
                                <v-tooltip left color="black">
                                    <template v-slot:activator="{ on, attrs }">
                                        <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                    </template>
                                    Extra transactions can be bought on a per-transaction pricing.
                                </v-tooltip>
                            </template>
                            <template v-else>
                                Unlimited transactions
                            </template>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon color="success">mdi-check</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            {{ plan.capabilities.dataRetention > 0 ? `${plan.capabilities.dataRetention} days` : 'Unlimited' }} Data Retention
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                <template v-if="plan.capabilities.dataRetention > 0">
                                    Your data will automatically be deleted after {{ plan.capabilities.dataRetention }} days.
                                </template>
                                <template v-else>
                                    Your data will never be deleted automatically.
                                </template>
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.customDomain)">{{ pickIcon(plan.capabilities.customDomain) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Custom Domains
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Add unlimited custom domain names to access your explorer.
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.nativeToken)">{{ pickIcon(plan.capabilities.nativeToken) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Native Token Symbol
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Display your native token symbol instead of "ether".
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.totalSupply)">{{ pickIcon(plan.capabilities.totalSupply) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Total Supply
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Display your native token total supply.
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.statusPage)">{{ pickIcon(plan.capabilities.statusPage) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Status Page
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Add a status page that displays the status (up/down) of your RPC.
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.branding)">{{ pickIcon(plan.capabilities.branding) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Whitelabeling
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Customize colors, font, banner, logo, favicons, add external links.
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon class="mr-2">
                        <v-icon :color="pickIconColor(plan.capabilities.customFields)">{{ pickIcon(plan.capabilities.customFields) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Custom Fields
                            <v-tooltip left color="black">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-icon v-bind="attrs" v-on="on" class="ml-1" small>mdi-help-circle</v-icon>
                                </template>
                                Add your own custom fields on transaction/block/logs. This is useful if you have non EVM-standard transactions or logs.
                            </v-tooltip>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-card-text>
        <v-card-actions class="justify-center">
            <template v-if="plan.price == 0">
                <v-btn outlined color="primary">
                    <a href="mailto:contact@tryethernal.com?subject=Ethernal+enterprise+plan+setup" target="_blank" style="text-decoration: none;">CONTACT US</a>
                </v-btn>
            </template>
            <template v-else>
                <v-btn :loading="loading" :disabled="disabled" v-if="current && !pendingCancelation" @click="changePlan(null)" class="error">Cancel Plan</v-btn>
                <v-btn :loading="loading" :disabled="disabled" v-else-if="current && pendingCancelation" @click="changePlan(plan.slug)" class="primary">Revert Cancelation</v-btn>
                <v-btn v-else :loading="loading" :disabled="disabled" @click="changePlan(plan.slug)" class="primary">
                    <template v-if="trial">Start 7 day Trial</template>
                    <template v-else>Choose Plan</template>
                </v-btn>
            </template>
        </v-card-actions>
    </v-card>
</template>
<script>
export default {
    name: 'ExplorerPlanCard',
    props: ['plan', 'current', 'loading', 'disabled', 'pendingCancelation', 'trial', 'bestValue'],
    methods: {
        changePlan(slug) {
            this.$emit('updatePlan', slug)
        },
        pickIcon(flag) {
            return flag ? 'mdi-check' : 'mdi-close';
        },
        pickIconColor(flag) {
            return flag ? 'success' : 'error';
        },
    }
}
</script>
<style lang="scss">
.current-plan-card, .best-value {
    border: 1px solid var(--v-primary-base) !important;
}
.two-lines {
    line-height: 1.5em;
    min-height: 3em;
}
</style>
