/**
 * @fileoverview Per-step content generators for the demo drip email sequence.
 * Step 1 is plain text (personal feel). Steps 2-6 use branded HTML template.
 * Steps 1-2 link to the explorer. Steps 3-6 link to the migration flow.
 * @module emails/drip-content
 */

const fs = require('fs');
const path = require('path');

let baseTemplate;

/**
 * Loads and caches the base HTML template.
 * @returns {string} HTML template string with {{content}} and {{unsubscribeUrl}} placeholders
 */
function getBaseTemplate() {
    if (!baseTemplate) {
        baseTemplate = fs.readFileSync(path.join(__dirname, 'drip-base.html'), 'utf-8');
    }
    return baseTemplate;
}

/**
 * Wraps content in the branded HTML template.
 * @param {string} content - Inner HTML content
 * @param {string} subject - Email subject for title tag
 * @param {string} unsubscribeUrl - Unsubscribe link
 * @returns {string} Complete HTML email
 */
function wrapInTemplate(content, subject, unsubscribeUrl, appDomain) {
    return getBaseTemplate()
        .replace('{{content}}', content)
        .replace('{{subject}}', subject)
        .replace('{{unsubscribeUrl}}', unsubscribeUrl)
        .replace(/\{\{appDomain\}\}/g, appDomain);
}

const steps = {
    1: (data) => ({
        subject: 'Your Ethernal demo explorer is ready',
        textPart: `Hello,\n\nYour Ethernal demo explorer is ready: ${data.explorerLink}\n\nYour explorer will sync blocks, transactions, and contract interactions in real-time. Try deploying a contract or sending a transaction to see it appear.\n\nFeel free to reply to this email if you have any questions!\n\nRegards,\n\nAntoine`,
        htmlPart: null
    }),

    2: (data) => {
        const summary = data.activitySummary || 'new blocks';
        const subject = `Your explorer synced ${summary}`;
        const content = `
            <h2>Your explorer is active</h2>
            <p>Your demo explorer <strong>${data.explorerSlug}</strong> has synced ${summary} so far.</p>
            <p>Here is what you can explore right now:</p>
            <ul>
                <li>View decoded transaction inputs and outputs</li>
                <li>Inspect contract source code and ABI</li>
                <li>Track token transfers and balances</li>
            </ul>
            <div class="cta-wrap"><a href="${data.explorerLink}" class="cta">Open Explorer</a></div>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} has synced ${summary}. Open it at ${data.explorerLink}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    3: (data) => {
        const subject = "Here's what you're missing on your chain";
        const content = `
            <h2>Demo vs. Paid: what you unlock</h2>
            <p>Your demo explorer gives you a taste. Here is what a paid plan adds:</p>
            <table class="feature-table">
                <tr><th>Feature</th><th>Demo</th><th>Paid</th></tr>
                <tr><td>Data retention</td><td style="color: #e57373;">7 days</td><td style="color: #81c784;">Unlimited</td></tr>
                <tr><td>Custom branding</td><td style="color: #e57373;">&#10007;</td><td style="color: #81c784;">&#10003;</td></tr>
                <tr><td>Custom domain</td><td style="color: #e57373;">&#10007;</td><td style="color: #81c784;">&#10003;</td></tr>
                <tr><td>Historical sync</td><td style="color: #e57373;">&#10007;</td><td style="color: #81c784;">&#10003;</td></tr>
                <tr><td>API access</td><td style="color: #e57373;">Limited</td><td style="color: #81c784;">Full</td></tr>
                <tr><td>Explorer lifetime</td><td style="color: #e57373;">7 days</td><td style="color: #81c784;">Permanent</td></tr>
            </table>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start Free Trial</a></div>
        `;
        return {
            subject,
            textPart: `Your demo explorer has limited features. See what a paid plan unlocks: data retention, custom domain, historical sync, and more. Start your free trial: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    4: (data) => {
        const subject = 'Teams building on chains like yours use Ethernal';
        const teamContext = data.teamContext || 'Teams building EVM-based chains use Ethernal as their primary block explorer for debugging, monitoring, and sharing chain data with their community.';
        const content = `
            <h2>You are not alone</h2>
            <p>${teamContext}</p>
            <p>Ethernal works out of the box with any EVM chain: L2s, L3s, appchains, testnets, and private networks.</p>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start Free Trial</a></div>
        `;
        return {
            subject,
            textPart: `${teamContext}\n\nStart your free trial: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    5: (data) => {
        const subject = 'Your explorer expires in 2 days';
        const content = `
            <h2>Your demo is ending soon</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> expires in 2 days.</p>
            <p>Start your 7-day free trial now to keep your explorer running. Your existing configuration transfers automatically.</p>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start Free Trial</a></div>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">After expiration, your explorer and its data will be removed.</p>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} expires in 2 days. Start your 7-day free trial to keep it running: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    6: (data) => {
        const subject = "Your demo expired, but your data doesn't have to";
        const content = `
            <h2>Your demo has ended</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> has expired.</p>
            <p>We are keeping your configuration for 48 hours. Start a free trial now and we will restore your explorer instantly.</p>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Restore Explorer</a></div>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">After 48 hours, your explorer and its data will be permanently deleted.</p>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} has expired. We're keeping your configuration for 48 hours. Start a free trial to restore it: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    }
};

/**
 * Gets email content for a specific drip step.
 * @param {number} step - Step number (1-6)
 * @param {Object} data - Template data
 * @param {string} data.explorerSlug - Explorer slug
 * @param {string} data.explorerLink - Full explorer URL
 * @param {string} data.migrateUrl - Migration URL with JWT token (steps 3-6)
 * @param {string} data.email - Recipient email
 * @param {string} data.unsubscribeUrl - Unsubscribe URL
 * @param {string} [data.activitySummary] - Activity summary for step 2
 * @param {string} [data.teamContext] - Team/company context for step 4
 * @returns {{ subject: string, textPart: string, htmlPart: string|null }}
 * @throws {Error} If step is not 1-6
 */
function getEmailContent(step, data) {
    const generator = steps[step];
    if (!generator) throw new Error(`Invalid drip step: ${step}`);
    return generator(data);
}

module.exports = { getEmailContent };
