<template>
    <section class="landing-section">
        <v-container style="max-width: 1200px;">
            <div class="text-center mb-14" style="max-width: 700px; margin: 0 auto;">
                <h2 class="font-heading mb-4" style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; color: #F1F5F9; letter-spacing: -0.02em;">
                    Trusted by <span class="gradient-text">teams building on EVM</span>
                </h2>
                <p style="color: #94A3B8; max-width: 560px; margin: 0 auto; line-height: 1.7; font-size: 1.05rem;">
                    See how organizations are using Ethernal to power their blockchain infrastructure.
                </p>
            </div>

            <v-row>
                <v-col
                    v-for="testimonial in testimonials"
                    :key="testimonial.name"
                    cols="12"
                    md="4"
                >
                    <div class="testimonial-card">
                        <p class="testimonial-quote">
                            "{{ testimonial.quote }}"
                        </p>
                        <div class="d-flex align-center ga-4 mt-auto">
                            <div
                                class="testimonial-avatar"
                                :aria-label="testimonial.name"
                            >{{ testimonial.initials }}</div>
                            <div>
                                <div style="color: #F1F5F9; font-size: 15px; font-weight: 600;">{{ testimonial.name }}</div>
                                <div style="color: #64748B; font-size: 13px;">{{ testimonial.role }}</div>
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>
    </section>
</template>

<script setup>
const testimonials = [
    {
        quote: 'Ethernal is exactly what we needed for our L2. Set up took 10 minutes and our community had a fully branded explorer the same day.',
        name: 'Alex C.',
        role: 'CTO, DeFi Protocol',
        initials: 'AC'
    },
    {
        quote: 'We replaced our custom-built explorer with Ethernal. The transaction tracing alone saved our team hours of debugging every week.',
        name: 'Sarah K.',
        role: 'Lead Engineer, Web3 Startup',
        initials: 'SK'
    },
    {
        quote: 'The self-hosted option was the deciding factor. We run it on our own infra with Docker and have full control over our data.',
        name: 'James P.',
        role: 'DevOps, Enterprise Chain',
        initials: 'JP'
    }
];
</script>

<style scoped>
.testimonial-card {
    background: rgba(17, 24, 39, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(61, 149, 206, 0.22);
    border-radius: 16px;
    padding: 32px;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
    transition: border-color 0.3s;
}

.testimonial-card:hover {
    border-color: rgba(61, 149, 206, 0.3);
}

.testimonial-quote {
    color: #CBD5E1;
    font-size: 15px;
    line-height: 1.75;
    font-style: italic;
    flex-grow: 1;
    margin: 0;
}

.testimonial-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
    border: 2px solid rgba(61, 149, 206, 0.22);
    background: linear-gradient(135deg, #3D95CE, #5DAAE0);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.5px;
}
</style>
