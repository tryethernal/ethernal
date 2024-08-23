require('../mocks/lib/queue');
require('../mocks/lib/env');
require('../mocks/lib/rpc');
const { ExplorerV2Dex } = require('../mocks/models');

const { bulkEnqueue } = require('../../lib/queue');
const { DexFactoryConnector } = require('../../lib/rpc');
const processExplorerV2Dex = require('../../jobs/processExplorerV2Dex');

beforeEach(() => jest.clearAllMocks());

describe('processExplorerV2Dex', () => {
    it('Should return if cannot find dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce(null);
        processExplorerV2Dex({ data: { explorerDexId: 1 }})
            .then(res => {
                expect(res).toEqual('Could not find dex');
                done();
            });
    });

    it('Should return if hit trial limit', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            factoryAddress: '0x123',
            explorer: {
                workspace: { rpcServer: 'rpc' },
                stripeSubscription: { isTrialing: true }
            },
            countPairs: jest.fn().mockResolvedValueOnce(100)
        });
        DexFactoryConnector.mockImplementationOnce(() => ({
            allPairsLength: jest.fn().mockResolvedValueOnce(200)
        }));
        processExplorerV2Dex({ data: { explorerDexId: 1 }})
            .then(res => {
                expect(res).toEqual('All pairs processed 100 / 200');
                done();
            });
    });

    it('Should return if hit demo limit', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            factoryAddress: '0x123',
            isDemo: true,
            explorer: {
                isDemo: true,
                workspace: { rpcServer: 'rpc' },
                stripeSubscription: {}
            },
            countPairs: jest.fn().mockResolvedValueOnce(100)
        });
        DexFactoryConnector.mockImplementationOnce(() => ({
            allPairsLength: jest.fn().mockResolvedValueOnce(200)
        }));
        processExplorerV2Dex({ data: { explorerDexId: 1 }})
            .then(res => {
                expect(res).toEqual('All pairs processed 100 / 200');
                done();
            });
    });

    it('Should enqueue pairs processing', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            factoryAddress: '0x123',
            explorer: {
                workspace: { rpcServer: 'rpc' },
                stripeSubscription: {}
            },
            countPairs: jest.fn().mockResolvedValueOnce(0)
        });
        DexFactoryConnector.mockImplementationOnce(() => ({
            allPairsLength: jest.fn().mockResolvedValueOnce(2)
        }));
        processExplorerV2Dex({ data: { explorerDexId: 1 }})
            .then(res => {
                expect(res).toEqual(true);
                expect(bulkEnqueue).toBeCalledWith('processExplorerV2DexPair', [
                    {
                        name: 'processExplorerV2DexPair-1-0',
                        data: {
                            explorerDexId: 1,
                            pairIndex: 0
                        }
                    },
                    {
                        name: 'processExplorerV2DexPair-1-1',
                        data: {
                            explorerDexId: 1,
                            pairIndex: 1
                        }
                    }
                ]);
                done();
            });
    });
});
