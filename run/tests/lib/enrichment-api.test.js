require('../mocks/lib/env');

const { searchCompany, generateSnippets } = require('../../lib/enrichment');

// Mock global fetch (Node 18+ has it built-in)
const originalFetch = global.fetch;

describe('searchCompany', () => {
    afterEach(() => { global.fetch = originalFetch; });

    it('returns search results from linkup', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ output: 'Acme Labs builds DeFi on Arbitrum' })
        });
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBe('Acme Labs builds DeFi on Arbitrum');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.linkup.so/v1/search',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('returns null on timeout', async () => {
        global.fetch = jest.fn().mockRejectedValueOnce(new Error('timeout'));
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBeNull();
    });

    it('returns null on non-200 response', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 500 });
        const result = await searchCompany('acmelabs.xyz');
        expect(result).toBeNull();
    });
});

describe('generateSnippets', () => {
    afterEach(() => { global.fetch = originalFetch; });

    it('returns parsed snippets from Claude tool_use response', async () => {
        const toolInput = {
            companyName: 'Acme Labs',
            companyDescription: 'DeFi lending on Arbitrum',
            companyContext: 'As a DeFi team...',
            tailoredBenefits: 'For lending protocols...',
            urgencyHook: 'Your lending explorer...'
        };
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                content: [{ type: 'tool_use', name: 'save_enrichment', input: toolInput }]
            })
        });
        const result = await generateSnippets('Acme builds DeFi', 'acmelabs.xyz', '42161');
        expect(result).toEqual(toolInput);
    });

    it('returns null when Claude returns no tool_use', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ content: [{ type: 'text', text: 'hello' }] })
        });
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });

    it('returns null on API failure', async () => {
        global.fetch = jest.fn().mockRejectedValueOnce(new Error('network error'));
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });
});
