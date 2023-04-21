const { Workspace } = require('../mocks/models');
require('../mocks/lib/queue');

const { enqueue } = require('../../lib/queue');
const integrityCheckStarter = require('../../jobs/integrityCheckStarter');

beforeEach(() => jest.clearAllMocks());

describe('integrityCheckStarter', () => {
    it('Should enqueue integrity check processes if integrityCheck start number is set', async () => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([
            { id: 2, integrityCheckStarterBlockNumber: 5 }
        ]);

        await integrityCheckStarter({});

        expect(enqueue).toHaveBeenNthCalledWith(1, 'integrityCheck', 'integrityCheck-2', {
            workspaceId: 2,
        });
    });
});
