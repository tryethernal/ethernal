# Demo Profile Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personalize drip emails (steps 3-6) by researching the demo creator's company at creation time and generating tailored copy via linkup.so + Claude API.

**Architecture:** Async enrichment job enqueued at demo creation alongside step 1 email. Resolves company domain from email or RPC URL, calls linkup.so for research, calls Claude API (via OAuth token) to generate 3 personalized snippets, stores on explorer. sendDripEmail reads enrichment at send time and maps to template params with generic fallbacks.

**Tech Stack:** linkup.so search API, Anthropic Messages API (Claude Haiku 4.5, tool_use mode, OAuth token auth), `free-email-domains` npm package, Sequelize migration.

---

## Chunk 1: Domain Resolution & Enrichment Library

### Task 1: Migration — add enrichment column to explorers

**Files:**
- Create: `run/migrations/20260316000001-add-enrichment-to-explorers.js`

- [ ] **Step 1: Create migration file**

```javascript
// run/migrations/20260316000001-add-enrichment-to-explorers.js
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('explorers', 'enrichment', {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: null
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('explorers', 'enrichment');
    }
};
```

- [ ] **Step 2: Add enrichment to Explorer model**

In `run/models/explorer.js`, add `enrichment: DataTypes.JSON` after `nextRecoveryCheckAt: DataTypes.DATE` (line 813):

```javascript
    nextRecoveryCheckAt: DataTypes.DATE,
    enrichment: DataTypes.JSON
```

- [ ] **Step 3: Commit**

```bash
git add run/migrations/20260316000001-add-enrichment-to-explorers.js run/models/explorer.js
git commit -m "feat: add enrichment JSON column to explorers table"
```

### Task 2: Add env var getters

**Files:**
- Modify: `run/lib/env.js`
- Modify: `run/tests/mocks/lib/env.js`

- [ ] **Step 1: Add getters to env.js**

Add before the closing `};` in `run/lib/env.js`:

```javascript
    getLinkupApiKey: () => process.env.LINKUP_API_KEY,
    getClaudeApiKey: () => process.env.CLAUDE_API_KEY,
```

- [ ] **Step 2: Add mocks**

Add to `run/tests/mocks/lib/env.js` before the closing `}));`:

```javascript
    getLinkupApiKey: jest.fn(() => 'test-linkup-key'),
    getClaudeApiKey: jest.fn(() => 'test-claude-key'),
```

- [ ] **Step 3: Commit**

```bash
git add run/lib/env.js run/tests/mocks/lib/env.js
git commit -m "feat: add LINKUP_API_KEY and CLAUDE_API_KEY env getters"
```

### Task 3: Install free-email-domains package

**Files:**
- Modify: `run/package.json`

- [ ] **Step 1: Install package**

```bash
docker compose -f docker-compose.dev.yml exec backend npm install free-email-domains
```

- [ ] **Step 2: Commit**

```bash
git add run/package.json run/package-lock.json
git commit -m "deps: add free-email-domains for enrichment domain resolution"
```

### Task 4: Create enrichment library — domain resolution

**Files:**
- Create: `run/lib/enrichment.js`
- Create: `run/tests/lib/enrichment.test.js`

- [ ] **Step 1: Write domain resolution tests**

```javascript
// run/tests/lib/enrichment.test.js
require('../mocks/lib/env');

const { resolveDomain } = require('../../lib/enrichment');

describe('resolveDomain', () => {
    it('returns domain from corporate email', () => {
        expect(resolveDomain('john@acmelabs.xyz', 'https://rpc.ankr.com/eth'))
            .toEqual({ domain: 'acmelabs.xyz', source: 'email' });
    });

    it('skips free email and falls back to RPC domain', () => {
        expect(resolveDomain('john@gmail.com', 'https://rpc.acmelabs.xyz/v1'))
            .toEqual({ domain: 'acmelabs.xyz', source: 'rpc' });
    });

    it('returns null for free email + public RPC', () => {
        expect(resolveDomain('john@gmail.com', 'https://rpc.ankr.com/eth'))
            .toBeNull();
    });

    it('returns null for free email + no RPC', () => {
        expect(resolveDomain('john@gmail.com', null))
            .toBeNull();
    });

    it('strips subdomains from RPC URLs', () => {
        expect(resolveDomain('john@hotmail.com', 'https://rpc.mychain.io/v1'))
            .toEqual({ domain: 'mychain.io', source: 'rpc' });
    });

    it('handles RPC URLs with ports', () => {
        expect(resolveDomain('john@yahoo.com', 'https://rpc.mychain.io:8545'))
            .toEqual({ domain: 'mychain.io', source: 'rpc' });
    });

    it('returns null for IP-based RPC URLs', () => {
        expect(resolveDomain('john@gmail.com', 'http://192.168.1.1:8545'))
            .toBeNull();
    });

    it('skips common public RPC providers', () => {
        const providers = [
            'https://eth-mainnet.g.alchemy.com/v2/key',
            'https://mainnet.infura.io/v3/key',
            'https://rpc.publicnode.com',
            'https://eth.llamarpc.com',
        ];
        providers.forEach(rpc => {
            expect(resolveDomain('john@gmail.com', rpc)).toBeNull();
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/lib/enrichment.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../lib/enrichment'`

