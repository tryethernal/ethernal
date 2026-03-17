<template>
    <LandingLayout>
        <v-container style="max-width: 1200px; padding-top: 100px; padding-bottom: 60px;">
            <div class="page-title-bar">
                <div class="text-overline mb-1" style="letter-spacing: 0.1em; color: #5DAAE0; font-size: 11px;">CONTACT</div>
                <h1 class="font-heading text-white mb-2" style="font-weight: 700; font-size: clamp(1.5rem, 3vw, 2.2rem); letter-spacing: -0.02em;">Contact Us</h1>
                <p style="color: var(--text-secondary); max-width: 500px; line-height: 1.6; font-size: 0.95rem;">
                    Have a question or need a custom solution? We'd love to hear from you.
                </p>
            </div>

            <v-row class="mt-8">
                <v-col cols="12" md="7">
                    <div class="contact-card">
                        <v-form @submit.prevent="onSubmit" v-model="valid">
                            <v-text-field
                                v-model="form.email"
                                label="Email"
                                type="email"
                                :rules="[v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
                                class="mb-2"
                                variant="outlined"
                                bg-color="transparent"
                                base-color="#334155"
                                color="#5DAAE0"
                                density="comfortable"
                            />
                            <v-text-field
                                v-model="form.subject"
                                label="Subject"
                                :rules="[v => !!v || 'Required']"
                                class="mb-2"
                                variant="outlined"
                                bg-color="transparent"
                                base-color="#334155"
                                color="#5DAAE0"
                                density="comfortable"
                            />
                            <v-textarea
                                v-model="form.message"
                                label="Message"
                                :rules="[v => !!v || 'Required']"
                                rows="5"
                                class="mb-4"
                                variant="outlined"
                                bg-color="transparent"
                                base-color="#334155"
                                color="#5DAAE0"
                                density="comfortable"
                            />
                            <v-btn
                                type="submit"
                                block
                                :disabled="!valid || loading"
                                :loading="loading"
                                rounded="lg"
                                class="btn-primary contact-submit"
                            >
                                Send Message
                            </v-btn>
                            <div v-if="success" class="text-success text-center mt-4" style="font-size: 14px;">
                                <v-icon class="mr-1" size="18">mdi-check-circle</v-icon>
                                Message sent! We'll get back to you soon.
                            </div>
                        </v-form>
                    </div>
                </v-col>
                <v-col cols="12" md="5">
                    <div class="contact-info">
                        <div class="contact-info-item">
                            <v-icon size="20" color="#5DAAE0" class="mr-3">mdi-email-outline</v-icon>
                            <div>
                                <div class="contact-info-label">Email</div>
                                <a href="mailto:contact@tryethernal.com" class="contact-info-value">contact@tryethernal.com</a>
                            </div>
                        </div>
                        <div class="contact-info-item">
                            <v-icon size="20" color="#5DAAE0" class="mr-3">mdi-forum-outline</v-icon>
                            <div>
                                <div class="contact-info-label">Discord</div>
                                <a href="https://discord.gg/jYCER6Mh" target="_blank" rel="noopener noreferrer" class="contact-info-value">Join our community</a>
                            </div>
                        </div>
                        <div class="contact-info-item">
                            <v-icon size="20" color="#5DAAE0" class="mr-3">mdi-book-open-variant</v-icon>
                            <div>
                                <div class="contact-info-label">Documentation</div>
                                <a href="https://doc.tryethernal.com" target="_blank" rel="noopener noreferrer" class="contact-info-value">doc.tryethernal.com</a>
                            </div>
                        </div>
                        <div class="contact-info-item">
                            <v-icon size="20" color="#5DAAE0" class="mr-3">mdi-github</v-icon>
                            <div>
                                <div class="contact-info-label">GitHub</div>
                                <a href="https://github.com/tryethernal/ethernal" target="_blank" rel="noopener noreferrer" class="contact-info-value">tryethernal/ethernal</a>
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import { ref, reactive } from 'vue';
import LandingLayout from '@/components/LandingLayout.vue';
import LandingCTA from '@/components/LandingCTA.vue';

useHead({
    title: 'Contact Us — Ethernal',
    meta: [
        { name: 'description', content: 'Get in touch with the Ethernal team for enterprise inquiries, partnerships, or support.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Contact Us — Ethernal' },
        { property: 'og:description', content: 'Get in touch with the Ethernal team for enterprise inquiries, partnerships, or support.' },
        { property: 'og:url', content: 'https://tryethernal.com/contact-us' },
        { property: 'og:image', content: 'https://tryethernal.com/images/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
    ],
    link: [
        { rel: 'canonical', href: 'https://tryethernal.com/contact-us' }
    ]
});

const valid = ref(false);
const loading = ref(false);
const success = ref(false);

const form = reactive({
    email: '',
    subject: '',
    message: ''
});

async function onSubmit() {
    if (!valid.value) return;
    loading.value = true;
    try {
        const res = await fetch(`${import.meta.env.VITE_APP_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: form })
        });
        if (!res.ok) throw new Error('Server error');
        success.value = true;
        if (window.posthog) window.posthog.capture('landing:contact_submit', { subject: form.subject });
    } catch {
        alert('Error sending message. Please email us directly at contact@tryethernal.com');
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }

.contact-card {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 32px;
}

.contact-submit {
    height: 48px !important;
    font-size: 15px !important;
    font-weight: 600 !important;
}

.contact-info {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 16px 0 16px 16px;
}

.contact-info-item {
    display: flex;
    align-items: flex-start;
}

.contact-info-label {
    color: var(--text-muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
}

.contact-info-value {
    color: var(--text-primary);
    font-size: 14px;
    text-decoration: none;
    transition: color 0.2s;
}

.contact-info-value:hover {
    color: #5DAAE0;
}
</style>
