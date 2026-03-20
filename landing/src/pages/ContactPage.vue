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

            <div v-if="!sent" class="contact-layout mt-10">
                <!-- Left: Contact info -->
                <div class="contact-left">
                    <div class="contact-left-inner">
                        <div class="contact-label">Get in touch</div>
                        <h3 class="contact-heading">Let's talk</h3>
                        <p class="contact-desc">We'll get back to you within 24 hours.</p>

                        <div class="contact-list">
                            <div class="contact-item">
                                <div class="contact-icon">
                                    <v-icon size="18" color="#3D95CE">mdi-email-outline</v-icon>
                                </div>
                                <div>
                                    <div class="contact-type">Email</div>
                                    <a href="mailto:antoine@tryethernal.com" class="contact-value contact-link">antoine@tryethernal.com</a>
                                </div>
                            </div>
                            <div class="contact-item">
                                <div class="contact-icon">
                                    <v-icon size="18" color="#3D95CE">mdi-send</v-icon>
                                </div>
                                <div>
                                    <div class="contact-type">Telegram</div>
                                    <a href="https://t.me/antoinedc" target="_blank" rel="noopener" class="contact-value contact-link">@antoinedc</a>
                                </div>
                            </div>
                            <div class="contact-item">
                                <div class="contact-icon">
                                    <v-icon size="18" color="#3D95CE">mdi-forum-outline</v-icon>
                                </div>
                                <div>
                                    <div class="contact-type">Discord</div>
                                    <a href="https://discord.com/users/adechevigne" target="_blank" rel="noopener" class="contact-value contact-link">@adechevigne</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Form -->
                <div class="contact-right">
                    <div class="contact-form-title">Send us a message</div>

                    <v-form @submit.prevent="onSubmit" v-model="formValid">
                        <div class="field-group">
                            <label class="field-label">Point of contact</label>
                            <v-text-field
                                v-model="contact"
                                placeholder="Email, Telegram, or Discord handle"
                                variant="outlined"
                                rounded="lg"
                                density="comfortable"
                                :rules="[v => !!v || 'Required']"
                                :disabled="loading"
                                bg-color="rgba(255,255,255,0.03)"
                                hide-details="auto"
                            />
                        </div>

                        <div class="field-group">
                            <label class="field-label">Message</label>
                            <v-textarea
                                v-model="message"
                                placeholder="Tell us about your project and requirements..."
                                variant="outlined"
                                rounded="lg"
                                density="comfortable"
                                :rules="[v => !!v || 'Required']"
                                :disabled="loading"
                                rows="7"
                                bg-color="rgba(255,255,255,0.03)"
                                hide-details="auto"
                            />
                        </div>

                        <v-slide-y-transition>
                            <div v-if="errorMsg" class="error-msg">
                                <v-icon size="16" color="#EF4444">mdi-alert-circle</v-icon>
                                <span>{{ errorMsg }}</span>
                            </div>
                        </v-slide-y-transition>

                        <v-btn
                            color="#3D95CE"
                            size="large"
                            rounded="lg"
                            block
                            type="submit"
                            :loading="loading"
                            :disabled="!formValid"
                            class="submit-btn"
                        >
                            Send Message
                            <v-icon end>mdi-arrow-right</v-icon>
                        </v-btn>
                    </v-form>
                </div>
            </div>

            <!-- Confirmation state -->
            <div v-else class="contact-confirmation mt-10">
                <div class="confirmation-icon">
                    <v-icon size="32" color="#3D95CE">mdi-check</v-icon>
                </div>
                <h3 class="confirmation-title">Message sent!</h3>
                <p class="confirmation-desc">Someone will get back to you within 24 hours.</p>
                <v-btn
                    color="#3D95CE"
                    rounded="lg"
                    size="large"
                    class="reset-btn"
                    @click="reset"
                >
                    Send another message
                </v-btn>
            </div>
        </v-container>

        <LandingCTA />
    </LandingLayout>
</template>

<script setup>
import { useHead } from '@vueuse/head';
import { ref } from 'vue';
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

const contact = ref('');
const message = ref('');
const formValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const sent = ref(false);

async function onSubmit() {
    if (!formValid.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        const res = await fetch('/api/onboarding/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contact: contact.value,
                message: message.value
            })
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Failed to send message.');
        }
        sent.value = true;
        if (window.posthog) window.posthog.capture('landing:contact_submit');
    } catch (error) {
        errorMsg.value = error.message || 'Failed to send message. Please try again.';
    } finally {
        loading.value = false;
    }
}

function reset() {
    sent.value = false;
    contact.value = '';
    message.value = '';
    errorMsg.value = '';
}
</script>

<style scoped>
.page-title-bar { padding-bottom: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--drawer-divider); }

.contact-layout {
    display: flex;
    gap: 48px;
    align-items: stretch;
}

.contact-left {
    width: 340px;
    flex-shrink: 0;
    background: linear-gradient(160deg, #1a2744 0%, #0d1829 100%);
    border: 1px solid #1e293b;
    border-radius: 16px;
    display: flex;
    align-items: center;
}

.contact-left-inner {
    padding: 48px 36px;
}

.contact-label {
    font-size: 12px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
}

.contact-heading {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
}

.contact-desc {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 36px;
    line-height: 1.6;
}

.contact-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.contact-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(61, 149, 206, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.contact-type {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 1px;
}

.contact-value {
    font-size: 14px;
    color: #94a3b8;
}

.contact-link {
    text-decoration: none;
    transition: color 0.2s;
}

.contact-link:hover {
    color: #3D95CE;
}

.contact-right {
    flex: 1;
    background: var(--glass-bg);
    border: 1px solid #1e293b;
    border-radius: 16px;
    padding: 48px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.contact-form-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 28px;
}

.field-group {
    margin-bottom: 22px;
}

.field-label {
    font-size: 13px;
    color: #94a3b8;
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.error-msg {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    margin-bottom: 16px;
    color: #EF4444;
    font-size: 13px;
}

.submit-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
    max-height: 48px;
}

.contact-confirmation {
    text-align: center;
    padding: 80px 48px;
    background: var(--glass-bg);
    border: 1px solid #1e293b;
    border-radius: 16px;
    max-width: 480px;
    margin: 0 auto;
}

.confirmation-icon {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: rgba(61, 149, 206, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
}

.confirmation-title {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin: 20px 0 8px;
}

.confirmation-desc {
    font-size: 15px;
    color: #64748b;
    margin-bottom: 28px;
    line-height: 1.6;
}

.reset-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}

@media (max-width: 768px) {
    .contact-layout {
        flex-direction: column;
        gap: 24px;
    }

    .contact-left {
        width: 100%;
    }

    .contact-left-inner {
        padding: 32px 24px;
    }

    .contact-right {
        padding: 32px 24px;
    }

    .contact-confirmation {
        padding: 48px 24px;
    }
}
</style>
