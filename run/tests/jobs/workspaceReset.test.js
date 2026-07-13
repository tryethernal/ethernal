jest.mock('sequelize', () => ({
    Op: {
        between: 'between',
        gt: 'gt'
    }
}));
require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/lib/env');

const { bulkEnqueue } = require('../../lib/queue');
const { Workspace } = require('../mocks/models');

const workspaceReset = require('../../jobs/workspaceReset');

beforeEach(() => jest.clearAllMocks());

describe('workspaceReset', () => {
    it('should throw if a parameter is missing', (done) => {
        workspaceReset({ data: { workspaceId: 1, from: new Date(0) }})
            .catch(error => {
                expect(error.message).toEqual('Missing parameter');
                done();
            });
    });

    it('should return an error string on an invalid date range', (done) => {
        workspaceReset({ data: { workspaceId: 1, from: new Date(1000), to: new Date(0) }})
            .then(res => {
                expect(res).toEqual('Invalid date range');
                done();
            });
    });

    it('return an error if cannot find workspace', (done) => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);
        workspaceReset({ data: { workspaceId: 1, from: new Date(0), to: new Date(1000) }})
            .catch(error => {
                expect(error.message).toEqual('Cannot find workspace');
                done();
            });
    });

    it('Should only enqueue deletion for records within the retention window', (done) => {
        // from=0, to=1000. Block id 2 (createdAt 5000) is outside the window
        // and must not be enqueued for deletion. Contract id 1 (createdAt 2000)
        // is likewise excluded.
        const getBlocks = jest.fn()
            .mockResolvedValueOnce([
                { id: 0, createdAt: new Date(100) },
                { id: 1, createdAt: new Date(500) },
                { id: 2, createdAt: new Date(5000) }
            ])
            .mockResolvedValueOnce([]);
        const getContracts = jest.fn()
            .mockResolvedValueOnce([
                { id: 0, createdAt: new Date(200) },
                { id: 1, createdAt: new Date(2000) }
            ])
            .mockResolvedValueOnce([]);
        const safeDestroyIntegrityCheck = jest.fn();
        const safeDestroyAccounts = jest.fn();
        const safeDestroyOrbitData = jest.fn();

        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getBlocks, getContracts, safeDestroyIntegrityCheck, safeDestroyAccounts, safeDestroyOrbitData });

        workspaceReset({ data: { workspaceId: 1, from: new Date(0), to: new Date(1000) }})
            .then(() => {
                expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockDelete', [
                    { name: 'batchBlockDelete-1-0-1-0-1000', data: { workspaceId: 1, ids: [0] }},
                    { name: 'batchBlockDelete-1-1-2-0-1000', data: { workspaceId: 1, ids: [1] }}
                ]);
                expect(bulkEnqueue).toHaveBeenCalledWith('batchContractDelete', [
                    { name: 'batchContractDelete-1-0-1', data: { workspaceId: 1, ids: [0] }}
                ]);
                expect(safeDestroyAccounts).toHaveBeenCalled();
                expect(safeDestroyIntegrityCheck).toHaveBeenCalled();
                done();
            });
    });

    it('Should paginate blocks by id across multiple pages', (done) => {
        // Page size is mocked to 2 (see mocks/lib/env). A full page (length ===
        // pageSize) triggers another fetch; a short page stops the walk.
        const getBlocks = jest.fn()
            .mockResolvedValueOnce([
                { id: 0, createdAt: new Date(100) },
                { id: 1, createdAt: new Date(200) }
            ])
            .mockResolvedValueOnce([
                { id: 2, createdAt: new Date(300) }
            ]);
        const getContracts = jest.fn().mockResolvedValueOnce([]);
        const safeDestroyIntegrityCheck = jest.fn();
        const safeDestroyAccounts = jest.fn();
        const safeDestroyOrbitData = jest.fn();

        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, getBlocks, getContracts, safeDestroyIntegrityCheck, safeDestroyAccounts, safeDestroyOrbitData });

        workspaceReset({ data: { workspaceId: 1, from: new Date(0), to: new Date(1000) }})
            .then(() => {
                // Two full-length probes + the short page.
                expect(getBlocks).toHaveBeenCalledTimes(2);
                // Second call keysets past the last id of the first page (1).
                expect(getBlocks.mock.calls[1][0].where).toEqual({ id: { gt: 1 }});
                expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockDelete', [
                    { name: 'batchBlockDelete-1-0-1-0-1000', data: { workspaceId: 1, ids: [0] }},
                    { name: 'batchBlockDelete-1-1-2-0-1000', data: { workspaceId: 1, ids: [1] }}
                ]);
                // Offset continues across pages so page-2 job names stay unique.
                expect(bulkEnqueue).toHaveBeenCalledWith('batchBlockDelete', [
                    { name: 'batchBlockDelete-1-2-3-0-1000', data: { workspaceId: 1, ids: [2] }}
                ]);
                done();
            });
    });
});
