require('../mocks/lib/queue');
require('../mocks/lib/logger');
require('../mocks/models');

const { OpDeposit, Transaction } = require('../mocks/models');
const linkOpDepositsToL2Txs = require('../../jobs/linkOpDepositsToL2Txs');

jest.mock('../../lib/queue');
jest.mock('../../lib/logger');

beforeEach(() => jest.clearAllMocks());

describe('linkOpDepositsToL2Txs', () => {
    let mockDeposits;
    let mockL2Transaction;

    beforeEach(() => {
        jest.clearAllMocks();

        mockL2Transaction = {
            id: 1001,
            workspaceId: 101,
            hash: '0x' + 'a'.repeat(64)
        };

        mockDeposits = [
            {
                id: 1,
                workspaceId: 101,
                status: 'pending',
                l2TransactionHash: '0x' + 'a'.repeat(64),
                l2TransactionId: null,
                update: jest.fn().mockResolvedValue(true)
            },
            {
                id: 2,
                workspaceId: 101,
                status: 'pending',
                l2TransactionHash: '0x' + 'b'.repeat(64),
                l2TransactionId: null,
                update: jest.fn().mockResolvedValue(true)
            }
        ];

        OpDeposit.findAll.mockResolvedValue(mockDeposits);
        Transaction.findAll.mockResolvedValue([mockL2Transaction]);
    });

    describe('basic functionality', () => {
        it('should find pending deposits with L2 transaction hash but no L2 transaction ID', async () => {
            await linkOpDepositsToL2Txs();

            expect(OpDeposit.findAll).toHaveBeenCalledWith({
                where: {
                    status: 'pending',
                    l2TransactionId: null,
                    l2TransactionHash: expect.any(Object)
                },
                limit: 100
            });
        });

        it('should batch lookup L2 transactions by hash', async () => {
            await linkOpDepositsToL2Txs();

            expect(Transaction.findAll).toHaveBeenCalledWith({
                where: { hash: { [require('sequelize').Op.in]: expect.any(Array) } },
                attributes: ['id', 'hash', 'workspaceId']
            });
        });

        it('should update deposit with L2 transaction ID and confirm status', async () => {
            await linkOpDepositsToL2Txs();

            expect(mockDeposits[0].update).toHaveBeenCalledWith({
                l2TransactionId: 1001,
                status: 'confirmed'
            });
        });

        it('should return count of linked deposits', async () => {
            Transaction.findAll.mockResolvedValue([
                mockL2Transaction,
                { id: 1002, workspaceId: 101, hash: '0x' + 'b'.repeat(64) }
            ]);

            const result = await linkOpDepositsToL2Txs();

            expect(result).toBe('Linked 2 OP deposits to L2 transactions');
        });
    });

    describe('no deposits to link', () => {
        it('should return appropriate message when no deposits need linking', async () => {
            OpDeposit.findAll.mockResolvedValue([]);

            const result = await linkOpDepositsToL2Txs();

            expect(result).toBe('No deposits to link');
        });
    });

    describe('L2 transaction not found', () => {
        it('should not update deposit when L2 transaction is not found', async () => {
            Transaction.findAll.mockResolvedValue([]);

            const result = await linkOpDepositsToL2Txs();

            expect(mockDeposits[0].update).not.toHaveBeenCalled();
            expect(result).toBe('Linked 0 OP deposits to L2 transactions');
        });
    });

    describe('mixed results', () => {
        it('should only count deposits that were actually linked', async () => {
            // Only first deposit's L2 tx found
            Transaction.findAll.mockResolvedValue([mockL2Transaction]);

            const result = await linkOpDepositsToL2Txs();

            expect(mockDeposits[0].update).toHaveBeenCalled();
            expect(mockDeposits[1].update).not.toHaveBeenCalled();
            expect(result).toBe('Linked 1 OP deposits to L2 transactions');
        });
    });

    describe('error handling', () => {
        it('should throw error if findAll fails', async () => {
            OpDeposit.findAll.mockRejectedValue(new Error('Database error'));

            await expect(linkOpDepositsToL2Txs()).rejects.toThrow('Database error');
        });

        it('should continue processing if one deposit fails', async () => {
            Transaction.findAll.mockResolvedValue([
                mockL2Transaction,
                { id: 1002, workspaceId: 101, hash: '0x' + 'b'.repeat(64) }
            ]);
            mockDeposits[0].update.mockRejectedValue(new Error('Update failed'));

            const result = await linkOpDepositsToL2Txs();

            expect(mockDeposits[1].update).toHaveBeenCalled();
            expect(result).toBe('Linked 1 OP deposits to L2 transactions');
        });
    });

    describe('batch processing', () => {
        it('should limit processing to 100 deposits at a time', async () => {
            await linkOpDepositsToL2Txs();

            expect(OpDeposit.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 100
                })
            );
        });
    });
});
