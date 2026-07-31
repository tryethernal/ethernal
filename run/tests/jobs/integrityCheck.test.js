jest.mock('moment', () => {
    const original = jest.requireActual('moment');
    original.unix = jest.fn(() => ({ diff: jest.fn(() => 200) }));
    return original;
});
const { Workspace } = require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/lib/queueCaps');
require('../mocks/lib/logger');

require('../../lib/firebase');
const { enqueue, bulkEnqueue } = require('../../lib/queue');
const queueCaps = require('../../lib/queueCaps');
const logger = require('../../lib/logger');
const integrityCheck = require('../../jobs/integrityCheck');

beforeEach(() => jest.clearAllMocks());

const job = { data: { workspaceId: 1 }};
const hasReachedTransactionQuota = jest.fn().mockResolvedValue(false);

describe('integrityCheck', () => {
    it('Should return message saying integrity checks are disabled', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ skipIntegrityCheck: true, integrityCheckStartBlockNumber: 0, public: true });

        expect(await integrityCheck(job)).toEqual('Integrity check disabled');
    });

    it('Should return message saying sync is disabled', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ explorer: { shouldSync: false }, integrityCheckStartBlockNumber: 0, public: true });

        expect(await integrityCheck(job)).toEqual('Sync is disabled');
    });

    it('Should return message saying there is no explorer', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ integrityCheckStartBlockNumber: 0, public: true });

        expect(await integrityCheck(job)).toEqual('Should have an explorer associated');
    });

    it('Should return a message saying integrity checks are not enabled', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ integrityCheckStartBlockNumber: null, explorer: { shouldSync: true }, public: true });

        expect(await integrityCheck(job)).toEqual('Integrity checks not enabled');
    });

    it('Should return a message saying no check on demo', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ integrityCheckStartBlockNumber: null, explorer: { shouldSync: true, isDemo: true }, public: true });

        expect(await integrityCheck(job)).toEqual('No check on demo explorers');
    });

    it('Should return a message saying blocks have not been synced', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getBlocks: jest.fn().mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 0,
            public: true
        });

        expect(await integrityCheck(job)).toEqual('No block synced yet');
    });

    it('Should return a message saying transaction quota has been reached', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            getExpiredBlocks: jest.fn(() => ([])),
            explorer: { hasReachedTransactionQuota: hasReachedTransactionQuota.mockResolvedValueOnce(true), shouldSync: true },
            getBlocks: jest.fn().mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 0,
            public: true
        });

        expect(await integrityCheck(job)).toEqual('Transaction quota reached');
    });

    it('Should enqueue the first block and exit if the lower block does not exist', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 5,
            public: true,
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' }
        });

        await integrityCheck(job);

        expect(enqueue).toHaveBeenCalledWith('blockSync', 'blockSync-1-5', {
            workspaceId: 1,
            blockNumber: 5,
            source: 'integrityCheck'
        }, 1);
    });

    it('Should return if no latest ready block', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 1, number: 1 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: {}},
            id: 1,
            public: true,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce(null)
        });

        expect(await integrityCheck(job)).toEqual('Invalid latest ready block');
    });

    it('Should start recovery', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 1 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: { number: 1 }, updatedAt: new Date() },
            id: 1,
            public: true,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 1, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([]),
            safeCreateOrUpdateIntegrityCheck: jest.fn().mockResolvedValueOnce(true)
        });

        await integrityCheck(job);

        expect(enqueue).toHaveBeenCalledWith('batchBlockSync', 'batchBlockSync-1-2-4', {
            userId: '123',
            workspace: 'hardhat',
            workspaceId: 1,
            from: 2,
            to: 4,
            source: 'recovery'
        });
    });

    it('Should enqueue gaps and update cursor', async () => {
        // BEHAVIOUR CHANGE: cursor is now updated even when gaps are found.
        // Gaps found in this pass are handed to repair jobs, so re-detecting them
        // is wasteful. The hourly full scan re-detects anything never filled.
        const safeCreateOrUpdateIntegrityCheck = jest.fn().mockResolvedValueOnce(true);
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 5 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 4, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([{ blockStart: 1, blockEnd: 5 }, { blockStart: 8, blockEnd: 8 }]),
            safeCreateOrUpdateIntegrityCheck
        });

        await integrityCheck(job);

        expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockSync', [
            {
                name: 'batchBlockSync-1-1-5',
                data: {
                    userId: '123',
                    workspace: 'hardhat',
                    workspaceId: 1,
                    from: 1,
                    to: 5,
                    source: 'integrityCheck'
                }
            },
            {
                name: 'batchBlockSync-1-8-8',
                data: {
                    userId: '123',
                    workspace: 'hardhat',
                    workspaceId: 1,
                    from: 8,
                    to: 8,
                    source: 'integrityCheck'
                }
            }
        ]);

        // Cursor is updated even though gaps were found
        expect(safeCreateOrUpdateIntegrityCheck).toHaveBeenCalledWith({ blockId: 2 });
    });

    it('Should update cursor when no gaps are found', async () => {
        const safeCreateOrUpdateIntegrityCheck = jest.fn().mockResolvedValueOnce(true);
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 5 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 4, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([]),
            safeCreateOrUpdateIntegrityCheck
        });

        await integrityCheck(job);

        expect(bulkEnqueue).not.toHaveBeenCalled();
        expect(safeCreateOrUpdateIntegrityCheck).toHaveBeenCalledWith({ blockId: 2 });
    });

    it('Should truncate gap batches to the queue budget for low-tier workspaces', async () => {
        // Mock queueCaps
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(150);

        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 300 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 300 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 300, timestamp: 123 }),
            // Gap 1: 100-150 (51 blocks), Gap 2: 160-170 (11 blocks), Gap 3: 200-300 (101 blocks)
            // Budget: 200 - 150 = 50
            // Should include gap 1 (51 blocks <= 50? no, but include anyway as first gap), then stop
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([
                { blockStart: 100, blockEnd: 150 },
                { blockStart: 160, blockEnd: 170 },
                { blockStart: 200, blockEnd: 300 }
            ]),
            safeCreateOrUpdateIntegrityCheck: jest.fn().mockResolvedValueOnce(true)
        });

        await integrityCheck(job);

        // Only the first gap should be queued (51 > budget of 50, but first gap is always queued)
        const calls = bulkEnqueue.mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toHaveLength(1);
        expect(calls[0][1][0].name).toBe('batchBlockSync-1-100-150');

        // Verify truncation log was emitted
        expect(logger.info).toHaveBeenCalledWith(
            'integrityCheck: gap repair limited by queue budget',
            {
                workspaceId: 1,
                totalGaps: 3,
                queuedGaps: 1,
                budget: 50,
                location: 'jobs.integrityCheck'
            }
        );
    });

    it('Should not call bulkEnqueue when budget is 0, but still update cursor', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(200);

        const safeCreateOrUpdateIntegrityCheck = jest.fn().mockResolvedValueOnce(true);
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 100 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 100 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 100, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([{ blockStart: 50, blockEnd: 75 }]),
            safeCreateOrUpdateIntegrityCheck
        });

        await integrityCheck(job);

        // bulkEnqueue should not be called when budget is 0
        expect(bulkEnqueue).not.toHaveBeenCalled();
        // But cursor should still be updated
        expect(safeCreateOrUpdateIntegrityCheck).toHaveBeenCalledWith({ blockId: 2 });
    });

    it('Should not budget-limit non-low-tier workspaces', async () => {
        queueCaps.getCap.mockReturnValue(200);
        queueCaps.isLowTierWorkspace.mockResolvedValue(false);

        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 1000 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 1000 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 1000, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([
                { blockStart: 10, blockEnd: 110 },
                { blockStart: 200, blockEnd: 300 },
                { blockStart: 500, blockEnd: 1000 }
            ]),
            safeCreateOrUpdateIntegrityCheck: jest.fn().mockResolvedValueOnce(true)
        });

        await integrityCheck(job);

        // All gaps should be queued for non-low-tier workspaces
        const calls = bulkEnqueue.mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toHaveLength(3);
        expect(calls[0][1][0].name).toBe('batchBlockSync-1-10-110');
        expect(calls[0][1][1].name).toBe('batchBlockSync-1-200-300');
        expect(calls[0][1][2].name).toBe('batchBlockSync-1-500-1000');

        // No truncation log should be emitted
        expect(logger.info).not.toHaveBeenCalledWith(
            expect.stringContaining('gap list truncated'),
            expect.any(Object)
        );
    });

    it('Should queue a single gap larger than the whole budget', async () => {
        queueCaps.getCap.mockReturnValue(100);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(0);

        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 500 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 500 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 500, timestamp: 123 }),
            // A gap larger than budget (200 > 100)
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([
                { blockStart: 100, blockEnd: 300 },
                { blockStart: 400, blockEnd: 450 }
            ]),
            safeCreateOrUpdateIntegrityCheck: jest.fn().mockResolvedValueOnce(true)
        });

        await integrityCheck(job);

        // First (large) gap should be queued, then stop
        const calls = bulkEnqueue.mock.calls;
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toHaveLength(1);
        expect(calls[0][1][0].name).toBe('batchBlockSync-1-100-300');

        // Truncation log should be emitted
        expect(logger.info).toHaveBeenCalledWith(
            'integrityCheck: gap repair limited by queue budget',
            {
                workspaceId: 1,
                totalGaps: 2,
                queuedGaps: 1,
                budget: 100,
                location: 'jobs.integrityCheck'
            }
        );
    });

    it('Should emit truncation log with correct values', async () => {
        queueCaps.getCap.mockReturnValue(50);
        queueCaps.isLowTierWorkspace.mockResolvedValue(true);
        queueCaps.countWaitingForWorkspace.mockResolvedValue(30);

        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValueOnce([{ id: 1, number: 1 }])
                .mockResolvedValueOnce([{ id: 2, number: 200 }])
                .mockResolvedValueOnce([{ id: 2 }]),
            integrityCheckStartBlockNumber: 5,
            id: 42,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 200 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 200, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([
                { blockStart: 10, blockEnd: 20 },
                { blockStart: 30, blockEnd: 40 },
                { blockStart: 50, blockEnd: 100 }
            ]),
            safeCreateOrUpdateIntegrityCheck: jest.fn().mockResolvedValueOnce(true)
        });

        await integrityCheck(job);

        // With budget of 20, gaps of 11 and 11 blocks, should queue both then stop
        expect(logger.info).toHaveBeenCalledWith(
            'integrityCheck: gap repair limited by queue budget',
            {
                workspaceId: 42,
                totalGaps: 3,
                queuedGaps: 2,
                budget: 20,
                location: 'jobs.integrityCheck'
            }
        );
    });
});
