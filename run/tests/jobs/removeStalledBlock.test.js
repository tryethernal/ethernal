require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

jest.mock('../../lib/pusher');
const removeStalledBlock = require('../../jobs/removeStalledBlock');
const { STALLED_BLOCK_REMOVAL_DELAY, STALLED_BLOCK_MAX_AGE } = require('../../models/block');
const { enqueue } = require('../../lib/queue');

const ATTRIBUTES = ['id', 'workspaceId', 'number', 'transactionsCount', 'createdAt'];
const originalSelfHosted = process.env.SELF_HOSTED;

beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SELF_HOSTED;
});

afterAll(() => {
    if (originalSelfHosted === undefined)
        delete process.env.SELF_HOSTED;
    else
        process.env.SELF_HOSTED = originalSelfHosted;
});

describe('removeStalledBlock', () => {
    it('Should enqueue for quota increase if block is ready', (done) => {
        const checkPartial = jest.fn().mockResolvedValue('complete'); // Block doesn't need reverting
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            workspaceId: 1,
            checkPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1, workspaceId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs', (done) => {
        const checkPartial = jest.fn().mockResolvedValue('reverted'); // Block was reverted
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            checkPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
                expect(res).toEqual(`Removed stalled block 1 - Workspace 1 - #1`);
                done();
            });
    });

    it('Should return if could not find block', (done) => {
        jest.spyOn(Block, 'findByPk').mockResolvedValue(null);

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(res).toEqual('Could not find block');
                done();
            });
    });

    // Tests for optimized path with workspaceId
    it('Should enqueue for quota increase if block is ready (with workspaceId)', (done) => {
        const checkPartial = jest.fn().mockResolvedValue('complete'); // Block doesn't need reverting
        jest.spyOn(Block, 'findOne').mockResolvedValue({
            workspaceId: 1,
            checkPartial
        });

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ATTRIBUTES });
                expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1, workspaceId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs (with workspaceId)', (done) => {
        const checkPartial = jest.fn().mockResolvedValue('reverted'); // Block was reverted
        jest.spyOn(Block, 'findOne').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            checkPartial
        });

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ATTRIBUTES });
                expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
                expect(res).toEqual(`Removed stalled block 1 - Workspace 1 - #1`);
                done();
            });
    });

    it('Should return if could not find block (with workspaceId)', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValue(null);

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ATTRIBUTES });
                expect(res).toEqual('Could not find block');
                done();
            });
    });

    it('Should not enqueue for quota increase on self-hosted instances', async () => {
        process.env.SELF_HOSTED = 'true';
        const checkPartial = jest.fn().mockResolvedValue('complete');
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            workspaceId: 1,
            checkPartial
        });

        const res = await removeStalledBlock({ data: { blockId: 1 }});

        expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
        expect(enqueue).not.toHaveBeenCalled();
        expect(res).toEqual(true);
    });

    it('Should throw if blockId is missing', async () => {
        await expect(removeStalledBlock({ data: {} })).rejects.toThrow('Missing parameter');
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('Should re-enqueue the check with an incremented attempt if the block is still syncing and young', async () => {
        const checkPartial = jest.fn().mockResolvedValue('deferred');
        jest.spyOn(Block, 'findOne').mockResolvedValue({ id: 1, workspaceId: 2, number: 3, checkPartial });

        const res = await removeStalledBlock({ data: { blockId: 1, workspaceId: 2 }});

        expect(checkPartial).toHaveBeenCalledWith({ syncingGraceMs: STALLED_BLOCK_MAX_AGE });
        expect(enqueue).toHaveBeenCalledTimes(1);
        expect(enqueue).toHaveBeenCalledWith(
            'removeStalledBlock',
            'removeStalledBlock-1-1',
            { blockId: 1, workspaceId: 2, attempt: 1 },
            null,
            null,
            STALLED_BLOCK_REMOVAL_DELAY
        );
        expect(enqueue).not.toHaveBeenCalledWith('increaseStripeBillingQuota', expect.anything(), expect.anything());
        expect(res).toMatch(/Deferred/);
    });

    it('Should keep counting attempts on later deferrals', async () => {
        const checkPartial = jest.fn().mockResolvedValue('deferred');
        jest.spyOn(Block, 'findOne').mockResolvedValue({ id: 1, workspaceId: 2, number: 3, checkPartial });

        await removeStalledBlock({ data: { blockId: 1, workspaceId: 2, attempt: 4 }});

        expect(enqueue).toHaveBeenCalledWith(
            'removeStalledBlock',
            'removeStalledBlock-1-5',
            { blockId: 1, workspaceId: 2, attempt: 5 },
            null,
            null,
            STALLED_BLOCK_REMOVAL_DELAY
        );
    });

    it('Should not re-enqueue nor bill a block that was reverted', async () => {
        const checkPartial = jest.fn().mockResolvedValue('reverted');
        jest.spyOn(Block, 'findOne').mockResolvedValue({ id: 1, workspaceId: 2, number: 3, checkPartial });

        const res = await removeStalledBlock({ data: { blockId: 1, workspaceId: 2, attempt: 3 }});

        expect(enqueue).not.toHaveBeenCalled();
        expect(res).toEqual('Removed stalled block 1 - Workspace 2 - #3');
    });
});
