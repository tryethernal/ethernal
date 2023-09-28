require('../mocks/lib/queue');
const { Explorer } = require('../mocks/models');

const { bulkEnqueue } = require('../../lib/queue');
const explorerSyncCheck = require('../../jobs/explorerSyncCheck');

beforeEach(() => jest.clearAllMocks());

describe('explorerSyncCheck', () => {
    it('Should send the delete command & return with message if no explorer', (done) => {
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
});
