require('../mocks/lib/queue');
const { Workspace } = require('../mocks/models');

const batchBlockDelete = require('../../jobs/batchBlockDelete');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockDelete', () => {
    it('Should return an error if workspace is not found', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        batchBlockDelete({ data: { workspaceId: 1, ids: [1] }})
            .then(res => {
                expect(res).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should call the destroy function', (done) => {
        const safeDestroyBlocks = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ safeDestroyBlocks });
        batchBlockDelete({ data: { workspaceId: 1, ids: [1] }})
            .then(() => {
                expect(safeDestroyBlocks).toHaveBeenCalledWith([1]);
                done();
            });
    });
});
