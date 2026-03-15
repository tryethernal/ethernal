/**
 * @fileoverview Per-step content generators for the demo drip email sequence.
 * Step 1 is plain text (personal feel). Steps 2-6 use branded HTML template.
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
        textPart: `Hello,\n\nYour Ethernal demo explorer is ready. You can access it at ${data.explorerLink}.\n\nYour explorer will sync blocks, transactions, and contract interactions in real-time. Try deploying a contract or sending a transaction to see it appear.\n\nFeel free to reply to this email if you have any questions!\n\nRegards,\n\nAntoine`,
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
            <a href="${data.explorerLink}" class="cta">Open Explorer</a>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} has synced ${summary}. Open it at ${data.explorerLink}`,
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
                <tr><td>Data retention</td><td>7 days</td><td>Unlimited</td></tr>
                <tr><td>Custom branding</td><td>No</td><td>Yes</td></tr>
                <tr><td>Custom domain</td><td>No</td><td>Yes</td></tr>
                <tr><td>Historical sync</td><td>No</td><td>Yes</td></tr>
                <tr><td>DEX analytics</td><td>No</td><td>Yes</td></tr>
                <tr><td>API access</td><td>Limited</td><td>Full</td></tr>
                <tr><td>Explorer lifetime</td><td>7 days</td><td>Permanent</td></tr>
            </table>
            <a href="https://${data.appDomain}/#pricing" class="cta">See Plans</a>
        `;
        return {
            subject,
            textPart: `Your demo explorer has limited features. See what a paid plan unlocks: data retention, custom domain, historical sync, DEX analytics, and more. Plans at https://${data.appDomain}/#pricing`,
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
            <a href="https://${data.appDomain}" class="cta">Learn More</a>
        `;
        return {
            subject,
            textPart: `${teamContext}\n\nLearn more at https://${data.appDomain}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    5: (data) => {
        const subject = 'Your explorer expires in 2 days';
        const content = `
            <h2>Your demo is ending soon</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> expires in 2 days.</p>
            <p>Migrate now to keep your explorer running permanently. Your existing configuration transfers automatically.</p>
            <a href="https://app.${data.appDomain}/explorers" class="cta">Migrate to Paid</a>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">After expiration, your explorer and its data will be removed.</p>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} expires in 2 days. Migrate to a paid plan to keep it running: https://app.${data.appDomain}/explorers`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    6: (data) => {
        const subject = "Your demo expired, but your data doesn't have to";
        const content = `
            <h2>Your demo has ended</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> has expired.</p>
            <p>We are keeping your configuration for 48 hours. Sign up for a paid plan now and we will restore your explorer instantly.</p>
            <a href="https://app.${data.appDomain}/explorers" class="cta">Restore Explorer</a>
            <p style="color: #888; font-size: 13px; margin-top: 16px;">After 48 hours, your explorer and its data will be permanently deleted.</p>
        `;
        return {
            subject,
            textPart: `Your demo explorer ${data.explorerSlug} has expired. We're keeping your configuration for 48 hours. Sign up now to restore it: https://app.${data.appDomain}/explorers`,
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
