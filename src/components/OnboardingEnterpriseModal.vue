<!--
    @fileoverview Enterprise contact modal for onboarding wizard.
    Two-column layout: contact info on left, form on right.
    @component OnboardingEnterpriseModal
    @prop {string} explorerName - Explorer name from onboarding context
    @prop {string} rpcServer - RPC URL from onboarding context
    @prop {string} email - Signup email from onboarding context
-->
<template>
    <v-dialog v-model="dialog" max-width="540" scrim="black" class="enterprise-modal-overlay">
        <div class="enterprise-modal">
            <!-- Form state -->
            <div v-if="!sent" class="enterprise-modal-layout">
                <!-- Left: Contact info -->
                <div class="enterprise-left">
                    <div class="enterprise-label">Get in touch</div>
                    <h3 class="enterprise-heading">Let's talk</h3>
                    <p class="enterprise-desc">We'll get back to you within 24 hours.</p>

                    <div class="contact-list">
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-email-outline</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Email</div>
                                <div class="contact-value">antoine@tryethernal.com</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-send</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Telegram</div>
                                <div class="contact-value">@antoinedc</div>
                            </div>
                        </div>
                        <div class="contact-item">
                            <div class="contact-icon">
                                <v-icon size="16" color="#3D95CE">mdi-forum-outline</v-icon>
                            </div>
                            <div>
                                <div class="contact-type">Discord</div>
                                <div class="contact-value">@adechevigne</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Form -->
                <div class="enterprise-right">
                    <div class="enterprise-form-title">Send us a message</div>

                    <v-form @submit.prevent="submit" v-model="formValid">
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
                                rows="3"
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
            <div v-else class="enterprise-confirmation">
                <v-icon size="48" color="#22C55E">mdi-check-circle</v-icon>
                <h3 class="confirmation-title">Message sent!</h3>
                <p class="confirmation-desc">Someone will get back to you within 24 hours.</p>
                <v-btn
                    variant="outlined"
                    color="#64748b"
                    rounded="lg"
                    block
                    class="close-btn"
                    @click="close"
                >
                    Close
                </v-btn>
            </div>
        </div>
    </v-dialog>
</template>

<script setup>
import { ref, inject } from 'vue';

const props = defineProps({
    explorerName: { type: String, default: '' },
    rpcServer: { type: String, default: '' },
    email: { type: String, default: '' }
});

const $server = inject('$server');

const dialog = ref(false);
const contact = ref('');
const message = ref('');
const formValid = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const sent = ref(false);

function open() {
    dialog.value = true;
    sent.value = false;
    contact.value = '';
    message.value = '';
    errorMsg.value = '';
}

function close() {
    dialog.value = false;
}

async function submit() {
    if (!formValid.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        await $server.onboardingContact({
            contact: contact.value,
            message: message.value,
            explorerName: props.explorerName,
            rpcServer: props.rpcServer,
            email: props.email
        });
        sent.value = true;
    } catch (error) {
        errorMsg.value = error.response?.data || 'Failed to send message. Please try again.';
    } finally {
        loading.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped>
.enterprise-modal {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
}

.enterprise-modal-layout {
    display: flex;
    min-height: 380px;
}

/* Left column */
.enterprise-left {
    width: 40%;
    padding: 32px 24px;
    background: linear-gradient(160deg, #1a2744 0%, #0d1829 100%);
    border-right: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.enterprise-label {
    font-size: 11px;
    color: #3D95CE;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
}

.enterprise-heading {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
}

.enterprise-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
}

.contact-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.contact-item {
    display: flex;
    align-items: center;
    gap: 10px;
}

.contact-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(61, 149, 206, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.contact-type {
    font-size: 11px;
    color: #64748b;
}

.contact-value {
    font-size: 13px;
    color: #94a3b8;
}

/* Right column */
.enterprise-right {
    flex: 1;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.enterprise-form-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 20px;
}

.field-group {
    margin-bottom: 16px;
}

.field-label {
    font-size: 12px;
    color: #94a3b8;
    display: block;
    margin-bottom: 6px;
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

/* Confirmation state */
.enterprise-confirmation {
    padding: 48px 32px;
    text-align: center;
}

.confirmation-title {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 16px 0 8px;
}

.confirmation-desc {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 24px;
    line-height: 1.6;
}

.close-btn {
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
}

:deep(.v-field__input) {
    color: #fff !important;
}
</style>

<style>
.enterprise-modal-overlay .v-overlay__scrim {
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    opacity: 0.75 !important;
}
</style>
