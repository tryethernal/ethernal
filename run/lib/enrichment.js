/**
 * @fileoverview Domain resolution and enrichment utilities for demo profile personalization.
 * Resolves company domain from email or RPC URL, calls linkup.so for research,
 * and Claude API for personalized copy generation.
 * @module lib/enrichment
 */

const freeEmailDomains = require('free-email-domains');
const { URL } = require('url');
const { getLinkupApiKey, getClaudeApiKey } = require('./env');
const logger = require('./logger');

const FREE_EMAIL_SET = new Set(freeEmailDomains);

const PUBLIC_RPC_DOMAINS = new Set([
    'ankr.com', 'infura.io', 'alchemy.com', 'publicnode.com',
    'chainstack.com', 'quicknode.com', 'drpc.org', 'blast.io',
    'tenderly.co', 'llamarpc.com', '1rpc.io', 'sepolia.org'
]);

const LINKUP_TIMEOUT_MS = 30000;
const CLAUDE_TIMEOUT_MS = 30000;

/**
 * Extracts the registrable domain from a hostname (strips subdomains).
 * @param {string} hostname - e.g., 'rpc.acmelabs.xyz'
 * @returns {string} e.g., 'acmelabs.xyz'
 */
function extractDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join('.');
}

/**
 * Checks if a hostname is an IP address.
 * @param {string} hostname
 * @returns {boolean}
 */
function isIpAddress(hostname) {
    return /^[\d.]+$/.test(hostname) || hostname.includes(':');
}

/**
 * Resolves a company domain from email address and RPC URL.
 * @param {string} email - User's email address
 * @param {string|null} rpcUrl - RPC server URL
 * @returns {{ domain: string, source: 'email'|'rpc' }|null}
 */
function resolveDomain(email, rpcUrl) {
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain && !FREE_EMAIL_SET.has(emailDomain)) {
        return { domain: emailDomain, source: 'email' };
    }

    if (!rpcUrl) return null;

    let hostname;
    try {
        hostname = new URL(rpcUrl).hostname.toLowerCase();
    } catch {
        return null;
    }

    if (isIpAddress(hostname)) return null;

    const domain = extractDomain(hostname);
    if (PUBLIC_RPC_DOMAINS.has(domain)) return null;

    return { domain, source: 'rpc' };
}

/**
 * Searches linkup.so for company information.
 * @param {string} domain - Company domain to research
 * @returns {Promise<string|null>} Research text or null on failure
 */
async function searchCompany(domain) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), LINKUP_TIMEOUT_MS);

        const res = await fetch('https://api.linkup.so/v1/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getLinkupApiKey()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: `What does ${domain} do? Include any blockchain, web3, DeFi, or crypto context.`,
                depth: 'standard',
                outputType: 'sourcedAnswer'
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!res.ok) return null;

        const data = await res.json();
        return data.output || null;
    } catch (error) {
        logger.error(error.message, { location: 'enrichment.searchCompany', domain, error });
        return null;
    }
}

const ENRICHMENT_TOOL = {
    name: 'save_enrichment',
    description: 'Save personalized email copy snippets',
    input_schema: {
        type: 'object',
        required: ['companyName', 'companyDescription', 'companyContext', 'tailoredBenefits', 'urgencyHook'],
        properties: {
            companyName: { type: 'string', description: 'Company name derived from research' },
            companyDescription: { type: 'string', description: 'One-line description of what the company does' },
            companyContext: { type: 'string', description: "Social proof paragraph. Start with 'As a team building X...'. Explain why they need a block explorer." },
            tailoredBenefits: { type: 'string', description: 'Which Ethernal features matter most for their use case and why.' },
            urgencyHook: { type: 'string', description: 'Make the cost of losing their explorer data concrete and specific to their use case.' }
        }
    }
};

/**
 * Calls Claude API to generate personalized email snippets.
 * Uses tool_use mode for structured JSON output.
 * @param {string} research - Linkup.so research text
 * @param {string} domain - Company domain
 * @param {string} networkId - Chain network ID
 * @returns {Promise<Object|null>} Enrichment snippets or null on failure
 */
async function generateSnippets(research, domain, networkId) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': getClaudeApiKey(),
                'content-type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                tools: [ENRICHMENT_TOOL],
                tool_choice: { type: 'tool', name: 'save_enrichment' },
                messages: [{
                    role: 'user',
                    content: `You are writing personalized email copy for Ethernal, a block explorer for EVM chains.

Company domain: ${domain}
Chain network ID: ${networkId}
Research: ${research}

Generate three short snippets (2-3 sentences each). Be factual, do not invent details not supported by the research. If the research is thin, keep the copy general but still reference their domain.`
                }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        if (!res.ok) return null;

        const data = await res.json();
        const toolUse = data.content?.find(c => c.type === 'tool_use' && c.name === 'save_enrichment');
        return toolUse?.input || null;
    } catch (error) {
        logger.error(error.message, { location: 'enrichment.generateSnippets', domain, error });
        return null;
    }
}

module.exports = { resolveDomain, extractDomain, searchCompany, generateSnippets };
