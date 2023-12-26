const { Workspace } = require('../mocks/models');
require('../mocks/lib/queue');

const { enqueue } = require('../../lib/queue');
const rpcHealthCheckStarter = require('../../jobs/rpcHealthCheckStarter');

beforeEach(() => jest.clearAllMocks());

describe('rpcHealthCheckStarter', () => {
    it('Should enqueue integrity check processes if integrityCheck start number is set', (done) => {
        jest.spyOn(Workspace, 'findAll').mockResolvedValueOnce([{ id: 2 }]);

        rpcHealthCheckStarter()
            .then(() => {
                expect(enqueue).toHaveBeenNthCalledWith(1, 'rpcHealthCheck', 'rpcHealthCheck-2', {
                    workspaceId: 2,
                });
                done();
            });
    });
});
