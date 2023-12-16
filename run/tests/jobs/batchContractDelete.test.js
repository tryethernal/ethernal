require('../mocks/lib/queue');
const { Workspace } = require('../mocks/models');

const batchContractDelete = require('../../jobs/batchContractDelete');

beforeEach(() => jest.clearAllMocks());

describe('batchContractDelete', () => {
    it('Should return an error if workspace is not found', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        batchContractDelete({ data: { workspaceId: 1, ids: [1] }})
            .then(res => {
                expect(res).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should call the destroy function', (done) => {
        const safeDestroyContracts = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ safeDestroyContracts });
        batchContractDelete({ data: { workspaceId: 1, ids: [1] }})
            .then(() => {
                expect(safeDestroyContracts).toHaveBeenCalledWith([1]);
                done();
            });
    });
});
