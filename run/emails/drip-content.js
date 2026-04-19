/**
 * @fileoverview Per-step content generators for the demo drip email sequence.
 * All steps emit a plain-text fallback and branded HTML via the shared template.
 * Steps 1-2 link to the explorer. Steps 3-6 link to the migration flow.
 * @module emails/drip-content
 */

const fs = require('fs');
const path = require('path');

/**
 * Escapes HTML special characters in AI-generated content.
 * @param {string} str - Raw text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let baseTemplate;

/**
 * Loads and caches the base HTML template.
 * @returns {string} HTML template string with {{subject}}, {{content}}, {{unsubscribeUrl}}, and {{appDomain}} placeholders
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
 * @param {string} subject - Email subject for title tag (will be HTML-escaped)
 * @param {string} unsubscribeUrl - Unsubscribe link
 * @param {string} appDomain - App domain for header/footer brand links
 * @returns {string} Complete HTML email
 */
function wrapInTemplate(content, subject, unsubscribeUrl, appDomain) {
    return getBaseTemplate()
        .replace('{{content}}', content)
        .replace('{{subject}}', escapeHtml(subject))
        .replace('{{unsubscribeUrl}}', unsubscribeUrl)
        .replace(/\{\{appDomain\}\}/g, appDomain);
}

const steps = {
    1: (data) => {
        const subject = 'Your Ethernal demo is live';
        const content = `
            <h1>Your Ethernal demo is live</h1>
            <p>Your demo explorer is up and syncing. Deploy a contract or send a transaction and it'll show up in a few seconds.</p>
            <div class="cta-wrap"><a href="${data.explorerLink}" class="cta">Open explorer &rarr;</a></div>
            <hr class="divider" />
            <p class="sig">Reply if something looks off.</p>
            <p class="sig"><span class="sig-name">Antoine</span><br>Ethernal</p>
        `;
        return {
            subject,
            textPart: `Your Ethernal demo explorer is up and syncing: ${data.explorerLink}\n\nDeploy a contract or send a transaction and it'll show up in a few seconds.\n\nReply if something looks off.\n\nAntoine, Ethernal`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    2: (data) => {
        const summary = data.activitySummary || 'new blocks';
        const subject = `${summary} synced on your demo`;
        const content = `
            <h1>${escapeHtml(summary)} synced on your demo</h1>
            <p>Your demo <code>${escapeHtml(data.explorerSlug)}</code> has indexed ${escapeHtml(summary)}. You can already poke at decoded transaction inputs, verified contract source, and token transfers per address.</p>
            <div class="cta-wrap"><a href="${data.explorerLink}" class="cta">Open explorer &rarr;</a></div>
        `;
        return {
            subject,
            textPart: `Your demo ${data.explorerSlug} has indexed ${summary}. Open it: ${data.explorerLink}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    3: (data) => {
        const subject = 'What the paid plan adds';
        const benefitsIntro = data.tailoredBenefits
            ? `<p>${escapeHtml(data.tailoredBenefits)}</p>`
            : '';
        const content = `
            <h1>What the paid plan adds</h1>
            ${benefitsIntro}
            <p>The demo is capped at 7 days and runs with Ethernal branding. Paid plans drop both, plus a few things you probably want once the chain is real:</p>
            <table class="compare">
                <tr><th>Feature</th><th>Demo</th><th class="mark"></th><th>Paid</th></tr>
                <tr><td>Data retention</td><td class="dim">7 days</td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Unlimited</td></tr>
                <tr><td>Custom branding</td><td class="dim"><span class="dash">&mdash;</span></td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Included</td></tr>
                <tr><td>Custom domain</td><td class="dim"><span class="dash">&mdash;</span></td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Included</td></tr>
                <tr><td>Historical sync</td><td class="dim"><span class="dash">&mdash;</span></td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Included</td></tr>
                <tr><td>API access</td><td class="dim">Limited</td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Full</td></tr>
                <tr><td>Explorer lifetime</td><td class="dim">7 days</td><td class="mark"><span class="check">&#10003;</span></td><td class="strong">Permanent</td></tr>
            </table>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start free trial &rarr;</a></div>
        `;
        return {
            subject,
            textPart: `The demo is capped at 7 days and runs with Ethernal branding. Paid plans drop both, plus unlimited retention, custom domain, historical sync, and full API access. Start a free trial: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    4: (data) => {
        const subject = 'Who else is running Ethernal';
        const teamIntro = data.teamContext
            ? `<p>${escapeHtml(data.teamContext)}</p>`
            : '';
        const content = `
            <h1>Who else is running Ethernal</h1>
            ${teamIntro}
            <p>Ethernal runs as the block explorer for production L2s, appchains, and private networks. Same product, any EVM chain.</p>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start free trial &rarr;</a></div>
        `;
        return {
            subject,
            textPart: `Ethernal runs as the block explorer for production L2s, appchains, and private networks. Same product, any EVM chain.\n\nStart a free trial: ${data.migrateUrl}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    5: (data) => {
        const subject = 'Your demo expires in 2 days';
        const alertBody = data.expirationWarning
            ? escapeHtml(data.expirationWarning)
            : "Start the trial before then and your config carries over, no re-adding the chain.";
        const content = `
            <h1>Your demo expires in 2 days</h1>
            <p><code>${escapeHtml(data.explorerSlug)}</code> shuts down in 2 days.</p>
            <div class="alert">${alertBody}</div>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Start free trial &rarr;</a></div>
            <p class="fineprint">After that, the explorer and its data are deleted.</p>
        `;
        return {
            subject,
            textPart: `${data.explorerSlug} shuts down in 2 days. Start the trial before then and your config carries over: ${data.migrateUrl}\n\nAfter that, the explorer and its data are deleted.\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            htmlPart: wrapInTemplate(content, subject, data.unsubscribeUrl, data.appDomain)
        };
    },

    6: (data) => {
        const subject = 'Your demo expired, 48h to recover';
        const urgentBody = data.recoveryHook
            ? escapeHtml(data.recoveryHook)
            : "We're holding your config for 48 hours. Start a trial and it comes back with the same setup.";
        const content = `
            <h1>Your demo expired, 48h to recover</h1>
            <p><code>${escapeHtml(data.explorerSlug)}</code> expired.</p>
            <div class="urgent">${urgentBody}</div>
            <div class="cta-wrap"><a href="${data.migrateUrl}" class="cta">Restore explorer &rarr;</a></div>
            <p class="fineprint">After 48 hours, it's deleted for good.</p>
        `;
        return {
            subject,
            textPart: `${data.explorerSlug} expired. We're holding your config for 48 hours. Start a trial and it comes back with the same setup: ${data.migrateUrl}\n\nAfter 48 hours, it's deleted for good.\n\nUnsubscribe: ${data.unsubscribeUrl}`,
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
 * @param {string} data.appDomain - App domain for header/footer brand links
 * @param {string} [data.activitySummary] - Activity summary for step 2
 * @param {string} [data.teamContext] - Team/company context for step 4 (enrichment: companyContext)
 * @param {string} [data.tailoredBenefits] - Personalized benefits for step 3
 * @param {string} [data.expirationWarning] - Personalized "about to lose" message for step 5
 * @param {string} [data.recoveryHook] - Personalized "still recoverable" message for step 6
 * @returns {{ subject: string, textPart: string, htmlPart: string }}
 * @throws {Error} If step is not 1-6
 */
function getEmailContent(step, data) {
    const generator = steps[step];
    if (!generator) throw new Error(`Invalid drip step: ${step}`);
    return generator(data);
}

module.exports = { getEmailContent };
