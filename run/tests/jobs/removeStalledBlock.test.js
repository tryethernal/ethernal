require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

const removeStalledBlock = require('../../jobs/removeStalledBlock');
const { enqueue } = require('../../lib/queue');

beforeEach(() => jest.clearAllMocks());

describe('removeStalledBlock', () => {
    it('Should enqueue for quota increase if block is ready', (done) => {
        const revertIfPartial = jest.fn().mockResolvedValue(false); // Block doesn't need reverting
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            workspaceId: 1,
            revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).toHaveBeenCalled();
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs', (done) => {
        const revertIfPartial = jest.fn().mockResolvedValue(true); // Block was reverted
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).toHaveBeenCalled();
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
        const revertIfPartial = jest.fn().mockResolvedValue(false); // Block doesn't need reverting
        jest.spyOn(Block, 'findOne').mockResolvedValue({
            workspaceId: 1,
            revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ['id', 'workspaceId', 'number', 'transactionsCount'] });
                expect(revertIfPartial).toHaveBeenCalled();
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs (with workspaceId)', (done) => {
        const revertIfPartial = jest.fn().mockResolvedValue(true); // Block was reverted
        jest.spyOn(Block, 'findOne').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ['id', 'workspaceId', 'number', 'transactionsCount'] });
                expect(revertIfPartial).toHaveBeenCalled();
                expect(res).toEqual(`Removed stalled block 1 - Workspace 1 - #1`);
                done();
            });
    });

    it('Should return if could not find block (with workspaceId)', (done) => {
        jest.spyOn(Block, 'findOne').mockResolvedValue(null);

        removeStalledBlock({ data: { blockId: 1, workspaceId: 1 }})
            .then(res => {
                expect(Block.findOne).toHaveBeenCalledWith({ where: { id: 1, workspaceId: 1 }, attributes: ['id', 'workspaceId', 'number', 'transactionsCount'] });
                expect(res).toEqual('Could not find block');
                done();
            });
    });
});