- [ ] **Step 3: Implement domain resolution**

```javascript
// run/lib/enrichment.js
/**
 * @fileoverview Domain resolution and enrichment utilities for demo profile personalization.
 * Resolves company domain from email or RPC URL, calls linkup.so for research,
 * and Claude API for personalized copy generation.
 * @module lib/enrichment
 */

const freeEmailDomains = require('free-email-domains');
const { URL } = require('url');

const FREE_EMAIL_SET = new Set(freeEmailDomains);

const PUBLIC_RPC_DOMAINS = new Set([
    'ankr.com', 'infura.io', 'alchemy.com', 'publicnode.com',
    'chainstack.com', 'quicknode.com', 'drpc.org', 'blast.io',
    'tenderly.co', 'llamarpc.com', '1rpc.io', 'sepolia.org'
]);

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
    // Try email domain first
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain && !FREE_EMAIL_SET.has(emailDomain)) {
        return { domain: emailDomain, source: 'email' };
    }

    // Fall back to RPC URL domain
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

module.exports = { resolveDomain, extractDomain };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/lib/enrichment.test.js --no-coverage
```

Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add run/lib/enrichment.js run/tests/lib/enrichment.test.js
git commit -m "feat: add domain resolution for demo profile enrichment"
```

### Task 5: Add linkup.so search and Claude API generation to enrichment library

**Files:**
- Modify: `run/lib/enrichment.js`
- Create: `run/tests/lib/enrichment-api.test.js`

- [ ] **Step 1: Write tests for searchCompany and generateSnippets**

```javascript
// run/tests/lib/enrichment-api.test.js
require('../mocks/lib/env');

jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

const { searchCompany, generateSnippets } = require('../../lib/enrichment');

describe('searchCompany', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns search results from linkup', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ output: 'Acme Labs builds DeFi on Arbitrum' })
        });
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBe('Acme Labs builds DeFi on Arbitrum');
        expect(fetch).toHaveBeenCalledWith(
            'https://api.linkup.so/v1/search',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('returns null on timeout', async () => {
        fetch.mockRejectedValueOnce(new Error('timeout'));
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBeNull();
    });

    it('returns null on non-200 response', async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 500 });
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBeNull();
    });
});

