require('../mocks/lib/firebase');
require('../mocks/lib/rpc');
require('../mocks/middlewares/taskAuth');
const { ProviderConnector } = require('../../lib/rpc');
const db = require('../../lib/firebase');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/processWorkspace';

beforeEach(() => jest.clearAllMocks());

describe('POST /', () => {
    it('Should return a 200 status code & set the flag to true if network is reachable', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'remote' });
        request.post(BASE_URL)
            .send({ data: { uid: '123', workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith('123', 'My Workspace', true);
                done();
            });
    });

    it('Should return a 200 status code & set the flag to false if network is unreachable', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ rpcServer: 'remote' });
        ProviderConnector.mockImplementation(() => ({
            fetchNetworkId: jest.fn().mockRejectedValue('Error')
        }));
        request.post(BASE_URL)
            .send({ data: { uid: '123', workspace: 'My Workspace' }})
            .expect(200)
            .then(() => {
                expect(db.setWorkspaceRemoteFlag).toHaveBeenCalledWith('123', 'My Workspace', false);
                done();
            });
    });
});
