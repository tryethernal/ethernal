const rewire = require('rewire');

jest.mock('../../lib/trace', () => ({
    parseTrace: jest.fn().mockResolvedValue({ trace: 1 }),
    storeTrace: jest.fn()
}));

const wiredRpc = rewire('../../lib/rpc');

const { ethers } = require('../mocks/ethers');
const { storeTrace } = require('../../lib/trace');
const { ContractConnector, Tracer } = require('../../lib/rpc');

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
        const tracer = new Tracer('http://localhost:8545');
        expect(tracer.provider).toEqual(expect.objectContaining({ send: expect.anything() }));
    });

    it('Should set a parsed trace on the instance', async () => {
        const tracer = new Tracer('http://localhost:8545');
        await tracer.process({ hash: '0x123' });
        expect(tracer.parsedTrace).toEqual({ trace: 1 });
    });

    it('Should throw an error if debug_traceTransaction is not available', () => {
        wiredRpc.__set__({
            getProvider: () => ({ send: jest.fn().mockRejectedValue({ error: { code: '-32601' }})})
        });

        const tracer = new wiredRpc.Tracer('http://localhost:8545');

        return expect(tracer.process({ hash: '0x123' }))
            .rejects
            .toEqual('debug_traceTransaction is not available');
    });

    it('Should persist the trace in the db', async () => {
        const tracer = new Tracer('http://localhost:8545');
        await tracer.process({ hash: '0x123' });
        await tracer.saveTrace('123', 'hardhat');

        expect(storeTrace).toHaveBeenCalledWith('123', 'hardhat', '0x123', { trace: 1 });
    });
});
