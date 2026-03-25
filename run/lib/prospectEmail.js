/**
 * @fileoverview Generates personalized cold outreach emails for prospects using Claude.
 * @module lib/prospectEmail
 */
const Anthropic = require('@anthropic-ai/sdk');
const { getAnthropicApiKey } = require('./env');
const logger = require('./logger');

const EMAIL_TOOL = {
    name: 'save_email',
    description: 'Save the drafted email subject and body',
    input_schema: {
        type: 'object',
        required: ['subject', 'body'],
        properties: {
            subject: { type: 'string', description: 'Email subject line (max 60 chars)' },
            body: { type: 'string', description: 'Email body (max 150 words, includes unsubscribe placeholder {{unsubscribeUrl}})' }
        }
    }
};

/**
 * Draft a personalized cold email for a prospect.
 * @param {Object} params
 * @param {string} params.companyName - Company name
 * @param {string} params.contactName - Contact person name (or null)
 * @param {string} params.chainName - Chain/project name
 * @param {string} params.chainType - op_stack, orbit, zk_evm, other_evm
 * @param {string} params.launchStatus - announced, testnet, pre_mainnet, mainnet
 * @param {string} params.research - Company research from linkup.so
 * @param {string} params.leadType - cold_lead or warm_lead
 * @param {Object} [params.demoData] - Demo profile data for warm leads
 * @param {boolean} [params.isFollowUp] - Whether this is a follow-up email
 * @param {number} [params.followUpCount] - Which follow-up (1 or 2)
 * @returns {Promise<{subject: string, body: string}|null>}
 */
async function draftEmail(params) {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) return null;

    try {
        const client = new Anthropic({ apiKey });
        const prompt = buildPrompt(params);

        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            tools: [EMAIL_TOOL],
            tool_choice: { type: 'tool', name: 'save_email' },
            messages: [{ role: 'user', content: prompt }]
        });

        const toolUse = response.content.find(c => c.type === 'tool_use' && c.name === 'save_email');
        return toolUse?.input || null;
    } catch (error) {
        logger.error(error.message, { location: 'prospectEmail.draftEmail', company: params.companyName, error });
        return null;
    }
}

/**
 * Builds the Claude prompt based on lead type and follow-up status.
 * @param {Object} params - Same as draftEmail params
 * @returns {string}
 */
function buildPrompt(params) {
    const greeting = params.contactName ? `Hi ${params.contactName.split(' ')[0]}` : 'Hi';
    const demoContext = params.leadType === 'warm_lead' && params.demoData
        ? `\nDemo history: Their team previously tried Ethernal and indexed ${params.demoData.blockCount} blocks, ${params.demoData.transactionCount} transactions, and ${params.demoData.contractCount} contracts on ${params.demoData.chainName}.`
        : '';

    if (params.isFollowUp) {
        return `You are writing a follow-up email (#${params.followUpCount}) for Ethernal, an open-source block explorer for EVM chains.

Previous email got no reply. Write a SHORT follow-up (under 100 words).
Greeting: "${greeting}"
Company: ${params.companyName}
Chain: ${params.chainName} (${params.chainType}, ${params.launchStatus})
Research: ${params.research}
${demoContext}

Rules:
- Reference the previous email briefly
- Add a new angle or value prop, don't just repeat
- One clear CTA: reply or book a call
- Direct, technical, founder-to-founder tone
- No fluff, no "just checking in"
- Include {{unsubscribeUrl}} at the bottom as an unsubscribe link
- Sign off as "Antoine, Ethernal"`;
    }

    return `You are writing a cold outreach email for Ethernal, an open-source block explorer for EVM chains.

Greeting: "${greeting}"
Company: ${params.companyName}
Chain: ${params.chainName} (${params.chainType}, status: ${params.launchStatus})
Research: ${params.research}
Lead type: ${params.leadType}
${demoContext}

Rules:
- Max 150 words
- One clear CTA: book a call or reply
- ${params.leadType === 'warm_lead' ? 'Reference their previous demo experience with Ethernal' : 'Explain why they need a block explorer as they prepare to launch'}
- Mention their specific chain and tech stack
- Direct, technical, founder-to-founder tone (not salesy)
- No attachments, no "I hope this email finds you well"
- Include {{unsubscribeUrl}} at the bottom as an unsubscribe link
- Sign off as "Antoine, Ethernal"`;
}

module.exports = { draftEmail, buildPrompt };
