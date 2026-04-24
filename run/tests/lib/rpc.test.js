require('../mocks/lib/trace');
require('../mocks/lib/ethers');
require('../mocks/lib/queue');

jest.mock('../../lib/rpcCapabilityCache', () => ({
    isTraceDisabled: jest.fn().mockResolvedValue(false),
    markTraceUnsupported: jest.fn().mockResolvedValue(undefined),
    markTraceSlow: jest.fn().mockResolvedValue(undefined),
    recordTraceTimeout: jest.fn().mockResolvedValue(undefined),
    recordTraceSuccess: jest.fn().mockResolvedValue(undefined),
}));

const ethers = require('ethers');
const { processTrace, parseTrace } = require('../../lib/trace');
const { bulkEnqueue } = require('../../lib/queue');
const rpcCapabilityCache = require('../../lib/rpcCapabilityCache');
const { ContractConnector, Tracer, ERC721Connector } = require('../../lib/rpc');

afterEach(() => jest.clearAllMocks());

describe('ERC721Connector', () => {
    const host = 'http://localhost:8545', address = '0x123';

    it('Should not all allow token fetching if instance is not enumerable', async () => {
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            supportsInterface: jest.fn().mockResolvedValue(false)
        });
        const connector = new ERC721Connector(host, address);
        expect(async () => {
            await connector.fetchAndStoreAllTokens(1);
        }).rejects.toThrow(new Error('This method is only available on ERC721 implemeting the Enumerable interface'));
    });

    it('Should not all allow token fetching if instance does not implement totalSupply', async () => {
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            supportsInterface: jest.fn().mockResolvedValue(true),
            totalSupply: jest.fn().mockResolvedValue(null)
        });
        const connector = new ERC721Connector(host, address);
        expect(async () => {
            await connector.fetchAndStoreAllTokens(1);
        }).rejects.toThrow(new Error(`totalSupply() doesn't seem to be implemented. Can't enumerate tokens`));
    });

    it('Should queue fetching for each token if instance is enumerable', async () => {
        jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
            supportsInterface: jest.fn().mockResolvedValue(true),
            totalSupply: jest.fn().mockResolvedValue('2'),
            tokenByIndex: jest.fn().mockResolvedValueOnce('1').mockResolvedValueOnce('2')
        });
        const connector = new ERC721Connector(host, address);
        
        await connector.fetchAndStoreAllTokens(1);

        expect(bulkEnqueue).toHaveBeenCalledWith('reloadErc721Token', [
            { name: `reloadErc721Token-1-0x123-1`, data: { workspaceId: 1, address: '0x123', tokenId: '1' }},
            { name: `reloadErc721Token-1-0x123-2`, data: { workspaceId: 1, address: '0x123', tokenId: '2' }},
        ]);
    });
});

describe('ContractConnector', () => {
    it('Should create an instance with a provider and a contract', () => {
        const connector = new ContractConnector('http://localhost:8545', '0x123', [{ fun: 'fun' }]);
        
        expect(connector.provider).toEqual(expect.objectContaining({ send: expect.anything() }));
        expect(connector.contract).toEqual(expect.objectContaining({
            name: expect.anything(),
            functions: expect.any(Object)
        }));
    });

    it('Should return the response when calling a read method', async () => {
        const connector = new ContractConnector('http://localhost:8545', '0x123', [{ fun: 'fun' }]);
        const res = await connector.callReadMethod('name', { 0: '0x123' }, { from: '0x123' });

        expect(res).toEqual('Ethernal');
    });
});

