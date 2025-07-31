require('../mocks/lib/rpc');
const { TokenTransfer } = require('../mocks/models');
require('../mocks/lib/queue');
require('../mocks/lib/firebase');

const { getBalanceChange, getNativeBalanceChange } = require('../../lib/rpc');
const processTokenTransfer = require('../../jobs/processTokenTransfer');

afterEach(() => jest.clearAllMocks());

const safeCreateBalanceChanges = jest.fn();

describe('processTokenTransfer', () => {
    beforeEach(() => {
        getBalanceChange.mockResolvedValue({ diff: '1234' });
        getNativeBalanceChange.mockResolvedValue({ diff: '1234' });
    });

    it('Should call native balance change for both addresses in parallel', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValueOnce({
            id: 1,
            src: '0x123',
            dst: '0x456',
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            workspace: {
                public: true,
                processNativeTokenTransfers: true,
                name: 'remote',
                rpcServer: 'http://localhost:8545',
                user: {
                    firebaseUserId: '123'
                },
            },
            transaction: {
                blockNumber: 1
            },
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getNativeBalanceChange).toHaveBeenCalledTimes(2);
        expect(getNativeBalanceChange).toHaveBeenCalledWith('0x123', 1, 'http://localhost:8545');
        expect(getNativeBalanceChange).toHaveBeenCalledWith('0x456', 1, 'http://localhost:8545');
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }, { diff: '1234' }]);
    });

    it('Should call balance change twice in parallel and store in batch', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValueOnce({
            id: 1,
            src: '0x123',
            dst: '0x456',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(2);
        expect(getBalanceChange).toHaveBeenCalledWith('0x123', '0x9999999999999999999999999999999999999999', 1, 'http://localhost:8545');
        expect(getBalanceChange).toHaveBeenCalledWith('0x456', '0x9999999999999999999999999999999999999999', 1, 'http://localhost:8545');
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }, { diff: '1234' }]);
    });

    it('Should call balance change once for non-zero destination and store in batch', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x0000000000000000000000000000000000000000',
            dst: '0x456',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });
        
        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(1);
        expect(getBalanceChange).toHaveBeenCalledWith('0x456', '0x9999999999999999999999999999999999999999', 1, 'http://localhost:8545');
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }]);
    });

    it('Should not create balance changes when all diffs are zero', async () => {
        getBalanceChange.mockResolvedValue({ diff: '0' });
        
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x456',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(2);
        expect(safeCreateBalanceChanges).not.toHaveBeenCalled();
    });

    it('Should handle mixed zero and non-zero diffs correctly', async () => {
        getBalanceChange
            .mockResolvedValueOnce({ diff: '1234' })
            .mockResolvedValueOnce({ diff: '0' });
        
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x456',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(2);
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }]);
    });

    it('Should handle retry logic for transient errors', async () => {
        // Mock first call to fail, second to succeed
        getBalanceChange
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ diff: '1234' });
        
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x0000000000000000000000000000000000000000',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(2); // 1 initial failure + 1 success
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }]);
    });

    it('Should handle retry logic with multiple failures before success', async () => {
        // Mock first two calls to fail, third to succeed
        getBalanceChange
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Timeout error'))
            .mockResolvedValueOnce({ diff: '1234' });
        
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x0000000000000000000000000000000000000000',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }]);
    });

    it('Should handle permanent errors and continue processing other addresses', async () => {
        // Mock one address to fail with permanent error, other to succeed
        getBalanceChange
            .mockRejectedValueOnce(new Error('missing revert data in call exception'))
            .mockResolvedValueOnce({ diff: '1234' });
        
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x456',
            token: '0x9999999999999999999999999999999999999999',
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
            safeCreateBalanceChanges
        });

        await processTokenTransfer({ data : { tokenTransferId: 1 }});
        
        expect(getBalanceChange).toHaveBeenCalledTimes(2);
        expect(safeCreateBalanceChanges).toHaveBeenCalledWith([{ diff: '1234' }]);
    });

    it('Should fail if token transfer cannot be found', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue(null);

        const res = await processTokenTransfer({ data : { tokenTransferId: 1 }});
        expect(res).toEqual('Cannot find token transfer');
    });

    it('Should not process private workspaces', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x456',
            workspace: {
                public: false,
                name: 'private',
                rpcServer: 'http://localhost:8545'
            },
            transaction: {
                blockNumber: 1
            }
        });

        const res = await processTokenTransfer({ data : { tokenTransferId: 1 }});
        expect(res).toEqual('Not processing private workspaces');
    });

    it('Should handle missing transaction', async () => {
        jest.spyOn(TokenTransfer, 'findByPk').mockResolvedValue({
            id: 1,
            src: '0x123',
            dst: '0x456',
            workspace: {
                public: true,
                name: 'remote',
                rpcServer: 'http://localhost:8545'
            },
            transaction: null
        });

        const res = await processTokenTransfer({ data : { tokenTransferId: 1 }});
        expect(res).toEqual('Could not find transaction');
    });

    it('Should handle missing tokenTransferId parameter', async () => {
        const res = await processTokenTransfer({ data : {} });
        expect(res).toEqual('Missing parameter.');
    });
});
