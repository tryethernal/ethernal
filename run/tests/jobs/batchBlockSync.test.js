require('../mocks/lib/firebase');
require('../mocks/lib/queue');
require('../mocks/lib/logger');
const { Workspace, Block } = require('../mocks/models');

const { enqueue, bulkEnqueue } = require('../../lib/queue');
const logger = require('../../lib/logger');
const batchBlockSync = require('../../jobs/batchBlockSync');

beforeEach(() => jest.clearAllMocks());

describe('batchBlockSync', () => {
    it('Should throw if missing parameters', async () => {
        await expect(batchBlockSync({ data: {} })).rejects.toThrow('Missing parameter.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should return if invalid range', async () => {
        const result = await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 100, to: 50 }
        });
        expect(result).toEqual('Invalid range.');
        expect(bulkEnqueue).not.toHaveBeenCalled();
    });

    it('Should throw if missing workspaceId', async () => {
        await expect(batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', from: 1, to: 5 }
        })).rejects.toThrow('Missing workspaceId.');
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
        bulkEnqueue.mockResolvedValueOnce({ attempted: 3, accepted: 3, dropped: 0 });

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
        bulkEnqueue.mockResolvedValueOnce({ attempted: 5000, accepted: 5000, dropped: 0 });

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 10000 }
        });

        // Should enqueue 5000 blockSync jobs (blocks 1..5000)
        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.any(Array));
        const enqueued = bulkEnqueue.mock.calls[0][1];
        expect(enqueued).toHaveLength(5000);
        expect(enqueued[0].data.blockNumber).toBe(1);
        expect(enqueued[4999].data.blockNumber).toBe(5000);

        // Should self-re-enqueue for remaining range with the rechunk backpressure delay
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
            null, null, 15000
        );
    });

    it('Should not self-re-enqueue when range fits in a single chunk', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);
        bulkEnqueue.mockResolvedValueOnce({ attempted: 100, accepted: 100, dropped: 0 });

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
        bulkEnqueue.mockResolvedValueOnce({ attempted: 3, accepted: 3, dropped: 0 });

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 3 }
        });

        expect(bulkEnqueue).toHaveBeenCalledWith('blockSync', expect.any(Array));
    });

    it('When nothing is dropped, info log reports accepted equal to jobs and no warn call', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);
        bulkEnqueue.mockResolvedValueOnce({ attempted: 5, accepted: 5, dropped: 0 });

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 5 }
        });

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('enqueued 5/5 blocks')
        );
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('0 dropped by queue cap')
        );
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('When cap drops some jobs, info log reports and warn is called with structured data', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);
        bulkEnqueue.mockResolvedValueOnce({ attempted: 100, accepted: 20, dropped: 80 });

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 100 }
        });

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('enqueued 20/100 blocks')
        );
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('80 dropped by queue cap')
        );
        expect(logger.warn).toHaveBeenCalledWith(
            'batchBlockSync: jobs dropped by queue cap',
            {
                workspaceId: 1,
                attempted: 100,
                accepted: 20,
                dropped: 80,
                from: 1,
                to: 100,
                location: 'jobs.batchBlockSync'
            }
        );
    });

    it('When every job is dropped, warn fires with correct numbers', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);
        bulkEnqueue.mockResolvedValueOnce({ attempted: 50, accepted: 0, dropped: 50 });

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 50 }
        });

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('enqueued 0/50 blocks')
        );
        expect(logger.warn).toHaveBeenCalledWith(
            'batchBlockSync: jobs dropped by queue cap',
            {
                workspaceId: 1,
                attempted: 50,
                accepted: 0,
                dropped: 50,
                from: 1,
                to: 50,
                location: 'jobs.batchBlockSync'
            }
        );
    });

    it('When there are no jobs to enqueue, bulkEnqueue is not called and warn is not called', async () => {
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
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('Defensive fallback: undefined result does not throw and reports jobs.length accepted and 0 dropped', async () => {
        jest.spyOn(Workspace, 'findByPk').mockResolvedValueOnce({
            id: 1,
            explorer: { shouldSync: true, stripeSubscription: { id: 1 } }
        });
        jest.spyOn(Block, 'findAll').mockResolvedValueOnce([]);
        bulkEnqueue.mockResolvedValueOnce(undefined);

        await batchBlockSync({
            data: { userId: '123', workspace: 'My Workspace', workspaceId: 1, from: 1, to: 10 }
        });

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('enqueued 10/10 blocks')
        );
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('0 dropped by queue cap')
        );
        expect(logger.warn).not.toHaveBeenCalled();
    });
});
