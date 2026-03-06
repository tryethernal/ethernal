<template>
    <LandingLayout>
        <div class="page-hero" style="padding-bottom: 40px;">
            <v-container style="max-width: 1200px;">
                <h1 class="font-heading text-white mb-3" style="font-weight: 700; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -0.02em;">Privacy Policy</h1>
                <p class="text-body-1" style="color: #94A3B8;">Last updated: March 2026</p>
            </v-container>
        </div>

        <section class="py-12">
            <v-container style="max-width: 800px;">
                <div class="legal-content">
                    <h2>1. Introduction</h2>
                    <p>This Privacy Policy explains how Ethernal, operated by Antoine Rachez ("we," "us," or "our"), collects, uses, and protects your personal information when you use our service at app.tryethernal.com and related services (the "Service").</p>

                    <h2>2. Information We Collect</h2>
                    <h3>Account Information</h3>
                    <p>When you create an account, we collect your email address and password. If you subscribe to a paid plan, we collect billing information through our payment processor, Stripe.</p>

                    <h3>Usage Data</h3>
                    <p>We collect information about how you use the Service, including pages visited, features used, and actions taken. This data is collected through PostHog analytics.</p>

                    <h3>Blockchain Data</h3>
                    <p>We index publicly available blockchain data from the RPC endpoints you provide. This data is already publicly accessible on the respective blockchain networks.</p>

                    <h3>Technical Data</h3>
                    <p>We automatically collect technical information including your IP address, browser type, operating system, and device information when you access the Service.</p>

                    <h2>3. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul>
                        <li>Provide, maintain, and improve the Service</li>
                        <li>Process transactions and manage subscriptions</li>
                        <li>Send service-related communications (account verification, billing, support)</li>
                        <li>Monitor and analyze usage patterns to improve user experience</li>
                        <li>Detect and prevent fraud or abuse</li>
                    </ul>

                    <h2>4. Data Sharing</h2>
                    <p>We do not sell your personal information. We may share data with:</p>
                    <ul>
                        <li><strong>Stripe</strong> — for payment processing</li>
                        <li><strong>PostHog</strong> — for product analytics</li>
                        <li><strong>Sentry</strong> — for error tracking and monitoring</li>
                        <li><strong>Mailjet</strong> — for transactional emails</li>
                        <li><strong>Netlify</strong> — for frontend hosting</li>
                        <li><strong>Fly.io</strong> — for backend infrastructure</li>
                    </ul>
                    <p>We may also disclose information if required by law or to protect our rights.</p>

                    <h2>5. Data Retention</h2>
                    <p>We retain your account information for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it by law.</p>
                    <p>Blockchain data indexed by the Service may be retained indefinitely as it is publicly available information.</p>

                    <h2>6. Data Security</h2>
                    <p>We implement appropriate technical and organizational measures to protect your personal information, including encryption at rest and in transit, access controls, and regular security assessments.</p>

                    <h2>7. Your Rights (GDPR)</h2>
                    <p>If you are located in the European Economic Area, you have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Rectify inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Object to or restrict processing</li>
                        <li>Data portability</li>
                        <li>Withdraw consent at any time</li>
                    </ul>
                    <p>To exercise these rights, contact us at <a href="mailto:contact@tryethernal.com">contact@tryethernal.com</a>.</p>

                    <h2>8. Cookies</h2>
                    <p>We use essential cookies for authentication and session management. We use analytics cookies (PostHog) to understand how the Service is used. You can disable non-essential cookies in your browser settings.</p>

                    <h2>9. Children's Privacy</h2>
                    <p>The Service is not intended for users under 16 years of age. We do not knowingly collect personal information from children under 16.</p>

                    <h2>10. International Transfers</h2>
                    <p>Your data may be transferred to and processed in countries outside your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.</p>

                    <h2>11. Changes to This Policy</h2>
                    <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the Service. Your continued use of the Service after changes take effect constitutes acceptance.</p>

                    <h2>12. Contact</h2>
                    <p>For privacy-related questions or to exercise your rights, contact us at:</p>
                    <p>
                        Email: <a href="mailto:contact@tryethernal.com">contact@tryethernal.com</a><br>
                        Data Controller: Antoine Rachez<br>
                        Location: France
                    </p>
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
.legal-content h3 {
    font-family: 'Exo', sans-serif;
    font-weight: 600;
    font-size: 1.1rem;
    margin-top: 1.2rem;
    margin-bottom: 0.5rem;
    color: #94A3B8;
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
