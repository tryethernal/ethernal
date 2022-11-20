require('../mocks/lib/trace');
require('../mocks/lib/ethers');
require('../mocks/lib/queue');
const ethers = require('ethers');
const { processTrace, parseTrace } = require('../../lib/trace');
const { enqueue } = require('../../lib/queue');
const { ContractConnector, Tracer, ERC721Connector } = require('../../lib/rpc');
const ERC721_ABI = require('../../lib/abis/erc721.json');
const ERC721_ENUMERABLE_ABI = require('../../lib/abis/erc721Enumerable.json');
const ERC721_METADATA_ABI = require('../../lib/abis/erc721Metadata.json');

afterEach(() => jest.clearAllMocks());

describe('ERC721Connector', () => {
    const host = 'http://localhost:8545', address = '0x123';

    it('Should create an instance with a provider, a contract and base erc721 abi', () => {
        const connector = new ERC721Connector(host, address);
        expect(connector.provider).toEqual(expect.objectContaining({ send: expect.anything() }));
        expect(connector.contract).toEqual(expect.objectContaining({
            name: expect.anything(),
            functions: expect.any(Object)
        }));
        expect(connector.abi).toEqual(ERC721_ABI);
    });

    it('Should create an instance with erc721 metadata abi', () => {
        const connector = new ERC721Connector(host, address, { metadata: true });
        expect(connector.abi).toEqual([...ERC721_ABI, ...ERC721_METADATA_ABI]);
    });

    it('Should create an instance with erc721 enumerable abi', () => {
        const connector = new ERC721Connector(host, address, { enumerable: true });
        expect(connector.abi).toEqual([...ERC721_ABI, ...ERC721_ENUMERABLE_ABI]);
    });

    it('Should not all allow token fetching if instance is not enumerable', async () => {
        const connector = new ERC721Connector(host, address);
        expect(async () => {
            await connector.fetchAndStoreAllTokens(1);
        }).rejects.toThrow(new Error('This method is only available on ERC721 implemeting the Enumerable interface'));
    });

    it('Should queue fetching for each token if instance is enumerable', async () => {
        const connector = new ERC721Connector(host, address, { enumerable: true });
        jest.spyOn(connector, 'totalSupply').mockResolvedValueOnce(2);
        
        await connector.fetchAndStoreAllTokens(1);

        expect(enqueue).toHaveBeenCalledTimes(2);
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
        expect(tracer.parsedTrace).toEqual([{ op: 'CALL' }, { op: 'CALLSTATIC' }]);
    });

    it('Should throw an error if debug_traceTransaction is not available', () => {
        jest.spyOn(ethers.providers, 'JsonRpcProvider').mockReturnValueOnce({
            send: () => {
                return new Promise((_, rejects) => rejects('debug_traceTransaction is not available'));
            }
        });

        const tracer = new Tracer('http://localhost:8545');

        return expect(tracer.process({ hash: '0x123' }))
            .rejects
            .toEqual('debug_traceTransaction is not available');
    });

    it('Should persist the trace in the db', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        
        await tracer.process({ hash: '0x123' });
        await tracer.saveTrace('123', 'hardhat');

        expect(processTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', [{ op: 'CALL' }, { op: 'CALLSTATIC' }], {});
    });

    it('Should not persist the trace in the db if it is invalid', async () => {
        const tracer = new Tracer('http://localhost:8545', {});
        parseTrace.mockResolvedValueOnce({ invalid: 'trace' });
        
        await tracer.process({ hash: '0x123' });
        await tracer.saveTrace('123', 'hardhat');

        expect(processTrace).not.toHaveBeenCalled();
    });
});
