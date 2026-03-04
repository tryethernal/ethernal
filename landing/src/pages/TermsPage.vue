<template>
    <LandingLayout>
        <div class="page-hero" style="padding-bottom: 40px;">
            <v-container style="max-width: 1200px;">
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.02em;">Terms of Service</h1>
                <p class="text-body-1" style="color: #94A3B8;">Last updated: March 2026</p>
            </v-container>
        </div>

        <section class="py-12">
            <v-container style="max-width: 800px;">
                <div class="legal-content">
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using the Ethernal service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
                    <p>Ethernal is operated by Antoine Rachez ("we," "us," or "our"). The Service is available at app.tryethernal.com and through self-hosted installations.</p>

                    <h2>2. Description of Service</h2>
                    <p>Ethernal provides a block explorer for EVM-compatible blockchains. The Service includes:</p>
                    <ul>
                        <li>Hosted block explorers at app.tryethernal.com</li>
                        <li>Public-facing explorers on custom domains</li>
                        <li>Self-hosted installations via open-source code</li>
                        <li>API access for programmatic interaction</li>
                    </ul>

                    <h2>3. Accounts</h2>
                    <p>You must create an account to use the hosted Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                    <p>You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.</p>

                    <h2>4. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use the Service for any unlawful purpose</li>
                        <li>Attempt to gain unauthorized access to the Service or its related systems</li>
                        <li>Interfere with or disrupt the integrity or performance of the Service</li>
                        <li>Use the Service to index or display content that is illegal, harmful, or infringes on third-party rights</li>
                        <li>Resell the Service without our prior written consent</li>
                    </ul>

                    <h2>5. Subscriptions and Billing</h2>
                    <p>Some features of the Service require a paid subscription. Subscriptions are billed in advance on a monthly basis. You may cancel your subscription at any time, and the cancellation will take effect at the end of the current billing period.</p>
                    <p>We reserve the right to change subscription fees with 30 days' notice. All fees are non-refundable except as required by law.</p>

                    <h2>6. Free Trial</h2>
                    <p>New public explorer subscriptions include a 7-day free trial. You will not be charged during the trial period. If you do not cancel before the trial ends, your subscription will begin and you will be charged.</p>

                    <h2>7. Data and Content</h2>
                    <p>The blockchain data indexed by the Service is publicly available on the respective blockchain networks. We do not claim ownership of blockchain data.</p>
                    <p>You retain ownership of any custom branding, configuration, or content you upload to the Service.</p>

                    <h2>8. Open Source License</h2>
                    <p>The Ethernal software is available under the MIT License. These Terms govern use of the hosted Service at app.tryethernal.com, not self-hosted installations which are governed by the MIT License.</p>

                    <h2>9. Service Availability</h2>
                    <p>We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform maintenance, updates, or experience downtime. We will make reasonable efforts to notify users of planned maintenance.</p>

                    <h2>10. Limitation of Liability</h2>
                    <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.</p>

                    <h2>11. Termination</h2>
                    <p>We may terminate or suspend your account at any time for violation of these Terms. You may terminate your account at any time by contacting us. Upon termination, your right to use the Service will cease immediately.</p>

                    <h2>12. Changes to Terms</h2>
                    <p>We may modify these Terms at any time. We will notify users of material changes by email or through the Service. Your continued use of the Service after changes take effect constitutes acceptance of the new Terms.</p>

                    <h2>13. Governing Law</h2>
                    <p>These Terms are governed by the laws of France. Any disputes arising from these Terms shall be resolved in the courts of Paris, France.</p>

                    <h2>14. Contact</h2>
                    <p>For questions about these Terms, contact us at <a href="mailto:contact@tryethernal.com">contact@tryethernal.com</a>.</p>
                </div>
            </v-container>
        </section>
    </LandingLayout>
</template>

<script setup>
import LandingLayout from '@/components/LandingLayout.vue';
</script>

<style scoped>
.legal-content h2 {
    font-family: 'Exo', sans-serif;
    font-weight: 600;
    font-size: 1.3rem;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: #F1F5F9;
}
.legal-content p {
    color: #94A3B8;
    line-height: 1.7;
    margin-bottom: 1rem;
}
.legal-content ul {
    color: #94A3B8;
    margin-bottom: 1rem;
    padding-left: 1.5rem;
}
.legal-content li {
    margin-bottom: 0.4rem;
    line-height: 1.6;
}
.legal-content a {
    color: #5DAAE0;
}
</style>
