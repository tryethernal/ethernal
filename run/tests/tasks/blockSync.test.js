require('../mocks/lib/rpc');
require('../mocks/lib/writeLog');
require('../mocks/lib/tasks');
require('../mocks/lib/firebase');
require('../mocks/lib/transactions');
require('../mocks/middlewares/taskAuth');

const db = require('../../lib/firebase');
const { enqueueTask } = require('../../lib/tasks');
const { ProviderConnector } = require('../../lib/rpc');
const writeLog = require('../../lib/writeLog');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/tasks/blockSync';

afterAll(() => jest.clearAllMocks());

describe('POST /', () => {
    jest.spyOn(db, 'getWorkspaceByName').mockResolvedValue({ rpcServer: 'http://localhost:8545' });
    
    it('Should enqueue each block transaction', (done) => {
        request.post(BASE_URL)
            .send({ data : {
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1

            }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenCalledTimes(3);
                done();
            });
    });

    it('Should fail if block cannot be found', (done) => {
        ProviderConnector.mockImplementationOnce(() => ({
            fetchBlockWithTransactions: jest.fn().mockResolvedValue(null)
        }));

        request.post(BASE_URL)
            .send({ data : {
                userId: '123',
                workspace: 'My Workspace',
                blockNumber: 1
            }})
            .expect(400)
            .then(() => {
                expect(writeLog).toHaveBeenCalled();
                done();
            });
    });
});
