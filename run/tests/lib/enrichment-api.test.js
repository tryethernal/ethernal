require('../mocks/lib/env');

const { searchCompany, generateSnippets } = require('../../lib/enrichment');

const originalFetch = global.fetch;

jest.mock('@anthropic-ai/sdk', () => {
    const mockCreate = jest.fn();
    return jest.fn().mockImplementation(() => ({
        messages: { create: mockCreate }
    }));
});
const Anthropic = require('@anthropic-ai/sdk');

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
    let mockCreate;

    beforeEach(() => {
        mockCreate = new Anthropic().messages.create;
        mockCreate.mockReset();
    });

    it('returns parsed snippets from Anthropic tool_use response', async () => {
        const toolInput = {
            companyName: 'Acme Labs',
            companyDescription: 'DeFi lending on Arbitrum',
            companyContext: 'As a DeFi team...',
            tailoredBenefits: 'For lending protocols...',
            expirationWarning: 'You will lose...',
            recoveryHook: 'Your data is still recoverable...'
        };
        mockCreate.mockResolvedValueOnce({
            content: [{ type: 'tool_use', name: 'save_enrichment', input: toolInput }]
        });

        const result = await generateSnippets('Acme builds DeFi', 'acmelabs.xyz', '42161');
        expect(result).toEqual(toolInput);
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'claude-haiku-4-5',
            tools: expect.any(Array),
            tool_choice: { type: 'tool', name: 'save_enrichment' }
        }));
    });

    it('returns null when no tool_use in response', async () => {
        mockCreate.mockResolvedValueOnce({
            content: [{ type: 'text', text: 'hello' }]
        });
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });

    it('returns null on API failure', async () => {
        mockCreate.mockRejectedValueOnce(new Error('api error'));
        const result = await generateSnippets('research', 'acmelabs.xyz', '1');
        expect(result).toBeNull();
    });
});
