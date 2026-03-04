<template>
    <div
        class="pricing-card h-100 d-flex flex-column"
        :class="{
            'pricing-highlighted': highlighted,
            'pricing-default': !highlighted
        }"
    >
        <div v-if="highlighted" class="pricing-badge">Most Popular</div>

        <div class="pa-7 d-flex flex-column flex-grow-1">
            <div class="plan-name" :class="{ 'text-primary-plan': highlighted }">{{ name }}</div>

            <div class="d-flex align-baseline mb-1 mt-3">
                <template v-if="price === 'Custom'">
                    <span class="plan-price">Custom</span>
                </template>
                <template v-else-if="price === 0">
                    <span class="plan-price">$0</span>
                    <span class="ml-1" style="color: #64748B; font-size: 15px; font-weight: 500;">/month</span>
                </template>
                <template v-else>
                    <span class="plan-price">${{ price }}</span>
                    <span class="ml-1" style="color: #64748B; font-size: 15px; font-weight: 500;">/month</span>
                </template>
            </div>

            <p style="color: #64748B; font-size: 14px; min-height: 40px;" class="mb-6 mt-2">{{ subtitle }}</p>

            <div v-if="quota" class="quota-pill mb-5">
                <v-icon size="14" class="mr-1" style="color: #5DAAE0;">mdi-database-outline</v-icon>
                {{ quota }}
            </div>

            <div>
                <div
                    v-for="feature in features"
                    :key="feature"
                    class="d-flex align-start mb-3"
                >
                    <v-icon size="18" class="mr-3 mt-0 flex-shrink-0" style="color: #22C55E;">mdi-check-circle</v-icon>
                    <span style="color: #CBD5E1; font-size: 14px;">{{ feature }}</span>
                </div>
            </div>

            <div class="flex-grow-1"></div>

            <v-btn
                :class="highlighted ? 'btn-primary' : 'btn-outline'"
                block
                class="mt-6 pricing-cta"
                :href="ctaUrl"
                rounded="xl"
            >
                {{ ctaText }}
            </v-btn>
        </div>
    </div>
</template>

<script setup>
defineProps({
    name: { type: String, required: true },
    price: { type: [Number, String], required: true },
    subtitle: { type: String, default: '' },
    features: { type: Array, default: () => [] },
    quota: { type: String, default: '' },
    highlighted: { type: Boolean, default: false },
    ctaText: { type: String, default: 'Get Started' },
    ctaUrl: { type: String, default: 'https://app.tryethernal.com/auth' }
});
</script>

<style scoped>
.pricing-card {
    position: relative;
    border-radius: 16px;
    transition: border-color 0.3s, transform 0.3s;
}

.pricing-default {
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(61, 149, 206, 0.22);
}

.pricing-default:hover {
    border-color: rgba(61, 149, 206, 0.35);
}

.pricing-highlighted {
    background: rgba(17, 24, 39, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(61, 149, 206, 0.4);
    box-shadow: 0 0 40px rgba(61, 149, 206, 0.12), 0 4px 24px rgba(0, 0, 0, 0.3);
}

.pricing-badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, #3D95CE, #5DAAE0);
    color: white;
    padding: 5px 18px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: 0 4px 12px rgba(61, 149, 206, 0.3);
}

.plan-name {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748B;
}

.text-primary-plan {
    color: #5DAAE0;
}

.plan-price {
    font-size: 2.4rem;
    font-weight: 900;
    color: #F1F5F9;
    letter-spacing: -0.02em;
    line-height: 1;
}

.quota-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 8px;
    background: rgba(61, 149, 206, 0.08);
    border: 1px solid rgba(61, 149, 206, 0.18);
    color: #CBD5E1;
    font-size: 13px;
    font-weight: 600;
}

.pricing-cta {
    height: 44px !important;
    min-height: 44px !important;
    max-height: 44px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px !important;
}
</style>
