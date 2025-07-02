<template>
    <v-card :class="{ 'current-plan-card': current, 'best-value': bestValue }">
        <v-card-title class="d-flex justify-space-between align-center">
            {{ plan.name }}
            <v-chip class="ml-2" color="primary" size="small" v-if="current">Current</v-chip>
            <v-chip class="ml-2" color="primary" size="small" v-if="bestValue && !current">Best Value</v-chip>
        </v-card-title>
        <v-card-subtitle v-if="plan.price > 0" class="pb-0">${{ plan.price.toLocaleString() }} / month</v-card-subtitle>
        <v-card-subtitle v-else-if="plan.price == 0" class="pb-0">Free</v-card-subtitle>
        <v-card-subtitle v-else class="pb-0">Custom Pricing</v-card-subtitle>
        <v-card-text>
            <div class="mt-3 two-lines" style="height: 4.5em;">
                {{ plan.capabilities.description }}
            </div>
            <v-list density="compact">
                <v-divider class="my-2"></v-divider>
                <v-list-item icon class="mr-2">
                    <template v-slot:prepend>
                        <v-icon color="success" class="font-weight-bold">mdi-check</v-icon>
                    </template>
                    <template v-slot:title>
                        <template v-if="plan.capabilities.txLimit > 0">
                            {{ plan.capabilities.txLimit.toLocaleString() }} txs / month
                            <v-tooltip location="left" color="black">
                                <template v-slot:activator="{ props }">
                                    <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                                </template>
                                Extra transactions can be bought on a per-transaction pricing.
                            </v-tooltip>
                        </template>
                        <template v-else>
                            Unlimited transactions
                        </template>
                    </template>
                </v-list-item>

                <v-list-item icon class="mr-2">
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.customDomain)">{{ pickIcon(plan.capabilities.customDomain) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Custom Domains
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Add unlimited custom domain names to access your explorer.
                        </v-tooltip>
                    </template>
                </v-list-item>

                <v-list-item>
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.nativeToken)">{{ pickIcon(plan.capabilities.nativeToken) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Native Token Symbol
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Display your native token symbol instead of "ether".
                        </v-tooltip>
                    </template>
                </v-list-item>

                <v-list-item>
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.totalSupply)">{{ pickIcon(plan.capabilities.totalSupply) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Total Supply
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Display your native token total supply.
                        </v-tooltip>
                    </template>
                </v-list-item>

                <v-list-item>
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.statusPage)">{{ pickIcon(plan.capabilities.statusPage) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Status Page
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Add a status page that displays the status (up/down) of your RPC.
                        </v-tooltip>
                    </template>
                </v-list-item>

                <v-list-item>
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.branding)">{{ pickIcon(plan.capabilities.branding) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Whitelabeling
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Customize colors, font, banner, logo, favicons, add external links.
                        </v-tooltip>
                    </template>
                </v-list-item>

                <v-list-item>
                    <template v-slot:prepend>
                        <v-icon :color="pickIconColor(plan.capabilities.customFields)">{{ pickIcon(plan.capabilities.customFields) }}</v-icon>
                    </template>
                    <template v-slot:title>
                        Custom Fields
                        <v-tooltip location="left" color="black">
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" class="ml-1" size="small">mdi-help-circle</v-icon>
                            </template>
                            Add your own custom fields on transaction/block/logs. This is useful if you have non EVM-standard transactions or logs.
                        </v-tooltip>
                    </template>
                </v-list-item>

            </v-list>
        </v-card-text>
        <v-card-actions class="justify-center">
            <template v-if="plan.price == null">
                <v-btn variant="outlined" color="primary">
                    <a href="mailto:contact@tryethernal.com?subject=Ethernal+enterprise+plan+setup" target="_blank" style="text-decoration: none;">CONTACT US</a>
                </v-btn>
            </template>
            <template v-else>
                <v-btn variant="flat" :loading="loading" :disabled="disabled" v-if="current && !pendingCancelation" @click="changePlan(null)" class="bg-error">Cancel Plan</v-btn>
                <v-btn variant="flat" :loading="loading" :disabled="disabled" v-else-if="current && pendingCancelation" @click="changePlan(plan.slug)" class="bg-primary">Revert Cancelation</v-btn>
                <v-btn variant="flat" v-else :loading="loading" :disabled="disabled" @click="changePlan(plan.slug)" class="bg-primary">
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
<style scoped lang="scss">
.current-plan-card, .best-value {
    border: 1px solid rgb(var(--v-theme-primary)) !important;
}
.two-lines {
    line-height: 1.5em;
    min-height: 3em;
}

.v-list-item__prepend > .v-icon {
    opacity: 1;
}
</style>
