/**
 * @fileoverview Domain resolution and enrichment utilities for demo profile personalization.
 * Resolves company domain from email or RPC URL, calls linkup.so for research,
 * and Claude API for personalized copy generation.
 * @module lib/enrichment
 */

const freeEmailDomains = require('free-email-domains');
const { URL } = require('url');
const { getLinkupApiKey } = require('./env');
const logger = require('./logger');

const FREE_EMAIL_SET = new Set(freeEmailDomains);

const PUBLIC_RPC_DOMAINS = new Set([
    'ankr.com', 'infura.io', 'alchemy.com', 'publicnode.com',
    'chainstack.com', 'quicknode.com', 'drpc.org', 'blast.io',
    'tenderly.co', 'llamarpc.com', '1rpc.io', 'sepolia.org'
]);

const LINKUP_TIMEOUT_MS = 30000;

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
        return data.answer || data.output || null;
    } catch (error) {
        logger.error(error.message, { location: 'enrichment.searchCompany', domain, error });
        return null;
    }
}

const { execSync } = require('child_process');

const CLAUDE_TIMEOUT_MS = 60000;

/**
 * Calls Claude via the CLI to generate personalized email snippets.
 * Uses `claude -p` with --output-format json for structured output.
 * Auth is handled by Claude Code's OAuth credentials (apiKeyHelper).
 * @param {string} research - Linkup.so research text
 * @param {string} domain - Company domain
 * @param {string} networkId - Chain network ID
 * @returns {Promise<Object|null>} Enrichment snippets or null on failure
 */
async function generateSnippets(research, domain, networkId) {
    try {
        const prompt = `You are writing personalized email copy for Ethernal, a block explorer for EVM chains.

Company domain: ${domain}
Chain network ID: ${networkId}
Research: ${research}

Generate a JSON object with exactly these 5 fields (2-3 sentences each). Be factual, do not invent details not supported by the research. If the research is thin, keep the copy general but still reference their domain.

{
  "companyName": "Company name derived from research",
  "companyDescription": "One-line description of what the company does",
  "companyContext": "Social proof paragraph. Start with 'As a team building X...'. Explain why they need a block explorer.",
  "tailoredBenefits": "Which Ethernal features matter most for their use case and why.",
  "expirationWarning": "For the 'expires in 2 days' email. Make the cost of losing their explorer data concrete and specific to their use case. Focus on what they'll lose.",
  "recoveryHook": "For the 'demo expired' email. Emphasize the urgency of the 48-hour recovery window and what they can still save. Different angle from expirationWarning."
}

Return ONLY the JSON object, no other text.`;

        const result = execSync(
            `claude -p --output-format json --model claude-haiku-4-5`,
            { input: prompt, encoding: 'utf8', timeout: CLAUDE_TIMEOUT_MS, stdio: ['pipe', 'pipe', 'pipe'] }
        );

        const parsed = JSON.parse(result);
        // claude --output-format json wraps the response; extract the text result
        const text = parsed.result || parsed.content?.[0]?.text || (typeof parsed === 'string' ? parsed : null);
        if (!text) return null;

        // Parse the JSON from Claude's text response
        const jsonMatch = (typeof text === 'string' ? text : JSON.stringify(text)).match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const snippets = JSON.parse(jsonMatch[0]);
        if (!snippets.companyName || !snippets.companyContext || !snippets.expirationWarning) return null;

        return snippets;
    } catch (error) {
        logger.error(error.message, { location: 'enrichment.generateSnippets', domain, error });
        return null;
    }
}

module.exports = { resolveDomain, extractDomain, searchCompany, generateSnippets };
