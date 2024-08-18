require('../mocks/lib/queue');
require('../mocks/lib/env');
require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
const { ExplorerV2Dex, V2DexPair } = require('../mocks/models');

const db = require('../../lib/firebase');
const { DexFactoryConnector } = require('../../lib/rpc');
const processExplorerV2DexPair = require('../../jobs/processExplorerV2DexPair');

beforeEach(() => jest.clearAllMocks());

describe('processExplorerV2DexPair', () => {
    it('Should return if cannot find dex', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce(null);

        processExplorerV2DexPair({ data: { explorerDexId: 1, pairIndex: 0 }})
            .then(res => {
                expect(res).toEqual('Could not find dex');
                done();
            });
    });

    it('Should return if cannot find tokens address', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: {
                workspace: { rpcServer: 'rpc' }
            }
        });
        DexFactoryConnector.mockImplementation(() => ({
            allPairs: jest.fn().mockResolvedValue('0x123'),
            token0Of: jest.fn().mockResolvedValue('0x456'),
            token1Of: jest.fn().mockResolvedValue(null)
        }));

        processExplorerV2DexPair({ data: { explorerDexId: 1, pairIndex: 0 }})
            .then(res => {
                expect(res).toEqual('Could not find token0 or token1');
                done();
            });
    });

    it('Should return if pair already exists', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: {
                workspace: { rpcServer: 'rpc' }
            }
        });
        DexFactoryConnector.mockImplementation(() => ({
            allPairs: jest.fn().mockResolvedValue('0x123'),
            token0Of: jest.fn().mockResolvedValue('0x456'),
            token1Of: jest.fn().mockResolvedValue('0x789')
        }));
        jest.spyOn(V2DexPair, 'findOne').mockResolvedValueOnce({ id: 1 });

        processExplorerV2DexPair({ data: { explorerDexId: 1, pairIndex: 0 }})
            .then(res => {
                expect(res).toEqual('Pair already exists');
                done();
            });
    });

    it('Should return created pair', (done) => {
        jest.spyOn(ExplorerV2Dex, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: {
                workspace: { rpcServer: 'rpc' }
            }
        });
        DexFactoryConnector.mockImplementation(() => ({
            allPairs: jest.fn().mockResolvedValue('0x123'),
            token0Of: jest.fn().mockResolvedValue('0x456'),
            token1Of: jest.fn().mockResolvedValue('0x789')
        }));
        jest.spyOn(V2DexPair, 'findOne').mockResolvedValueOnce(null);

        processExplorerV2DexPair({ data: { explorerDexId: 1, pairIndex: 0 }})
            .then(() => {
                expect(db.createV2DexPair).toHaveBeenCalledWith(1, '0x456', '0x789', '0x123');
                done();
            });
    });
});
