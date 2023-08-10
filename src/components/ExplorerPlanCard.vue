<template>
    <v-card outlined :class="{ 'current-plan-card': current }">
        <v-card-title>
            {{ plan.name }}
            <v-spacer></v-spacer>
            <v-chip class="ml-2" color="primary" small v-if="current">Current</v-chip>
        </v-card-title>
        <v-card-subtitle class="pb-0">${{ plan.price.toLocaleString() }} / month</v-card-subtitle>
        <v-card-text>
            <v-list dense disabled>
                <v-list-item>
                    <v-list-item-content class="py-0">
                        <v-list-item-title style="font-weight: normal;">
                            {{ plan.capabilities.txLimit.toLocaleString() }} txs / month
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Data Retention: {{ plan.capabilities.dataRetention > 0 ? `${plan.capabilities.dataRetention} days` : 'Unlimited' }}
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon>
                        <v-icon :color="pickIconColor(plan.capabilities.customDomain)">{{ pickIcon(plan.capabilities.customDomain) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">Custom Domain</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon>
                        <v-icon :color="pickIconColor(plan.capabilities.nativeToken)">{{ pickIcon(plan.capabilities.nativeToken) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Native Token
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon>
                        <v-icon :color="pickIconColor(plan.capabilities.totalSupply)">{{ pickIcon(plan.capabilities.totalSupply) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Total Supply
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon>
                        <v-icon :color="pickIconColor(plan.capabilities.statusPage)">{{ pickIcon(plan.capabilities.statusPage) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Status Page
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item>
                    <v-list-item-icon>
                        <v-icon :color="pickIconColor(plan.capabilities.branding)">{{ pickIcon(plan.capabilities.branding) }}</v-icon>
                    </v-list-item-icon>
                    <v-list-item-content>
                        <v-list-item-title style="font-weight: normal;">
                            Branding
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-card-text>
        <v-card-actions class="justify-center">
            <v-btn :loading="loading" :disabled="disabled" v-if="current && !pendingCancelation" @click="changePlan(null)" class="error">Cancel Plan</v-btn>
            <v-btn :loading="loading" :disabled="disabled" v-else-if="current && pendingCancelation" @click="changePlan(plan.slug)" class="primary">Revert Cancelation</v-btn>
            <v-btn v-else :loading="loading" :disabled="disabled" @click="changePlan(plan.slug)" class="primary">Choose Plan</v-btn>
        </v-card-actions>
    </v-card>
</template>
<script>
export default {
    name: 'ExplorerPlanCard',
    props: ['plan', 'current', 'loading', 'disabled', 'pendingCancelation'],
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
.current-plan-card {
    border: 1px solid var(--v-primary-base) !important;
}
</style>
