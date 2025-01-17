require('../mocks/lib/rpc');
const { TokenTransfer } = require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');

const db = require('../../lib/firebase');
const { getBalanceChange } = require('../../lib/rpc');
const processTokenTransfer = require('../../jobs/processTokenTransfer');

afterEach(() => jest.clearAllMocks());

const safeCreateBalanceChange = jest.fn();

describe('processTokenTransfer', () => {
    getBalanceChange.mockResolvedValue({ diff: '1234' });

    jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
        id: 1,
        src: '0x123',
        dst: '0x456',
        workspace: {
            public: true,
            name: 'remote',
            rpcServer: 'http://localhost:8545',
            user: {
                firebaseUserId: '123'
            },
        },
        transaction: {
            blockNumber: 1
        },
        safeCreateBalanceChange
    });

    it('Should call balance change twice and store', (done) => {
        processTokenTransfer({ data : { tokenTransferId: 1 }})
            .then(() => {
                expect(getBalanceChange).toHaveBeenCalledTimes(2);
                expect(safeCreateBalanceChange).toHaveBeenNthCalledWith(1, { diff: '1234' });
                expect(safeCreateBalanceChange).toHaveBeenNthCalledWith(2, { diff: '1234' });
                done();
            });
    });

    it('Should call balance change once and store', (done) => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x0000000000000000000000000000000000000000',
            dst: '0x456',
            workspace: {
                public: true,
                name: 'remote',
                rpcServer: 'http://localhost:8545',
                user: {
                    firebaseUserId: '123'
                },
            },
            transaction: {
                blockNumber: 1
            },
            safeCreateBalanceChange
        });
        processTokenTransfer({ data : { tokenTransferId: 1 }})
            .then(() => {
                expect(getBalanceChange).toHaveBeenCalledTimes(1);
                expect(safeCreateBalanceChange).toHaveBeenCalledWith({ diff: '1234' });
                done();
            });
    });

    it('Should fail if token transfer cannot be found', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue(null);

        const res = await processTokenTransfer({ data : { tokenTransferId: 1 }});
        expect(res).toEqual('Cannot find token transfer');
    });
});
