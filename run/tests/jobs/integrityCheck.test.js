jest.mock('moment', () => {
    const original = jest.requireActual('moment');
    original.unix = jest.fn(() => ({ diff: jest.fn(() => 200) }));
    return original;
});
const { Workspace } = require('../mocks/models');
require('../mocks/lib/firebase');
require('../mocks/lib/queue');

const moment = require('moment');
const db = require('../../lib/firebase');
const { enqueue } = require('../../lib/queue');
const integrityCheck = require('../../jobs/integrityCheck');

beforeEach(() => jest.clearAllMocks());

const job = { data: { workspaceId: 1 }};

describe('integrityCheck', () => {
    it('Should return a message saying integrity checks are not enabled', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({ integrityCheckStartBlockNumber: null });

        expect(await integrityCheck(job)).toEqual('Integrity checks not enabled');
    });

    it('Should return a message saying blocks have not been synced', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(0),
            integrityCheckStartBlockNumber: 0
        });

        expect(await integrityCheck(job)).toEqual('No block synced yet');
    });

    it('Should enqueue the first block and exit if no integrity check & the lower block does not exist', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]).mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 5,
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

    it('Should enqueue the first block and exit if integrityCheckStartBlockNumber < lowestBlock.number & no lower block', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]).mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 0,
            integrityCheck: {},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' }
        });

        await integrityCheck(job);

        expect(enqueue).toHaveBeenCalledWith('blockSync', 'blockSync-1-0', {
            userId: '123',
            workspace: 'hardhat',
            blockNumber: 0,
            source: 'integrityCheck'
        }, 1);
    });

    it('Should update latest checked if integrityCheckStartBlockNumber > latest checked', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValue([{ id: 1, number: 5 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: { number: 2 }},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            findBlockGaps: jest.fn().mockResolvedValueOnce([])
        });

        await integrityCheck(job);

        expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { blockId: 1 });
    });

    it('Should return if no lower block', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]).mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: {},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' }
        });

        expect(await integrityCheck(job)).toEqual('Missing lower block or upper block');
    });

    it('Should return if no upper block', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValueOnce([{ id: 1, number: 1 }]).mockResolvedValueOnce([]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: {}},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            findBlockGaps: jest.fn().mockResolvedValueOnce([])
        });

        expect(await integrityCheck(job)).toEqual('Missing lower block or upper block');
    });

    it('Should start recovery', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn().mockResolvedValue([{ id: 1, number: 1 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: { number: 1 }},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            findBlockGaps: jest.fn().mockResolvedValueOnce([])
        });

        await integrityCheck(job);

        expect(enqueue).toHaveBeenCalledWith('batchBlockSync', 'batchBlockSync-1', {
            userId: '123',
            workspace: 'hardhat',
            from: 1,
            to: 4,
            source: 'recovery'
        });
    });

    it('Should update integrity status if no gaps', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn()
                .mockResolvedValue([{ id: 1, number: 1 }])
                .mockResolvedValue([{ id: 2, number: 5 }]),
            integrityCheckStartBlockNumber: 5,
            integrityCheck: { block: { number: 1 }},
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            findBlockGaps: jest.fn().mockResolvedValueOnce([])
        });

        await integrityCheck(job);

        expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { blockId: 2 });
    });

    it('Should update integrity on start & enqueue a batch per gap', async () => {
        jest.spyOn(Workspace, 'findOne').mockResolvedValueOnce({
            countBlocks: jest.fn().mockResolvedValueOnce(1),
            getBlocks: jest.fn()
                .mockResolvedValue([{ id: 1, number: 1 }])
                .mockResolvedValue([{ id: 2, number: 5 }]),
            integrityCheckStartBlockNumber: 5,
            id: 1,
            name: 'hardhat',
            user: { firebaseUserId: '123', name: 'hardhat' },
            getProvider: () => ({ fetchLatestBlock: jest.fn().mockResolvedValueOnce({ timestamp: 123, number: 4 }) }),
            findBlockGaps: jest.fn().mockResolvedValueOnce([{ blockStart: 1, blockEnd: 5 }, { blockStart: 8, blockEnd: 8 }])
        });

        await integrityCheck(job);

        expect(db.updateWorkspaceIntegrityCheck).toHaveBeenCalledWith(1, { blockId: 2 });
        expect(enqueue).toHaveBeenCalledWith('batchBlockSync', 'batchBlockSync-1', {
            userId: '123',
            workspace: 'hardhat',
            from: 1,
            to: 5,
            source: 'integrityCheck'
        });
        expect(enqueue).toHaveBeenCalledWith('batchBlockSync', 'batchBlockSync-1', {
            userId: '123',
            workspace: 'hardhat',
            from: 8,
            to: 8,
            source: 'integrityCheck'
        });
    });
});
