jest.mock('moment', () => {
    const original = jest.requireActual('moment');
    original.unix = jest.fn(() => ({ diff: jest.fn(() => 200) }));
    return original;
});
const { Workspace } = require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/queue');

const db = require('../../lib/firebase');
const { enqueue, bulkEnqueue } = require('../../lib/queue');
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
            userId: '123',
            workspace: 'hardhat',
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
                .mockResolvedValueOnce([{ id: 1, number: 1 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: { number: 1 }},
            id: 1,
            public: true,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 1, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([])
        });

        await integrityCheck(job);

        expect(enqueue).toHaveBeenCalledWith('batchBlockSync', 'batchBlockSync-1-1-4', {
            userId: '123',
            workspace: 'hardhat',
            from: 1,
            to: 4,
            source: 'recovery'
        });
    });

    it('Should enqueue gaps', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            explorer: { hasReachedTransactionQuota, shouldSync: true },
            getExpiredBlocks: jest.fn(() => ([])),
            getBlocks: jest.fn()
                .mockResolvedValue([{ id: 1, number: 1 }])
                .mockResolvedValue([{ id: 2, number: 5 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            public: true,
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            getLatestReadyBlock: jest.fn().mockResolvedValueOnce({ number: 4, timestamp: 123 }),
            findBlockGapsV2: jest.fn().mockResolvedValueOnce([{ blockStart: 1, blockEnd: 5 }, { blockStart: 8, blockEnd: 8 }])
        });

        await integrityCheck(job);

        expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockSync', [
            {
                name: 'batchBlockSync-1-1-5', 
                data: {
                    userId: '123',
                    workspace: 'hardhat',
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
                    from: 8,
                    to: 8,
                    source: 'integrityCheck'
                }
            }
        ]);
    });
});