describe('Tracer', () => {
    it('Should create an instance with a provider', () => {
        const tracer = new Tracer('http://localhost:8545', {});
        expect(tracer.provider).toEqual(expect.objectContaining({ send: expect.anything() }));
    });

    it('Should set a parsed trace on the instance', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        await tracer.process({ hash: '0x123' });
        expect(tracer.parsedTrace).toEqual([{ op: 'CALL' }, { op: 'CALLSTATIC' }]);
    });

    it('Should throw an error if debug_traceTransaction is not available', () => {
        const rejectingProvider = {
            send: () => {
                return new Promise((_, rejects) => rejects('debug_traceTransaction is not available'));
            }
        };
        jest.spyOn(ethers.providers, 'JsonRpcProvider')
            .mockReturnValueOnce(rejectingProvider)
            .mockReturnValueOnce(rejectingProvider);

        const tracer = new Tracer('http://localhost:8543');

        return expect(tracer.process({ hash: '0x123' }))
            .rejects
            .toEqual('debug_traceTransaction is not available');
    });

    it('Should persist the trace in the db', async () => {
        const tracer = new Tracer('http://localhost:8546', {});

        await tracer.process({ hash: '0x123' });
        await tracer.saveTrace('123', 'hardhat');

        expect(processTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', [{ op: 'CALL' }, { op: 'CALLSTATIC' }], {});
    });

    it('Should not persist the trace in the db if it is invalid', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        parseTrace.mockResolvedValueOnce({ invalid: 'trace' });

        await tracer.process({ hash: '0x123' });
        await tracer.saveTrace('123', 'hardhat');

        expect(processTrace).not.toHaveBeenCalled();
    });

    it('Should throw RATE_LIMITED for HTTP 429 errors', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        const error = new Error('Too Many Requests');
        error.status = 429;
        jest.spyOn(tracer.provider, 'send').mockRejectedValueOnce(error);

        await expect(tracer.process({ hash: '0x123' })).rejects.toMatchObject({
            code: 'RATE_LIMITED',
            message: 'Rate limited by RPC provider'
        });
    });

    it('Should throw RATE_LIMITED for Hyperliquid rate limit errors', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        const error = new Error('rate limit exceeded');
        error.url = 'https://rpc.hyperliquid-testnet.xyz/evm';
        jest.spyOn(tracer.provider, 'send').mockRejectedValueOnce(error);

        await expect(tracer.process({ hash: '0x123' })).rejects.toMatchObject({
            code: 'RATE_LIMITED',
            message: 'Rate limited by RPC provider'
        });
    });

    it('Should throw TRANSIENT_RPC_ERROR for generic Hyperliquid failed response errors', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        const error = new Error('failed response (url="https://rpc.hyperliquid-testnet.xyz/evm", requestBody="{...}")');
        jest.spyOn(tracer.provider, 'send').mockRejectedValueOnce(error);

        await expect(tracer.process({ hash: '0x123' })).rejects.toMatchObject({
            code: 'TRANSIENT_RPC_ERROR',
            message: 'Transient RPC error (failed response)'
        });
    });

    describe('rpcCapabilityCache integration', () => {
        it('Should short-circuit and not call the RPC when the host is cached as disabled (other tracer)', async () => {
            rpcCapabilityCache.isTraceDisabled.mockResolvedValueOnce(true);
            const tracer = new Tracer('http://localhost:8545', {});
            const sendSpy = jest.spyOn(tracer.traceProvider, 'send');

            await tracer.process({ hash: '0x123' });

            expect(sendSpy).not.toHaveBeenCalled();
            expect(tracer.error).toEqual({
                message: 'RPC endpoint does not support debug_traceTransaction or is unreachable',
            });
        });

        it('Should short-circuit and not call the RPC when the host is cached as disabled (geth tracer)', async () => {
            rpcCapabilityCache.isTraceDisabled.mockResolvedValueOnce(true);
            const tracer = new Tracer('http://localhost:8545', {}, 'geth');
            const sendSpy = jest.spyOn(tracer.traceProvider, 'send');

            await tracer.process({ hash: '0x123' });

            expect(sendSpy).not.toHaveBeenCalled();
            expect(tracer.error).toEqual({
                message: 'RPC endpoint does not support debug_traceTransaction or is unreachable',
            });
        });

        it('Should mark the host unsupported when the RPC returns "Method not enabled"', async () => {
            const tracer = new Tracer('https://pre-rpc.bt.io/', {});
            const error = new Error('debug_traceTransaction is not enabled');
            jest.spyOn(tracer.traceProvider, 'send').mockRejectedValueOnce(error);

            await tracer.process({ hash: '0x123' });

            expect(rpcCapabilityCache.markTraceUnsupported).toHaveBeenCalledWith('https://pre-rpc.bt.io/');
        });

        it('Should mark the host unsupported when the inner error message says "does not exist"', async () => {
            const tracer = new Tracer('https://pre-rpc.bt.io/', {});
            const error = { error: { message: 'debug_traceTransaction does not exist' } };
            jest.spyOn(tracer.traceProvider, 'send').mockRejectedValueOnce(error);

            await tracer.process({ hash: '0x123' });

            expect(rpcCapabilityCache.markTraceUnsupported).toHaveBeenCalledWith('https://pre-rpc.bt.io/');
        });

        it('Should record a timeout against the host when withTimeout fires', async () => {
            const tracer = new Tracer('https://pre-rpc.bt.io/', {});
            const error = new Error('Timed out after 30000 ms.');
            jest.spyOn(tracer.traceProvider, 'send').mockRejectedValueOnce(error);

            await expect(tracer.process({ hash: '0x123' })).rejects.toBeDefined();

            expect(rpcCapabilityCache.recordTraceTimeout).toHaveBeenCalledWith('https://pre-rpc.bt.io/');
            expect(rpcCapabilityCache.markTraceUnsupported).not.toHaveBeenCalled();
        });

        it('Should record a successful trace so the timeout counter resets', async () => {
            const tracer = new Tracer('http://localhost:8545', {});

            await tracer.process({ hash: '0x123' });

            expect(rpcCapabilityCache.recordTraceSuccess).toHaveBeenCalledWith('http://localhost:8545');
        });
    });
});
