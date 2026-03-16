require('../mocks/lib/env');
require('../mocks/lib/queue');

const { Explorer } = require('../../models');
const enrichment = require('../../lib/enrichment');
const enrichDemoProfile = require('../../jobs/enrichDemoProfile');

jest.mock('../../lib/enrichment');

describe('enrichDemoProfile', () => {
    beforeEach(() => {
        enrichment.resolveDomain.mockReset();
        enrichment.searchCompany.mockReset();
        enrichment.generateSnippets.mockReset();
    });
    afterEach(() => jest.restoreAllMocks());

    it('enriches explorer with corporate email', async () => {
        const mockExplorer = { id: 1, update: jest.fn() };
        jest.spyOn(Explorer, 'findByPk').mockResolvedValueOnce(mockExplorer);
        jest.spyOn(Explorer, 'findOne').mockResolvedValueOnce(null);

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

    it('skips when API keys not configured', async () => {
        const { getLinkupApiKey } = require('../../lib/env');
        getLinkupApiKey.mockReturnValueOnce(null);
        const spy = jest.spyOn(Explorer, 'findByPk');

        await enrichDemoProfile({ data: { explorerId: 1, email: 'john@acmelabs.xyz', rpcServer: null, networkId: '1' } });

        expect(spy).not.toHaveBeenCalled();
    });
});
