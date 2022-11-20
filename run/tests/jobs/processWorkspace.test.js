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
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'remote' });

        processWorkspace({ data: { uid: '123', workspace: 'My Workspace' }})
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith('123', 'My Workspace', true);
                done();
            });
    });

    it('Should set the flag to false if network is unreachable', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'remote' });
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue('Error')
        }));

        processWorkspace({ data: { uid: '123', workspace: 'My Workspace' }})
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith('123', 'My Workspace', false);
                done();
            });
    });
});
