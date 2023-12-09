require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

const removeStalledBlock = require('../../jobs/removeStalledBlock');
const { enqueue } = require('../../lib/queue');

beforeEach(() => jest.clearAllMocks());

describe('removeStalledBlock', () => {
    it('Should enqueue for quota increase if block is ready', (done) => {
        const revertIfPartial = jest.fn();
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            workspaceId: 1,
           transactions: [{ isSyncing: false }],
           revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).not.toHaveBeenCalled();
                expect(enqueue).toHaveBeenCalledWith('increaseStripeBillingQuota', 'increaseStripeBillingQuota-1-1', { blockId: 1 });
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should revert of block has pending txs', (done) => {
        const revertIfPartial = jest.fn();
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
            id: 1,
            workspaceId: 1,
            number: 1,
            transactions: [{ isSyncing: true }],
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
});
