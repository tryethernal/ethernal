require('../mocks/lib/queue');
require('../mocks/lib/env');
require('../mocks/lib/abi');
require('../mocks/lib/rpc');
require('../mocks/lib/firebase');
const { V2DexPair, TransactionLog, V2DexPoolReserve } = require('../mocks/models');

const setupV2DexPoolReserves = require('../../jobs/setupV2DexPoolReserves');

beforeEach(() => jest.clearAllMocks());

describe('setupV2DexPoolReserves', () => {
    it('Should return if cannot find dex pair', (done) => {
        jest.spyOn(V2DexPair, 'findByPk').mockResolvedValueOnce(null);

        setupV2DexPoolReserves({ data: { v2DexPairId: 1 }})
            .then(res => {
                expect(res).toEqual('Could not find pair');
                done();
            });
    }); 

    it('Should create pool reserves in bulk', (done) => {
        jest.spyOn(V2DexPair, 'findByPk').mockResolvedValueOnce({
            id: 1,
            token0ContractId: 1,
            token1ContractId: 2,
            pair: { address: '0x123' },
            dex: { explorer: { workspaceId: 1 }},
        });
        jest.spyOn(TransactionLog, 'findAll').mockResolvedValueOnce([
            {
                id: 1,
                receipt: { transaction: { timestamp: 1 }}
            }
        ]);
        setupV2DexPoolReserves({ data: { v2DexPairId: 1 }})
            .then(res => {
                expect(res).toEqual(true);
                expect(V2DexPoolReserve.bulkCreate).toHaveBeenCalledWith([
                    {
                        v2DexPairId: 1,
                        transactionLogId: 1,
                        timestamp: 1,
                        reserve0: '10000',
                        reserve1: '20000',
                        token0ContractId: 1,
                        token1ContractId: 2,
                    }
                ]);
                done();
            });
    });
});
