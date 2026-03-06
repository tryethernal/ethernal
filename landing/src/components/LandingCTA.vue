<template>
    <section class="cta-section">
        <div class="cta-glow"></div>
        <v-container style="max-width: 800px; position: relative; z-index: 1;" class="text-center">
            <h2 class="font-heading mb-5" style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; color: #F1F5F9; letter-spacing: -0.02em;">
                Ready to launch your explorer?
            </h2>
            <p class="mb-10" style="color: #94A3B8; max-width: 520px; margin: 0 auto; line-height: 1.7; font-size: 1.1rem;">
                Deploy a fully-featured block explorer for your EVM chain in under 5 minutes. No credit card required.
            </p>
            <div class="d-flex justify-center ga-4 flex-wrap">
                <v-btn
                    size="x-large"
                    class="btn-primary cta-btn"
                    href="https://app.tryethernal.com/auth"
                    rounded="xl"
                >
                    Get Started Free
                    <v-icon end size="18">mdi-arrow-right</v-icon>
                </v-btn>
                <v-btn
                    size="x-large"
                    class="btn-outline cta-btn"
                    href="https://doc.tryethernal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    rounded="xl"
                >
                    Read the Docs
                </v-btn>
            </div>
        </v-container>
    </section>
</template>

<script setup>
</script>

<style scoped>
.cta-section {
    padding: 120px 0;
    position: relative;
    overflow: hidden;
    border-top: 1px solid rgba(61, 149, 206, 0.08);
}

.cta-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 700px;
    height: 500px;
    background: radial-gradient(circle at center, rgba(61, 149, 206, 0.15) 0%, transparent 60%);
    pointer-events: none;
}

.cta-btn {
    padding: 14px 32px !important;
    font-size: 16px !important;
    height: auto !important;
    min-height: 56px !important;
}
</style>
