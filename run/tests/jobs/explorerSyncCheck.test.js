require('../mocks/lib/queue');
require('../mocks/lib/logger');
jest.mock('../../queues', () => ({
    updateExplorerSyncingProcess: { clean: jest.fn() }
}));
const { Explorer } = require('../mocks/models');

const { bulkEnqueue } = require('../../lib/queue');
const queues = require('../../queues');
const logger = require('../../lib/logger');
const explorerSyncCheck = require('../../jobs/explorerSyncCheck');

beforeEach(() => {
    jest.clearAllMocks();
    queues['updateExplorerSyncingProcess'].clean.mockReset().mockResolvedValue([]);
});

describe('explorerSyncCheck', () => {
    it('Should enqueue all explorers', (done) => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValue([
            { id: 1, slug: 'explorer-1' },
            { id: 2, slug: 'explorer-2' }
        ]);

        explorerSyncCheck()
            .then(res => {
                expect(bulkEnqueue).toHaveBeenCalledWith('updateExplorerSyncingProcess', [
                    { name: 'updateExplorerSyncingProcess-1', data: { explorerSlug: 'explorer-1' }},
                    { name: 'updateExplorerSyncingProcess-2', data: { explorerSlug: 'explorer-2' }}
                ]);
                expect(res).toEqual(true);
                done();
            });
    });

    it('Should clean finished jobs before enqueuing', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValue([{ id: 1, slug: 'explorer-1' }]);

        await explorerSyncCheck();

        const { clean } = queues['updateExplorerSyncingProcess'];
        expect(clean).toHaveBeenCalledWith(0, 1000, 'completed');
        expect(clean).toHaveBeenCalledWith(0, 1000, 'failed');
        expect(clean).toHaveBeenCalledTimes(2);
        const lastCleanOrder = Math.max(...clean.mock.invocationCallOrder);
        expect(lastCleanOrder).toBeLessThan(bulkEnqueue.mock.invocationCallOrder[0]);
    });

    it('Should still enqueue when cleaning fails', async () => {
        jest.spyOn(Explorer, 'findAll').mockResolvedValue([{ id: 1, slug: 'explorer-1' }]);
        queues['updateExplorerSyncingProcess'].clean.mockRejectedValue(new Error('redis down'));

        const res = await explorerSyncCheck();

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringMatching(/clean/i),
            expect.objectContaining({ error: 'redis down', location: 'jobs.explorerSyncCheck' })
        );
        expect(bulkEnqueue).toHaveBeenCalledWith('updateExplorerSyncingProcess', [
            { name: 'updateExplorerSyncingProcess-1', data: { explorerSlug: 'explorer-1' }}
        ]);
        expect(res).toEqual(true);
    });
});
