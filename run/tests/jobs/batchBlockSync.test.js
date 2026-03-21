require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/lib/logger');
const { Workspace, Block } = require('../mocks/models');

const { enqueue, bulkEnqueue } = require('../../lib/queue');
const batchBlockSync = require('../../jobs/batchBlockSync');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should return if missing parameters', async () => {
        const result = await batchBlockSync({ data: {} });
        expect(result).toEqual('Missing parameter.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should return if invalid range', async () => {
        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 100, to: 50 }
        });
        expect(result).toEqual('Invalid range.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should return if missing workspaceId', async () => {
        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', from: 1, to: 5 }
        });
        expect(result).toEqual('Missing workspaceId.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should pre-filter existing blocks when workspaceId is provided', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([
            { number: 2 }, { number: 4 }
        ]);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', [
            expect.objectContaining({ data: expect.objectContaining({ blockNumber: 1, workspaceId: 1 }) }),
            expect.objectContaining({ data: expect.objectContaining({ blockNumber: 3, workspaceId: 1 }) }),
            expect.objectContaining({ data: expect.objectContaining({ blockNumber: 5, workspaceId: 1 }) }),
        ]);
    });

    it('Should not enqueue blockSync if all blocks already exist', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([
            { number: 1 }, { number: 2 }, { number: 3 }
        ]);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 3 }
        });

        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should return early if workspace is invalid', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce(null);

        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(result).toEqual('Invalid workspace.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should return early if no explorer', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({ id: 1, explorer: null });

        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(result).toEqual('No active explorer for this workspace');
    });

    it('Should return early if sync is disabled', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: false }
        });

        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(result).toEqual('Sync is disabled');
    });

    it('Should return early if no subscription', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: null }
        });

        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(result).toEqual('No active subscription');
    });

    it('Should return early if RPC is not reachable', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            rpcHealthCheckEnabled: true,
            rpcHealthCheck: { isReachable: false },
            explorer: { shouldSync: true }
        });

        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(result).toEqual('RPC is not reachable');
    });

    it('Should chunk into 5000-block ranges and self-re-enqueue with delay', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 10000 }
        });

        // Should enqueue 5000 blockSync jobs (blocks 1..5000)
        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.any(Array));
        const enqueued = bulkEnqueue.mock.calls[0][1];
        expect(enqueued).toHaveLength(5000);
        expect(enqueued[0].data.blockNumber).toBe(1);
        expect(enqueued[4999].data.blockNumber).toBe(5000);

        // Should self-re-enqueue for remaining range with 3s delay
        expect(enqueue).toHaveBeenCalledWith(
            'batchBlockSync',
            'batchBlockSync-123-My Workspace-5001-10000',
            {
                userId: '123',
                workspace: 'My Workspace',
                workspaceId: 1,
                from: 5001,
                to: 10000,
                source: 'batchSync'
            },
            null, null, 3000
        );
    });

    it('Should not self-re-enqueue when range fits in a single chunk', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 100 }
        });

        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.any(Array));
        expect(enqueue).not.toHaveBeenCalled();
    });

    it('Should skip validation for custom L1 parent workspaces', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            isCustomL1Parent: true,
            explorer: null
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 3 }
        });

        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.any(Array));
    });
});
