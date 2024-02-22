require('../mocks/lib/queue');
require('../mocks/lib/env');
const { Workspace } = require('../mocks/models');
const { enqueue } = require('../../lib/queue');
const env = require('../../lib/env');

const deleteWorkspace = require('../../jobs/deleteWorkspace');

beforeEach(() => jest.clearAllMocks());

jest.spyOn(env, 'getMaxBlockForSyncReset').mockReturnValue(2);

describe('cancelDemoExplorers', () => {
    it('Should return if cannot find workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        deleteWorkspace({ data: { workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should return if workspace is not waiting to be deleted', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ pendingDeletion: false });

        deleteWorkspace({ data: { workspaceId: 1 }})
            .then(res => {
                expect(res).toEqual('This workspace has not been marked for deletion');
                done();
            });
    });

    it('Should reenqueue if too many blocks to delete now', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([{}, {}]);
        const getContracts = jest.fn().mockResolvedValueOnce([]);

        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getContracts, getBlocks, pendingDeletion: true });

        deleteWorkspace({ data: { workspaceId: 1 }})
            .then(res => {
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-1', { workspaceId: 1 }, 1, null, 3600000);
                expect(res).toEqual('Too many blocks/contracts for deletion');
                done();
            });
    });

    it('Should reenqueue if too many contracts to delete now', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([]);
        const getContracts = jest.fn().mockResolvedValueOnce([{}]);
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getContracts, getBlocks, pendingDeletion: true });

        deleteWorkspace({ data: { workspaceId: 1 }})
            .then(res => {
                expect(enqueue).toHaveBeenCalledWith('deleteWorkspace', 'deleteWorkspace-1', { workspaceId: 1 }, 1, null, 3600000);
                expect(res).toEqual('Too many blocks/contracts for deletion');
                done();
            });
    });

    it('Should delete workspace now', (done) => {
        const getBlocks = jest.fn().mockResolvedValueOnce([{}]);
        const getContracts = jest.fn().mockResolvedValueOnce([]);
        const safeDelete = jest.fn();
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, safeDelete, getContracts, getBlocks, pendingDeletion: true });

        deleteWorkspace({ data: { workspaceId: 1 }})
            .then(() => {
                expect(safeDelete).toHaveBeenCalled();
                done();
            });
    });
});
