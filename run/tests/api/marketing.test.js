require('../mocks/lib/firebase');
require('../mocks/middlewares/auth');
require('../mocks/lib/tasks');
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('token')
}));
const db = require('../../lib/firebase');
const { enqueueTask } = require('../../lib/tasks');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);

const BASE_URL = '/api/marketing';

beforeEach(() => jest.clearAllMocks());

describe(`GET ${BASE_URL}/productRoadToken`, () => {
    it('Should enqueue task and return 200', (done) => {
        jest.spyOn(db, 'getUser').mockResolvedValueOnce({ email: 'antoine@tryethernal.com' });
        request.get(`${BASE_URL}/productRoadToken?workspace=ethernal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ token: 'token' });
                done();
            });
    });
});

describe(`GET ${BASE_URL}`, () => {
    it('Should return the marketing flags', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ slug: 'ethernal', isRemote: true });
        request.get(`${BASE_URL}/?workspace=ethernal`)
            .expect(200)
            .then(({ body }) => {
                expect(body).toEqual({ isRemote: true });
                done();
            });
    });
});

describe(`POST ${BASE_URL}/submitExplorerLead`, () => {
    it('Should enqueue task and return 200', (done) => {
        request.post(`${BASE_URL}/submitExplorerLead`)
            .send({ data: { workspace: 'ethernal', email: 'antoine@tryethernal.com' }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenCalledWith('submitExplorerLead',
                    { workspace: 'ethernal', email: 'antoine@tryethernal.com', secret: expect.anything() }
                );
                done();
            });
    });
});

describe(`POST ${BASE_URL}/setRemoteFlag`, () => {
     it('Should process workspace if flag is not set', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ isRemote: null });
        request.post(`${BASE_URL}/setRemoteFlag`)
            .send({ data: { uid: '123', workspace: 'ethernal' }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).toHaveBeenCalledWith('processWorkspace',
                    { uid: '123', workspace: 'ethernal', secret: expect.anything() }
                );
                done();
            });
    });

     it('Should not process workspace if flag is set', (done) => {
        jest.spyOn(db, 'getWorkspaceByName').mockResolvedValueOnce({ isRemote: true });
        request.post(`${BASE_URL}/setRemoteFlag`)
            .send({ data: { uid: '123', workspace: 'ethernal' }})
            .expect(200)
            .then(() => {
                expect(enqueueTask).not.toHaveBeenCalled();
                done();
            });
    });
});