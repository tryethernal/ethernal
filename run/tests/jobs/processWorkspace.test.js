require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/lib/queue');
const { ProviderConnector } = require('../../lib/rpc');
const db = require('../../lib/firebase');

const processWorkspace = require('../../jobs/processWorkspace');

beforeEach(() => jest.clearAllMocks());

describe('processWorkspace', () => {
    it('Should set the flag to true if network is reachable', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ rpcServer: 'remote', id: 1 });

        processWorkspace({ data: { workspaceId: 1 }})
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith(1, true);
                done();
            });
    });

    it('Should set the flag to false if network is unreachable', (done) => {
        jest.spyOn(db, 'getWorkspaceById').mockResolvedValueOnce({ rpcServer: 'remote', id: 1 });
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue('Error')
        }));

        processWorkspace({ data: { workspaceId: 1 }})
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith(1, false);
                done();
            });
    });
});
