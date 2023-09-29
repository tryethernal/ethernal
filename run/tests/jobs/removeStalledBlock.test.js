require('../mocks/lib/queue');
const { Block } = require('../mocks/models');

const removeStalledBlock = require('../../jobs/removeStalledBlock');

beforeEach(() => jest.clearAllMocks());

describe('removeStalledBlock', () => {
    it('Should not revert if block has no pending tx', (done) => {
        const revertIfPartial = jest.fn();
        jest.spyOn(Block, 'findByPk').mockResolvedValue({
           transactions: [{ isSyncing: false }],
           revertIfPartial
        });

        removeStalledBlock({ data: { blockId: 1 }})
            .then(res => {
                expect(revertIfPartial).not.toHaveBeenCalled();
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
