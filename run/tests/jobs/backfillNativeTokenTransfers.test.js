require('../mocks/lib/queue');
require('../mocks/models');

const { Transaction, TokenTransfer, TransactionTraceStep, TokenBalanceChange, TokenTransferEvent } = require('../mocks/models');

const backfillNativeTokenTransfers = require('../../jobs/backfillNativeTokenTransfers');

beforeEach(() => jest.clearAllMocks());

describe('backfillNativeTokenTransfers', () => {
    it('Should create token transfers & events for validator and value', async () => {
        jest.spyOn(TokenTransfer, 'bulkCreate').mockResolvedValueOnce([
            {
                id: 1,
                amount: '1000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            },
            {
                id: 2,
                amount: '2000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0xabcd',
                isReward: false
            }
        ]);
        jest.spyOn(TokenTransferEvent, 'bulkCreate').mockResolvedValueOnce();
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: '2000000000000000000',
            tokenTransfers: [],
            traceSteps: [],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(true);

        expect(TokenTransfer.bulkCreate).toHaveBeenCalledWith([
            {
                transactionId: 1,
                workspaceId: 1,
                src: '0x123',
                dst: '0x456',
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                isReward: true
            },
            {
                transactionId: 1,
                workspaceId: 1,
                src: '0x123',
                dst: '0xabcd',
                amount: '2000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                isReward: false
            }
        ], { ignoreDuplicates: true, transaction: undefined });

        expect(TokenTransferEvent.bulkCreate).toHaveBeenCalledWith([
            {
                workspaceId: 1,
                tokenTransferId: 1,
                blockNumber: 1,
                timestamp: '1717000000',
                amount: '1000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            },
            {
                workspaceId: 1,
                tokenTransferId: 2,
                blockNumber: 1,
                timestamp: '1717000000',
                amount: '2000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0xabcd',
                isReward: false
            }
        ], { ignoreDuplicates: true, transaction: undefined });
    });

    it('Should not create token transfers & events for validator if it already exists', async () => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: 0,
            tokenTransfers: [
                {
                    id: 1,
                    amount: '1000000000000000000',
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    src: '0x123',
                    dst: '0x456',
                    isReward: true,
                    tokenBalanceChanges: [{ id: 1 }] // Has balance changes
                }
            ],
            traceSteps: [],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(false);
        expect(TokenTransfer.bulkCreate).not.toHaveBeenCalled();
        expect(TokenTransferEvent.bulkCreate).not.toHaveBeenCalled();
    });

    it('Should trigger afterCreate for existing reward token transfer without balance changes', async () => {
        const mockAfterCreate = jest.fn();
        const mockRewardTokenTransfer = {
            id: 1,
            amount: '1000000000000000000',
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            src: '0x123',
            dst: '0x456',
            isReward: true,
            tokenBalanceChanges: [], // No balance changes
            afterCreate: mockAfterCreate
        };

        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: 0,
            tokenTransfers: [mockRewardTokenTransfer],
            traceSteps: [],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(false);
        expect(TokenTransfer.bulkCreate).not.toHaveBeenCalled();
        expect(TokenTransferEvent.bulkCreate).not.toHaveBeenCalled();
        expect(mockAfterCreate).toHaveBeenCalledWith({ transaction: undefined });
    });

    it('Should not create token transfers & events for value if it already exists', async () => {
        jest.spyOn(TokenTransfer, 'bulkCreate').mockResolvedValueOnce([
            {
                id: 1,
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            }
        ]);
        jest.spyOn(TokenTransferEvent, 'bulkCreate').mockResolvedValueOnce();
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: '2000000000000000000',
            tokenTransfers: [
                {
                    id: 1,
                    amount: '2000000000000000000',
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    src: '0x123',
                    dst: '0x456',
                    isReward: false,
                    tokenBalanceChanges: [{ id: 1 }] // Has balance changes
                }
            ],
            traceSteps: [],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(true);
        expect(TokenTransfer.bulkCreate).toHaveBeenCalledWith([
            {
                transactionId: 1,
                workspaceId: 1,
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            }
        ], { ignoreDuplicates: true, transaction: undefined });

        expect(TokenTransferEvent.bulkCreate).toHaveBeenCalledWith([{
            workspaceId: 1,
            tokenTransferId: 1,
            blockNumber: 1,
            timestamp: '1717000000',
            amount: '999999999990000000000000000000000000',
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            src: '0x123',
            dst: '0x456',
            isReward: true
        }], { ignoreDuplicates: true, transaction: undefined });
    });

    it('Should trigger afterCreate for existing value token transfer without balance changes', async () => {
        const mockAfterCreate = jest.fn();
        const mockValueTokenTransfer = {
            id: 1,
            amount: '2000000000000000000',
            token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            src: '0x123',
            dst: '0xabcd',
            isReward: false,
            tokenBalanceChanges: [], // No balance changes
            afterCreate: mockAfterCreate
        };

        jest.spyOn(TokenTransfer, 'bulkCreate').mockResolvedValueOnce([
            {
                id: 2,
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            }
        ]);
        jest.spyOn(TokenTransferEvent, 'bulkCreate').mockResolvedValueOnce();
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: '2000000000000000000',
            tokenTransfers: [mockValueTokenTransfer],
            traceSteps: [],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(true);
        expect(TokenTransfer.bulkCreate).toHaveBeenCalledWith([
            {
                transactionId: 1,
                workspaceId: 1,
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            }
        ], { ignoreDuplicates: true, transaction: undefined });
        expect(mockAfterCreate).toHaveBeenCalledWith({ transaction: undefined });
    });

    it('Should create token transfers for internal transactions with value', async () => {
        jest.spyOn(TokenTransfer, 'bulkCreate').mockResolvedValueOnce([
            {
                id: 1,
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            },
            {
                id: 2,
                amount: '1000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0xabcd',
                dst: '0x123abc',
                isReward: false
            }
        ]);
        jest.spyOn(TokenTransferEvent, 'bulkCreate').mockResolvedValueOnce();
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: 0,
            tokenTransfers: [],
            traceSteps: [
                {
                    depth: 1,
                    value: '1000000000000000000',
                    address: '0x123abc'
                }
            ],
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(true);

        expect(TokenTransfer.bulkCreate).toHaveBeenCalledWith([
            {
                transactionId: 1,
                workspaceId: 1,
                src: '0x123',
                dst: '0x456',
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                isReward: true
            },
            {
                transactionId: 1,
                workspaceId: 1,
                src: '0xabcd',
                dst: '0x123abc',
                amount: '1000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                isReward: false
            }
        ], { ignoreDuplicates: true, transaction: undefined });

        expect(TokenTransferEvent.bulkCreate).toHaveBeenCalledWith([
            {
                workspaceId: 1,
                tokenTransferId: 1,
                blockNumber: 1,
                timestamp: '1717000000',
                amount: '999999999990000000000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0x123',
                dst: '0x456',
                isReward: true
            },
            {
                workspaceId: 1,
                tokenTransferId: 2,
                blockNumber: 1,
                timestamp: '1717000000',
                amount: '1000000000000000000',
                token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                src: '0xabcd',
                dst: '0x123abc',
                isReward: false
            }
        ], { ignoreDuplicates: true, transaction: undefined });
    });

    it('Should handle missing transactionId parameter', async () => {
        const res = await backfillNativeTokenTransfers({ data: {} });
        expect(res).toEqual('Missing parameter');
    });

    it('Should return false when no token transfers are created', async () => {
        jest.spyOn(Transaction, 'findByPk').mockResolvedValueOnce({
            id: 1,
            workspaceId: 1,
            blockNumber: 1,
            from: '0x123',
            to: '0xabcd',
            timestamp: '1717000000',
            type: 2,
            value: 0,
            tokenTransfers: [
                {
                    id: 1,
                    amount: '1000000000000000000',
                    token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                    src: '0x123',
                    dst: '0x456',
                    isReward: true,
                    tokenBalanceChanges: [{ id: 1 }] // Has balance changes
                }
            ],
            traceSteps: [], // No trace steps with value
            block: {
                baseFeePerGas: '10000000',
                miner: '0x456'
            },
            receipt: {
                gasUsed: '1000000000000000000',
                raw: {
                    effectiveGasPrice: '1000000000000000000'
                }
            }
        });

        const res = await backfillNativeTokenTransfers({ data: { transactionId: 1 }});

        expect(res).toBe(false);
        expect(TokenTransfer.bulkCreate).not.toHaveBeenCalled();
        expect(TokenTransferEvent.bulkCreate).not.toHaveBeenCalled();
    });
});