describe('generateSnippets', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns parsed snippets from Claude tool_use response', async () => {
        const toolInput = {
            companyName: 'Acme Labs',
            companyDescription: 'DeFi lending on Arbitrum',
            companyContext: 'As a DeFi team...',
            tailoredBenefits: 'For lending protocols...',
            urgencyHook: 'Your lending explorer...'
        };
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                content: [{ type: 'tool_use', name: 'save_enrichment', input: toolInput }]
            })
        });
        const result = await generateSnippets('Acme builds DeFi', 'acmelabs.xyz', '42161');
        expect(result).toEqual(toolInput);
    });

    it('returns null when Claude returns no tool_use', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ content: [{ type: 'text', text: 'hello' }] })
        });
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });

    it('returns null on API failure', async () => {
        fetch.mockRejectedValueOnce(new Error('network error'));
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/lib/enrichment-api.test.js --no-coverage
```

Expected: FAIL — `searchCompany is not a function`

- [ ] **Step 3: Install node-fetch (if not already available)**

Check if `node-fetch` is available in the backend container. If not:
```bash
docker compose -f docker-compose.dev.yml exec backend npm install node-fetch@2
```

Note: Use v2 for CommonJS `require()` compatibility.

- [ ] **Step 4: Implement searchCompany and generateSnippets**

Append to `run/lib/enrichment.js`:

```javascript
const fetch = require('node-fetch');
const { getLinkupApiKey, getClaudeApiKey } = require('./env');
const logger = require('./logger');

const LINKUP_TIMEOUT_MS = 30000;
const CLAUDE_TIMEOUT_MS = 30000;

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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/lib/enrichment-api.test.js --no-coverage
```

Expected: All 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add run/lib/enrichment.js run/tests/lib/enrichment-api.test.js
git commit -m "feat: add linkup.so search and Claude API snippet generation"
```

## Chunk 2: Enrichment Job & Queue Registration

### Task 6: Create enrichDemoProfile job

**Files:**
- Create: `run/jobs/enrichDemoProfile.js`
- Create: `run/tests/jobs/enrichDemoProfile.test.js`

- [ ] **Step 1: Write tests**

```javascript
// run/tests/jobs/enrichDemoProfile.test.js
require('../mocks/lib/env');
require('../mocks/lib/queue');

const { Explorer } = require('../../models');
const enrichment = require('../../lib/enrichment');
const enrichDemoProfile = require('../../jobs/enrichDemoProfile');

jest.mock('../../lib/enrichment');

describe('enrichDemoProfile', () => {
    afterEach(() => jest.restoreAllMocks());

    it('enriches explorer with corporate email', async () => {
        const mockExplorer = { id: 1, update: jest.fn() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null); // no cache

        enrichment.resolveDomain.mockReturnValue({ domain: 'acmelabs.xyz', source: 'email' });
        enrichment.searchCompany.mockResolvedValue('Acme builds DeFi');
        enrichment.generateSnippets.mockResolvedValue({
            companyName: 'Acme',
            companyDescription: 'DeFi protocol',
            companyContext: 'As a DeFi team...',
            tailoredBenefits: 'For DeFi...',
            urgencyHook: 'Your DeFi explorer...'
        });

        await enrichDemoProfile({ data: { explorerId: 1, email: 'john@acmelabs.xyz', rpcServer: 'https://rpc.ankr.com/eth', networkId: '42161' } });

        expect(mockExplorer.update).toHaveBeenCalledWith({
            enrichment: expect.objectContaining({
                companyDomain: 'acmelabs.xyz',
                source: 'email',
                companyName: 'Acme',
                enrichedAt: expect.any(String)
            })
        });
    });

    it('skips enrichment when no domain resolved', async () => {
        const mockExplorer = { id: 1, update: jest.fn() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        enrichment.resolveDomain.mockReturnValue(null);

        await enrichDemoProfile({ data: { explorerId: 1, email: 'john@gmail.com', rpcServer: 'https://rpc.ankr.com/eth', networkId: '1' } });

        expect(mockExplorer.update).not.toHaveBeenCalled();
        expect(enrichment.searchCompany).not.toHaveBeenCalled();
    });

    it('reuses cached enrichment from same domain', async () => {
        const mockExplorer = { id: 2, update: jest.fn() };
        const cachedEnrichment = { companyDomain: 'acmelabs.xyz', companyName: 'Acme', companyContext: 'cached', tailoredBenefits: 'cached', urgencyHook: 'cached', enrichedAt: new Date().toISOString() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce({ enrichment: cachedEnrichment });
        enrichment.resolveDomain.mockReturnValue({ domain: 'acmelabs.xyz', source: 'email' });

        await enrichDemoProfile({ data: { explorerId: 2, email: 'jane@acmelabs.xyz', rpcServer: null, networkId: '1' } });

        expect(mockExplorer.update).toHaveBeenCalledWith({ enrichment: cachedEnrichment });
        expect(enrichment.searchCompany).not.toHaveBeenCalled();
    });

    it('stores error when linkup fails', async () => {
        const mockExplorer = { id: 1, update: jest.fn() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        enrichment.resolveDomain.mockReturnValue({ domain: 'acmelabs.xyz', source: 'email' });
        enrichment.searchCompany.mockResolvedValue(null);

        await enrichDemoProfile({ data: { explorerId: 1, email: 'john@acmelabs.xyz', rpcServer: null, networkId: '1' } });

        expect(mockExplorer.update).toHaveBeenCalledWith({
            enrichment: expect.objectContaining({ error: 'linkup_failed' })
        });
    });

    it('stores error when Claude fails', async () => {
        const mockExplorer = { id: 1, update: jest.fn() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);
        enrichment.resolveDomain.mockReturnValue({ domain: 'acmelabs.xyz', source: 'email' });
        enrichment.searchCompany.mockResolvedValue('Acme builds DeFi');
        enrichment.generateSnippets.mockResolvedValue(null);

        await enrichDemoProfile({ data: { explorerId: 1, email: 'john@acmelabs.xyz', rpcServer: null, networkId: '1' } });

        expect(mockExplorer.update).toHaveBeenCalledWith({
            enrichment: expect.objectContaining({ error: 'generation_failed' })
        });
    });

    it('exits gracefully when explorer not found', async () => {
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(null);
        await expect(
            enrichDemoProfile({ data: { explorerId: 999, email: 'john@acmelabs.xyz', rpcServer: null, networkId: '1' } })
        ).resolves.not.toThrow();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/jobs/enrichDemoProfile.test.js --no-coverage
```

Expected: FAIL — `Cannot find module '../../jobs/enrichDemoProfile'`

- [ ] **Step 3: Implement enrichDemoProfile job**

```javascript
// run/jobs/enrichDemoProfile.js
/**
 * @fileoverview Enriches a demo explorer with company research and personalized email copy.
 * Called async at demo creation time. Results stored on explorer.enrichment column.
 * @module jobs/enrichDemoProfile
 */

const { Explorer } = require('../models');
const { Op } = require('sequelize');
const { resolveDomain, searchCompany, generateSnippets } = require('../lib/enrichment');
const { getLinkupApiKey, getClaudeApiKey } = require('../lib/env');
const logger = require('../lib/logger');

const CACHE_DAYS = 7;

/**
 * @param {Object} job - BullMQ job
 * @param {number} job.data.explorerId - Explorer to enrich
 * @param {string} job.data.email - Demo creator's email
 * @param {string|null} job.data.rpcServer - RPC URL used for the demo
 * @param {string|null} job.data.networkId - Chain network ID
 */
module.exports = async (job) => {
    const { explorerId, email, rpcServer, networkId } = job.data;

    if (!getLinkupApiKey() || !getClaudeApiKey()) {
        logger.info('Enrichment skipped: missing LINKUP_API_KEY or CLAUDE_API_KEY');
        return;
    }

    const explorer = await Explorer.findByPk(explorerId);
    if (!explorer) return;

    const resolved = resolveDomain(email, rpcServer);
    if (!resolved) return;

    const { domain, source } = resolved;

    // Check domain cache — reuse enrichment from same domain within 7 days
    const { sequelize } = Explorer;
    const cached = await Explorer.findOne({
        where: {
            id: { [Op.ne]: explorerId },
            [Op.and]: [
                sequelize.literal(`enrichment->>'companyDomain' = ${sequelize.escape(domain)}`),
                sequelize.literal(`enrichment->>'error' IS NULL`),
                sequelize.literal(`(enrichment->>'enrichedAt')::timestamptz > NOW() - INTERVAL '${CACHE_DAYS} days'`)
            ]
        },
        order: [['createdAt', 'DESC']]
    });

    if (cached?.enrichment) {
        await explorer.update({ enrichment: cached.enrichment });
        return;
    }

    // Search with linkup.so
    const research = await searchCompany(domain);
    if (!research) {
        await explorer.update({
            enrichment: { companyDomain: domain, source, error: 'linkup_failed', enrichedAt: new Date().toISOString() }
        });
        return;
    }

    // Generate snippets with Claude
    const snippets = await generateSnippets(research, domain, networkId);
    if (!snippets) {
        await explorer.update({
            enrichment: { companyDomain: domain, source, error: 'generation_failed', enrichedAt: new Date().toISOString() }
        });
        return;
    }

    await explorer.update({
        enrichment: {
            ...snippets,
            companyDomain: domain,
            source,
            enrichedAt: new Date().toISOString()
        }
    });
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest run/tests/jobs/enrichDemoProfile.test.js --no-coverage
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add run/jobs/enrichDemoProfile.js run/tests/jobs/enrichDemoProfile.test.js
git commit -m "feat: add enrichDemoProfile job with domain cache and failure handling"
```

### Task 7: Register job in queue system

**Files:**
- Modify: `run/jobs/index.js`
- Modify: `run/workers/priorities.js`

- [ ] **Step 1: Add to job index**

In `run/jobs/index.js`, add after the `infraHealthCheck` line (line 68):

```javascript
    enrichDemoProfile: require('./enrichDemoProfile')
```

- [ ] **Step 2: Add to low priority workers**

In `run/workers/priorities.js`, inside the `if (!isSelfHosted())` block (line 67), add `'enrichDemoProfile'` to the `priorities.low.push(...)` call:

```javascript
    priorities.low.push('sendDemoExplorerLink', 'sendDripEmail', 'processDripEmails', 'enrichDemoProfile');
```

- [ ] **Step 3: Add rate limiter to queue config**

In `run/queues.js`, after the `processHistoricalBlocks` queue definition (line 86), add a rate-limited queue for enrichment:

```javascript
queues['enrichDemoProfile'] = new Queue('enrichDemoProfile', {
    defaultJobOptions: {
        attempts: 3,
        stackTraceLimit: 3,
        removeOnComplete: 10,
        removeOnFail: 10,
        timeout: 90000,
        backoff: { type: 'exponential', delay: 5000 }
    },
    limiter: { max: 60, duration: 3600000 },
    connection,
});
```

Also remove `'enrichDemoProfile'` from the `priorities.low` push (step 2 above) since it now has its own queue definition. Instead, the worker registration needs updating — add a dedicated worker in `run/workers/lowPriority.js` or register it alongside the existing low-priority workers. Check how `processHistoricalBlocks` is handled as a precedent.

- [ ] **Step 4: Commit**

```bash
git add run/jobs/index.js run/workers/priorities.js
git commit -m "feat: register enrichDemoProfile in job index and low priority queue"
```

## Chunk 3: Wire Up — Demo Creation & Email Templates

### Task 8: Enqueue enrichment from demo creation

**Files:**
- Modify: `run/api/demo.js`

- [ ] **Step 1: Add enrichment enqueue**

In `run/api/demo.js`, inside the `if (isDripEmailEnabled())` block (around line 235), after the `enqueue('sendDripEmail', ...)` call, add the enrichment enqueue. The enrichment is fire-and-forget, wrapped in its own try/catch:

```javascript
            // Enqueue profile enrichment (async, independent of drip emails)
            try {
                await enqueue('enrichDemoProfile', `enrichDemoProfile-${explorer.id}`, {
                    explorerId: explorer.id,
                    email: data.email,
                    rpcServer: data.rpcServer,
                    networkId: networkId ? String(networkId) : null
                });
            } catch (error) {
                logger.error(error.message, { location: 'api.demo.enrichDemoProfile', explorerId: explorer.id, error });
            }
```

- [ ] **Step 2: Commit**

```bash
git add run/api/demo.js
git commit -m "feat: enqueue enrichDemoProfile at demo creation"
```

### Task 9: Wire enrichment into sendDripEmail

**Files:**
- Modify: `run/jobs/sendDripEmail.js`

- [ ] **Step 1: Load enrichment and map to template params**

In `run/jobs/sendDripEmail.js`, after the migration URL generation block and before the `getEmailContent()` call, add enrichment loading. Modify the existing code around the `getEmailContent` call:

```javascript
    // Load enrichment for steps 3+ (personalized copy)
    let enrichmentData = {};
    if (step >= 3 && schedule && schedule.explorerId) {
        const explorer = await Explorer.findByPk(schedule.explorerId, { attributes: ['enrichment'] });
        if (explorer?.enrichment && !explorer.enrichment.error) {
            enrichmentData = {
                teamContext: explorer.enrichment.companyContext,
                tailoredBenefits: explorer.enrichment.tailoredBenefits,
                urgencyHook: explorer.enrichment.urgencyHook
            };
        }
    }
```

Then update the `getEmailContent` call to spread enrichment data:

```javascript
    const content = getEmailContent(step, {
        explorerSlug,
        explorerLink,
        migrateUrl,
        email,
        unsubscribeUrl,
        appDomain,
        activitySummary,
        teamContext,
        ...enrichmentData
    });
```

Also add the Explorer import at the top of the file:

```javascript
const { Explorer } = require('../models');
```

- [ ] **Step 2: Commit**

```bash
git add run/jobs/sendDripEmail.js
git commit -m "feat: load enrichment in sendDripEmail and map to template params"
```

### Task 10: Update email templates to use enrichment fields

**Files:**
- Modify: `run/emails/drip-content.js`

- [ ] **Step 1: Update step 3 to use tailoredBenefits**

In step 3, add a conditional paragraph above the comparison table:

```javascript
    3: (data) => {
        const subject = "Here's what you're missing on your chain";
        const benefitsIntro = data.tailoredBenefits
            ? `<p>${data.tailoredBenefits}</p>`
            : '';
        const content = `
            <h2>Demo vs. Paid: what you unlock</h2>
            ${benefitsIntro}
            <p>Your demo explorer gives you a taste. Here is what a paid plan adds:</p>
            ...
```

- [ ] **Step 2: Note: Step 4 needs no template change**

Step 4 already uses `data.teamContext` with a fallback to the generic social proof text. The enrichment mapping in `sendDripEmail.js` (Task 9) sets `teamContext: explorer.enrichment.companyContext`, so step 4 works automatically. No change needed.

- [ ] **Step 3: Update step 5 to use urgencyHook (HTML + text)**

In step 5, replace the static paragraph with a conditional in both htmlPart and textPart:

```javascript
    5: (data) => {
        const subject = 'Your explorer expires in 2 days';
        const urgencyHtml = data.urgencyHook
            ? `<p>${data.urgencyHook}</p><p>Start your 7-day free trial now to keep your explorer running. Your existing configuration transfers automatically.</p>`
            : `<p>Start your 7-day free trial now to keep your explorer running. Your existing configuration transfers automatically.</p>`;
        const urgencyText = data.urgencyHook
            ? `${data.urgencyHook}\n\nStart your 7-day free trial to keep it running: ${data.migrateUrl}`
            : `Your demo explorer ${data.explorerSlug} expires in 2 days. Start your 7-day free trial to keep it running: ${data.migrateUrl}`;
        const content = `
            <h2>Your demo is ending soon</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> expires in 2 days.</p>
            ${urgencyHtml}
            ...
        return {
            subject,
            textPart: `${urgencyText}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            ...
```

- [ ] **Step 4: Update step 6 to use urgencyHook (HTML + text)**

Same pattern for step 6:

```javascript
    6: (data) => {
        const subject = "Your demo expired, but your data doesn't have to";
        const restoreHtml = data.urgencyHook
            ? `<p>${data.urgencyHook}</p><p>Start a free trial now and we will restore your explorer instantly.</p>`
            : `<p>We are keeping your configuration for 48 hours. Start a free trial now and we will restore your explorer instantly.</p>`;
        const restoreText = data.urgencyHook
            ? `${data.urgencyHook}\n\nStart a free trial to restore it: ${data.migrateUrl}`
            : `Your demo explorer ${data.explorerSlug} has expired. We're keeping your configuration for 48 hours. Start a free trial to restore it: ${data.migrateUrl}`;
        const content = `
            <h2>Your demo has ended</h2>
            <p>Your explorer <strong>${data.explorerSlug}</strong> has expired.</p>
            ${restoreHtml}
            ...
        return {
            subject,
            textPart: `${restoreText}\n\nUnsubscribe: ${data.unsubscribeUrl}`,
            ...
```

- [ ] **Step 4: Update JSDoc to document new params**

Update the JSDoc for `getEmailContent` to include `urgencyHook`:

```javascript
 * @param {string} [data.urgencyHook] - Personalized urgency message for steps 5-6
 * @param {string} [data.tailoredBenefits] - Personalized benefits for step 3
```

- [ ] **Step 5: Commit**

```bash
git add run/emails/drip-content.js
git commit -m "feat: use enrichment fields in drip email templates with generic fallbacks"
```

### Task 11: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
docker compose -f docker-compose.dev.yml exec backend npx jest --no-coverage
```

Expected: All test suites pass. If any existing tests break, fix them (likely the sendDripEmail tests may need the Explorer mock).

- [ ] **Step 2: Fix any broken tests**

If `sendDripEmail` tests fail because of the new `Explorer.findByPk` call, add the Explorer mock to the existing test file.

- [ ] **Step 3: Commit any test fixes**

```bash
git add run/tests/
git commit -m "fix: update tests for enrichment integration"
```
