jest.mock('sequelize', () => ({
    Op: {
        between: 'between'
    }
}));
require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/lib/env');

const { enqueue, bulkEnqueue } = require('../../lib/queue');
const { Workspace } = require('../mocks/models');

const workspaceReset = require('../../jobs/workspaceReset');

beforeEach(() => jest.clearAllMocks());

describe('workspaceReset', () => {
    it('return an error if cannot find workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        workspaceReset({ data: { workspaceId: 1, from: new Date(0), to: new Date(1000) }})
            .catch(error => {
                expect(error.message).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should enqueue block/contract deletion and delete integrity checks & accounts', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([{ id: 0 }, { id: 1 }]);
        const getContracts = jest.fn().mockResolvedValueOnce([{ id: 0 }, { id: 1 }]);
        const safeDestroyIntegrityCheck = jest.fn();
        const safeDestroyAccounts = jest.fn();

        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getBlocks, getContracts, safeDestroyIntegrityCheck, safeDestroyAccounts });

        workspaceReset({ data: { workspaceId: 1, from: new Date(0), to: new Date(1000) }})
            .then(() => {
                expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockDelete', [
                    { name: 'batchBlockDelete-1-0-1', data: { workspaceId: 1, ids: [0] }},
                    { name: 'batchBlockDelete-1-1-2', data: { workspaceId: 1, ids: [1] }}
                ]);
                expect(enqueue).toHaveBeenCalledWith('batchContractDelete', 'batchContractDelete-1', { workspaceId: 1, ids: [0, 1] });
                expect(safeDestroyAccounts).toHaveBeenCalled();
                expect(safeDestroyIntegrityCheck).toHaveBeenCalled();
                done();
            });
    });
});
