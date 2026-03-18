<template>
    <section class="feature-grid-section my-16">
        <h2 class="font-heading text-white mb-8" style="font-weight: 700; font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.02em;">
            Explorer Features
        </h2>
        <div class="feature-grid">
            <div v-for="(feature, i) in features" :key="i" class="feature-grid-item">
                <div class="feature-grid-icon">
                    <v-icon size="20" style="color: #5DAAE0;">{{ feature.icon }}</v-icon>
                </div>
                <div>
                    <div class="feature-grid-title">{{ feature.title }}</div>
                    <div class="feature-grid-desc">{{ feature.description }}</div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
defineProps({
    features: { type: Array, required: true }
});
</script>

<style scoped>
.feature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.feature-grid-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}
.feature-grid-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(61, 149, 206, 0.1);
    border: 1px solid rgba(61, 149, 206, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.feature-grid-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}
.feature-grid-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
    margin-top: 2px;
}
@media (max-width: 600px) {
    .feature-grid { grid-template-columns: 1fr; }
}
</style>
