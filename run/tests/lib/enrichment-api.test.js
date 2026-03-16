require('../mocks/lib/env');

const { searchCompany, generateSnippets } = require('../../lib/enrichment');

// Mock global fetch for linkup tests
const originalFetch = global.fetch;

// Mock child_process for claude CLI tests
jest.mock('child_process', () => ({
    execSync: jest.fn()
}));
const { execSync } = require('child_process');

describe('searchCompany', () => {
    afterEach(() => { global.fetch = originalFetch; });

    it('returns search results from linkup', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ answer: 'Acme Labs builds DeFi on Arbitrum' })
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
    afterEach(() => jest.restoreAllMocks());

    it('returns parsed snippets from Claude CLI response', async () => {
        const snippets = {
            companyName: 'Acme Labs',
            companyDescription: 'DeFi lending on Arbitrum',
            companyContext: 'As a DeFi team...',
            tailoredBenefits: 'For lending protocols...',
            urgencyHook: 'Your lending explorer...'
        };
        execSync.mockReturnValueOnce(JSON.stringify({ result: JSON.stringify(snippets) }));

        const result = await generateSnippets('Acme builds DeFi', 'acmelabs.xyz', '42161');
        expect(result).toEqual(snippets);
    });

    it('returns null when Claude returns invalid JSON', async () => {
        execSync.mockReturnValueOnce(JSON.stringify({ result: 'not json at all' }));
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });

    it('returns null on CLI failure', async () => {
        execSync.mockImplementationOnce(() => { throw new Error('command failed'); });
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });
});
